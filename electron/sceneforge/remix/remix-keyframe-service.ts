import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { RemixKeyframeRole, SourceKeyframe, SourceSegment } from '../../../src/sceneforge/remix/types';
import { resolveFfmpegPath } from '../../runtime-binaries';
import {
  getRemixKeyframeReportPath,
  getRemixSegmentKeyframePath,
  getRemixSegmentManifestPath,
} from './remix-artifact-paths';
import { writeRemixDebugJson, withDebugReportMeta } from './remix-debug-artifacts';
import { appendRemixProgressEvent } from './remix-progress-events';
import { assertSourceAssetStageReady, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';

const execFileAsync = promisify(execFile);
const KEYFRAME_ROLES: RemixKeyframeRole[] = ['first', 'middle', 'last'];
const DEFAULT_TIMEOUT_MS = 90 * 1000;

interface KeyframeExtractionReportItem {
  segmentId: string;
  frameRole: RemixKeyframeRole;
  timestampMs: number;
  inputSource: 'clip' | 'source';
  inputPath: string;
  seekMs: number;
  outputPath: string;
  status: 'ready' | 'failed';
  error?: string | null;
}

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function processResourcesPath(): string {
  return (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? process.cwd();
}

function secondsFromMs(value: number): string {
  return (Math.max(0, value) / 1000).toFixed(3);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function appendKeyframeProgress(input: {
  projectDir: string;
  sourceAssetId: string;
  status: 'started' | 'running' | 'succeeded' | 'failed';
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
}) {
  try {
    await appendRemixProgressEvent({
      projectDir: input.projectDir,
      sourceAssetId: input.sourceAssetId,
      event: {
        stage: 'keyframes',
        status: input.status,
        message: input.message,
        progress: input.progress,
        details: input.details,
      },
    });
  } catch (error) {
    console.warn(
      `[SceneForge Remix] append keyframe progress failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function timestampForRole(startMs: number, endMs: number, role: RemixKeyframeRole): number {
  const durationMs = Math.max(1, endMs - startMs);
  const safeStartMs = startMs + Math.min(80, Math.max(0, durationMs / 10));
  const safeEndMs = Math.max(startMs, endMs - Math.min(120, Math.max(0, durationMs / 10)));
  if (role === 'first') return Math.round(safeStartMs);
  if (role === 'last') return Math.round(Math.max(safeStartMs, safeEndMs));
  return Math.round(startMs + durationMs / 2);
}

function buildKeyframesForSegment(
  sourceAssetId: string,
  segmentId: string,
  startMs: number,
  endMs: number,
): SourceKeyframe[] {
  return KEYFRAME_ROLES.map((frameRole) => ({
    id: `${sourceAssetId}-${segmentId}-${frameRole}`,
    sourceAssetId,
    segmentId,
    frameRole,
    timestampMs: timestampForRole(startMs, endMs, frameRole),
    imagePath: getRemixSegmentKeyframePath(sourceAssetId, segmentId, frameRole),
  }));
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

function relativeClipTimestampMs(segment: SourceSegment, absoluteTimestampMs: number): number {
  return Math.max(0, absoluteTimestampMs - segment.timeRange.startMs);
}

async function resolveFrameInput(
  projectDir: string,
  sourceVideoPath: string,
  segment: SourceSegment,
  absoluteTimestampMs: number,
): Promise<{ inputPath: string; seekMs: number; source: 'clip' | 'source' }> {
  const clipPath = resolveProjectFile(projectDir, segment.sourceClipPath);
  if (await fileExists(clipPath)) {
    return {
      inputPath: clipPath,
      seekMs: relativeClipTimestampMs(segment, absoluteTimestampMs),
      source: 'clip',
    };
  }
  return { inputPath: sourceVideoPath, seekMs: absoluteTimestampMs, source: 'source' };
}

async function extractFrame(input: {
  ffmpegPath: string;
  inputPath: string;
  seekMs: number;
  outputPath: string;
}) {
  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  await fs.rm(input.outputPath, { force: true });
  await execFileAsync(
    input.ffmpegPath,
    [
      '-y',
      '-ss',
      secondsFromMs(input.seekMs),
      '-i',
      input.inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      '-f',
      'image2',
      input.outputPath,
    ],
    {
      timeout: DEFAULT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 4,
    },
  );
  const stat = await fs.stat(input.outputPath);
  if (stat.size <= 0) {
    throw new Error(`关键帧抽取失败，输出为空：${input.outputPath}`);
  }
}

async function writeKeyframeReport(input: {
  projectDir: string;
  sourceAssetId: string;
  sourceVideoPath: string;
  ffmpegPath: string;
  segmentCount: number;
  items: KeyframeExtractionReportItem[];
  status: 'ready' | 'failed';
}) {
  await writeRemixDebugJson({
    projectDir: input.projectDir,
    relativePath: getRemixKeyframeReportPath(input.sourceAssetId),
    payload: withDebugReportMeta({
      sourceAssetId: input.sourceAssetId,
      sourceVideoPath: input.sourceVideoPath,
      ffmpegPath: input.ffmpegPath,
      status: input.status,
      segmentCount: input.segmentCount,
      keyframeCount: input.items.length,
      items: input.items,
    }),
  });
}

export class RemixKeyframeService {
  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    assertSourceAssetStageReady(document, 'remix_segmentation');
    const ffmpegPath = resolveFfmpeg();
    const reportItems: KeyframeExtractionReportItem[] = [];
    const totalKeyframes = document.sourceAsset.segments.length * KEYFRAME_ROLES.length;
    let processedKeyframes = 0;
    await appendKeyframeProgress({
      projectDir,
      sourceAssetId,
      status: 'started',
      message: `开始抽取 ${totalKeyframes} 张关键帧。`,
      progress: 0,
      details: { ffmpegPath, segmentCount: document.sourceAsset.segments.length },
    });

    for (const segment of document.sourceAsset.segments) {
      segment.keyframes = buildKeyframesForSegment(
        sourceAssetId,
        segment.id,
        segment.timeRange.startMs,
        segment.timeRange.endMs,
      );

      for (const keyframe of segment.keyframes) {
        const outputPath = resolveProjectFile(projectDir, keyframe.imagePath);
        const frameInput = await resolveFrameInput(
          projectDir,
          document.sourceAsset.sourceVideoPath,
          segment,
          keyframe.timestampMs,
        );
        await appendKeyframeProgress({
          projectDir,
          sourceAssetId,
          status: 'running',
          message: `正在抽取 ${segment.id}/${keyframe.frameRole} 关键帧。`,
          progress: totalKeyframes > 0 ? processedKeyframes / totalKeyframes : 1,
          details: { segmentId: segment.id, frameRole: keyframe.frameRole, inputSource: frameInput.source },
        });
        try {
          await extractFrame({
            ffmpegPath,
            inputPath: frameInput.inputPath,
            seekMs: frameInput.seekMs,
            outputPath,
          });
          reportItems.push({
            segmentId: segment.id,
            frameRole: keyframe.frameRole,
            timestampMs: keyframe.timestampMs,
            inputSource: frameInput.source,
            inputPath: frameInput.inputPath,
            seekMs: frameInput.seekMs,
            outputPath,
            status: 'ready',
          });
          processedKeyframes += 1;
          await appendKeyframeProgress({
            projectDir,
            sourceAssetId,
            status: 'succeeded',
            message: `${segment.id}/${keyframe.frameRole} 关键帧已抽取。`,
            progress: totalKeyframes > 0 ? processedKeyframes / totalKeyframes : 1,
            details: { segmentId: segment.id, frameRole: keyframe.frameRole, outputPath },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          reportItems.push({
            segmentId: segment.id,
            frameRole: keyframe.frameRole,
            timestampMs: keyframe.timestampMs,
            inputSource: frameInput.source,
            inputPath: frameInput.inputPath,
            seekMs: frameInput.seekMs,
            outputPath,
            status: 'failed',
            error: errorMessage,
          });
          await appendKeyframeProgress({
            projectDir,
            sourceAssetId,
            status: 'failed',
            message: `${segment.id}/${keyframe.frameRole} 关键帧抽取失败。`,
            progress: totalKeyframes > 0 ? processedKeyframes / totalKeyframes : 1,
            details: { segmentId: segment.id, frameRole: keyframe.frameRole, error: errorMessage },
          });
          await writeKeyframeReport({
            projectDir,
            sourceAssetId,
            sourceVideoPath: document.sourceAsset.sourceVideoPath,
            ffmpegPath,
            segmentCount: document.sourceAsset.segments.length,
            items: reportItems,
            status: 'failed',
          });
          throw new Error(
            `关键帧抽取失败：${segment.id}/${keyframe.frameRole} (${frameInput.source}) - ${errorMessage}`,
          );
        }
      }

      await fs.writeFile(
        resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
        `${JSON.stringify(segment, null, 2)}\n`,
        'utf8',
      );
    }

    await writeKeyframeReport({
      projectDir,
      sourceAssetId,
      sourceVideoPath: document.sourceAsset.sourceVideoPath,
      ffmpegPath,
      segmentCount: document.sourceAsset.segments.length,
      items: reportItems,
      status: 'ready',
    });

    await appendKeyframeProgress({
      projectDir,
      sourceAssetId,
      status: 'succeeded',
      message: `已完成 ${processedKeyframes}/${totalKeyframes} 张关键帧抽取。`,
      progress: 1,
      details: { keyframeCount: processedKeyframes },
    });
    document.sourceAsset.updatedAt = new Date().toISOString();
    document.processingStageStates.remix_keyframes = 'approved';
    document.processingStageStates.remix_understanding = 'ready_for_review';
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
