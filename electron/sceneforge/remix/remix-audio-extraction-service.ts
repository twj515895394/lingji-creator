import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import { resolveFfmpegPath } from '../../runtime-binaries';
import {
  getRemixSegmentAudioJsonPath,
  getRemixSegmentAudioWavPath,
  getRemixSegmentManifestPath,
  getRemixSourceAudioJsonPath,
  getRemixSourceAudioWavPath,
} from './remix-artifact-paths';
import { assertSourceAssetStageReady, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';

const execFileAsync = promisify(execFile);
const SAMPLE_RATE = 16000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export interface RemixSourceAudioMetadata {
  schema: 'sceneforge-remix-source-audio';
  version: 1;
  sourceAssetId: string;
  hasAudio: boolean;
  sampleRate: number;
  channels: number;
  durationMs: number;
  audioPath: string | null;
  skippedReason?: string | null;
  generatedAt: string;
}

export interface RemixSegmentAudioMetadata {
  schema: 'sceneforge-remix-segment-audio';
  version: 1;
  sourceAssetId: string;
  segmentId: string;
  status: 'ready' | 'skipped' | 'failed';
  audioPath: string | null;
  durationMs: number;
  skippedReason?: string | null;
  error?: string | null;
  generatedAt: string;
}

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function processResourcesPath(): string {
  return (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? process.cwd();
}

function resolveFfmpeg(): string {
  return (
    resolveFfmpegPath({
      appPath: process.cwd(),
      resourcesPath: processResourcesPath(),
      cwd: process.cwd(),
      moduleDir: currentModuleDir(),
      env: process.env,
    }) ?? 'ffmpeg'
  );
}

function secondsFromMs(value: number): string {
  return (Math.max(0, value) / 1000).toFixed(3);
}

async function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    const out = args[args.length - 1];
    if (out.endsWith('.wav')) {
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, 'mock-wav', 'utf8');
    }
    return;
  }
  await execFileAsync(ffmpegPath, args, {
    timeout: DEFAULT_TIMEOUT_MS,
    maxBuffer: 1024 * 1024 * 8,
  });
}

async function probeHasAudio(ffmpegPath: string, inputPath: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') {
    return !inputPath.includes('no-audio');
  }
  try {
    const { stderr } = await execFileAsync(
      ffmpegPath,
      ['-hide_banner', '-i', inputPath],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    return /Audio:/i.test(stderr);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? '';
    return /Audio:/i.test(stderr);
  }
}

async function extractSourceAudioWav(
  ffmpegPath: string,
  sourceVideoPath: string,
  outputPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.rm(outputPath, { force: true });
  await runFfmpeg(ffmpegPath, [
    '-y',
    '-i',
    sourceVideoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(SAMPLE_RATE),
    '-c:a',
    'pcm_s16le',
    outputPath,
  ]);
}

async function extractSegmentAudioWav(
  ffmpegPath: string,
  sourceVideoPath: string,
  segment: SourceSegment,
  outputPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.rm(outputPath, { force: true });
  await runFfmpeg(ffmpegPath, [
    '-y',
    '-ss',
    secondsFromMs(segment.timeRange.startMs),
    '-i',
    sourceVideoPath,
    '-t',
    secondsFromMs(segment.timeRange.durationMs),
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(SAMPLE_RATE),
    '-c:a',
    'pcm_s16le',
    outputPath,
  ]);
}

export class RemixAudioExtractionService {
  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    assertSourceAssetStageReady(document, 'remix_segmentation');

    const ffmpegPath = resolveFfmpeg();
    const sourceVideoPath = resolveProjectFile(projectDir, document.sourceAsset.sourceVideoPath);
    const sourceAudioRel = getRemixSourceAudioWavPath(sourceAssetId);
    const sourceAudioMetaRel = getRemixSourceAudioJsonPath(sourceAssetId);
    const sourceAudioAbs = resolveProjectFile(projectDir, sourceAudioRel);
    const generatedAt = new Date().toISOString();

    const hasAudio =
      document.sourceAsset.videoMetadata.hasAudio &&
      (await probeHasAudio(ffmpegPath, sourceVideoPath));

    let sourceMetadata: RemixSourceAudioMetadata;
    if (!hasAudio) {
      sourceMetadata = {
        schema: 'sceneforge-remix-source-audio',
        version: 1,
        sourceAssetId,
        hasAudio: false,
        sampleRate: SAMPLE_RATE,
        channels: 1,
        durationMs: document.sourceAsset.videoMetadata.durationMs,
        audioPath: null,
        skippedReason: '源素材无可用音轨',
        generatedAt,
      };
      document.sourceAsset.videoMetadata.hasAudio = false;
    } else {
      await extractSourceAudioWav(ffmpegPath, sourceVideoPath, sourceAudioAbs);
      sourceMetadata = {
        schema: 'sceneforge-remix-source-audio',
        version: 1,
        sourceAssetId,
        hasAudio: true,
        sampleRate: SAMPLE_RATE,
        channels: 1,
        durationMs: document.sourceAsset.videoMetadata.durationMs,
        audioPath: sourceAudioRel,
        generatedAt,
      };
      document.sourceAsset.videoMetadata.hasAudio = true;
    }

    await fs.writeFile(
      resolveProjectFile(projectDir, sourceAudioMetaRel),
      `${JSON.stringify(sourceMetadata, null, 2)}\n`,
      'utf8',
    );

    document.sourceAsset.sourceAudioPath = sourceMetadata.audioPath;
    document.sourceAsset.sourceAudioJsonPath = sourceAudioMetaRel;

    for (const segment of document.sourceAsset.segments) {
      const segmentAudioRel = getRemixSegmentAudioWavPath(sourceAssetId, segment.id);
      const segmentAudioMetaRel = getRemixSegmentAudioJsonPath(sourceAssetId, segment.id);
      const segmentAudioAbs = resolveProjectFile(projectDir, segmentAudioRel);

      let segmentMeta: RemixSegmentAudioMetadata;
      if (!hasAudio) {
        segmentMeta = {
          schema: 'sceneforge-remix-segment-audio',
          version: 1,
          sourceAssetId,
          segmentId: segment.id,
          status: 'skipped',
          audioPath: null,
          durationMs: segment.timeRange.durationMs,
          skippedReason: '源素材无可用音轨',
          generatedAt,
        };
        segment.segmentAudioPath = null;
        segment.segmentAudioJsonPath = segmentAudioMetaRel;
        segment.audioSkippedReason = segmentMeta.skippedReason ?? null;
      } else {
        try {
          await extractSegmentAudioWav(ffmpegPath, sourceVideoPath, segment, segmentAudioAbs);
          segmentMeta = {
            schema: 'sceneforge-remix-segment-audio',
            version: 1,
            sourceAssetId,
            segmentId: segment.id,
            status: 'ready',
            audioPath: segmentAudioRel,
            durationMs: segment.timeRange.durationMs,
            generatedAt,
          };
          segment.segmentAudioPath = segmentAudioRel;
          segment.segmentAudioJsonPath = segmentAudioMetaRel;
          segment.audioSkippedReason = null;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          segmentMeta = {
            schema: 'sceneforge-remix-segment-audio',
            version: 1,
            sourceAssetId,
            segmentId: segment.id,
            status: 'failed',
            audioPath: null,
            durationMs: segment.timeRange.durationMs,
            error: message,
            generatedAt,
          };
          segment.segmentAudioPath = null;
          segment.segmentAudioJsonPath = segmentAudioMetaRel;
          segment.audioSkippedReason = message;
        }
      }

      await fs.writeFile(
        resolveProjectFile(projectDir, segmentAudioMetaRel),
        `${JSON.stringify(segmentMeta, null, 2)}\n`,
        'utf8',
      );
      await fs.writeFile(
        resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
        `${JSON.stringify(segment, null, 2)}\n`,
        'utf8',
      );
    }

    document.sourceAsset.updatedAt = generatedAt;
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
