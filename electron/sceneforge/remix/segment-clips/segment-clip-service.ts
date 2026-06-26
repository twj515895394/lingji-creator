import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { SourceSegment } from '../../../../src/sceneforge/remix/types';
import { resolveFfmpegPath } from '../../../runtime-binaries';
import { resolveProjectFile } from '../remix-validators';

const execFileAsync = promisify(execFile);

export type SegmentClipMode = 'stream_copy' | 'reencode_accurate';

export interface GenerateSegmentClipsInput {
  projectDir: string;
  sourceVideoPath: string;
  sourceAssetId: string;
  segments: SourceSegment[];
  mode?: SegmentClipMode;
  overwrite?: boolean;
}

export interface SegmentClipGenerationResult {
  segmentId: string;
  clipPath: string;
  status: 'ready' | 'failed';
  startMs: number;
  endMs: number;
  durationMs: number;
  fileSizeBytes?: number | null;
  error?: string | null;
}

export interface SegmentClipGenerationSummary {
  mode: SegmentClipMode;
  totalCount: number;
  successCount: number;
  failedCount: number;
  elapsedMs: number;
  results: SegmentClipGenerationResult[];
}

export interface SegmentClipServiceOptions {
  appPath?: string;
  resourcesPath?: string;
  cwd?: string;
  moduleDir?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function processResourcesPath(): string {
  return (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? process.cwd();
}

function secondsFromMs(value: number): string {
  return (Math.max(0, value) / 1000).toFixed(3);
}

function buildClipArgs(
  sourceVideoPath: string,
  outputPath: string,
  segment: SourceSegment,
  mode: SegmentClipMode,
): string[] {
  const startSeconds = secondsFromMs(segment.timeRange.startMs);
  const durationSeconds = secondsFromMs(segment.timeRange.durationMs);
  if (mode === 'stream_copy') {
    return [
      '-y',
      '-ss',
      startSeconds,
      '-i',
      sourceVideoPath,
      '-t',
      durationSeconds,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c',
      'copy',
      '-avoid_negative_ts',
      'make_zero',
      outputPath,
    ];
  }

  return [
    '-y',
    '-ss',
    startSeconds,
    '-i',
    sourceVideoPath,
    '-t',
    durationSeconds,
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '18',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ];
}

export class SegmentClipService {
  private readonly options;

  constructor(options: SegmentClipServiceOptions = {}) {
    this.options = options;
  }

  private resolveFfmpeg(): string {
    const runtimeOptions = {
      appPath: this.options.appPath ?? process.cwd(),
      resourcesPath: this.options.resourcesPath ?? processResourcesPath(),
      cwd: this.options.cwd ?? process.cwd(),
      moduleDir: this.options.moduleDir ?? currentModuleDir(),
      env: this.options.env ?? process.env,
    };
    return resolveFfmpegPath(runtimeOptions) ?? 'ffmpeg';
  }

  private async generateOne(
    ffmpegPath: string,
    input: GenerateSegmentClipsInput,
    segment: SourceSegment,
    mode: SegmentClipMode,
  ): Promise<SegmentClipGenerationResult> {
    const clipPath = resolveProjectFile(input.projectDir, segment.sourceClipPath);
    await fs.mkdir(path.dirname(clipPath), { recursive: true });
    if (input.overwrite !== false) {
      await fs.rm(clipPath, { force: true });
    }

    const args = buildClipArgs(input.sourceVideoPath, clipPath, segment, mode);
    try {
      await execFileAsync(ffmpegPath, args, {
        timeout: this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 8,
      });
      const stat = await fs.stat(clipPath);
      return {
        segmentId: segment.id,
        clipPath,
        status: 'ready',
        startMs: segment.timeRange.startMs,
        endMs: segment.timeRange.endMs,
        durationMs: segment.timeRange.durationMs,
        fileSizeBytes: stat.size,
      };
    } catch (error) {
      return {
        segmentId: segment.id,
        clipPath,
        status: 'failed',
        startMs: segment.timeRange.startMs,
        endMs: segment.timeRange.endMs,
        durationMs: segment.timeRange.durationMs,
        fileSizeBytes: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async generateClips(input: GenerateSegmentClipsInput): Promise<SegmentClipGenerationSummary> {
    const startedAt = Date.now();
    const mode = input.mode ?? 'reencode_accurate';
    const ffmpegPath = this.resolveFfmpeg();
    const results: SegmentClipGenerationResult[] = [];

    for (const segment of input.segments) {
      results.push(await this.generateOne(ffmpegPath, input, segment, mode));
    }

    const failed = results.filter((result) => result.status === 'failed');
    if (failed.length > 0) {
      const preview = failed
        .slice(0, 3)
        .map((item) => `${item.segmentId}: ${item.error ?? 'unknown error'}`)
        .join('\n');
      throw new Error(`分镜视频片段生成失败 ${failed.length}/${results.length}：\n${preview}`);
    }

    return {
      mode,
      totalCount: results.length,
      successCount: results.length,
      failedCount: 0,
      elapsedMs: Date.now() - startedAt,
      results,
    };
  }
}
