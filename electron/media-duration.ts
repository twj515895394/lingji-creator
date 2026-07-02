import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFileCallback);

export interface VideoMetadataProbeResult {
  durationMs: number;
  width: number;
  height: number;
  fps: number | null;
  audioChannels: number | null;
  hasAudio: boolean;
}

export interface ReadMediaDurationOptions {
  binariesDirectory?: string | null;
  ffprobePath?: string | null;
  execFile?: (
    file: string,
    args: string[],
  ) => Promise<{ stdout: string; stderr: string }>;
}

function getFfprobeExecutablePath(
  binariesDirectory: string | null,
  platform: NodeJS.Platform = process.platform,
): string {
  const executableName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  return binariesDirectory ? path.join(binariesDirectory, executableName) : executableName;
}

function resolveFfprobeExecutablePath(options: ReadMediaDurationOptions): string {
  if (options.ffprobePath) return options.ffprobePath;
  return getFfprobeExecutablePath(options.binariesDirectory ?? null);
}

function parseDurationMs(stdout: string): number {
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Unable to read media duration from ffprobe output: ${stdout.trim()}`);
  }

  return Math.max(500, Math.round(seconds * 1000));
}

function parseFfprobeDuration(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Unable to read media duration from ffprobe output: missing format.duration');
  }

  return parseDurationMs(String(value));
}

function parseFrameRate(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const [numeratorRaw, denominatorRaw] = value.split('/');
  const numerator = Number.parseFloat(numeratorRaw ?? '');
  const denominator = Number.parseFloat(denominatorRaw ?? '');
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  const fps = numerator / denominator;
  return Number.isFinite(fps) && fps > 0 ? Number.parseFloat(fps.toFixed(3)) : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseVideoMetadataJson(stdout: string): VideoMetadataProbeResult {
  const parsed = JSON.parse(stdout) as {
    format?: Record<string, unknown>;
    streams?: Array<Record<string, unknown>>;
  };
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  if (!isObject(videoStream)) {
    throw new Error('Unable to read video metadata from ffprobe output: missing video stream');
  }

  const width = Number(videoStream.width);
  const height = Number(videoStream.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('Unable to read video metadata from ffprobe output: invalid width/height');
  }

  const audioStream = streams.find((stream) => stream.codec_type === 'audio');
  const audioChannels = isObject(audioStream)
    ? Number.isFinite(Number(audioStream.channels))
      ? Number(audioStream.channels)
      : null
    : null;

  return {
    durationMs: parseFfprobeDuration(parsed.format?.duration),
    width,
    height,
    fps: parseFrameRate(videoStream.avg_frame_rate) ?? parseFrameRate(videoStream.r_frame_rate),
    audioChannels,
    hasAudio: Boolean(audioStream),
  };
}

export async function readAudioDurationMs(
  filePath: string,
  options: ReadMediaDurationOptions,
): Promise<number> {
  const execFile = options.execFile ?? execFileAsync;
  const { stdout } = await execFile(resolveFfprobeExecutablePath(options), [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);

  return parseDurationMs(stdout);
}

export async function readVideoDurationMs(
  filePath: string,
  options: Pick<ReadMediaDurationOptions, 'binariesDirectory' | 'ffprobePath' | 'execFile'> = {},
): Promise<number> {
  const execFile = options.execFile ?? execFileAsync;
  const { stdout } = await execFile(resolveFfprobeExecutablePath(options), [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);

  return parseDurationMs(stdout);
}

export async function readVideoMetadata(
  filePath: string,
  options: Pick<ReadMediaDurationOptions, 'binariesDirectory' | 'ffprobePath' | 'execFile'> = {},
): Promise<VideoMetadataProbeResult> {
  const execFile = options.execFile ?? execFileAsync;
  const { stdout } = await execFile(resolveFfprobeExecutablePath(options), [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_entries',
    'format=duration:stream=codec_type,width,height,avg_frame_rate,r_frame_rate,channels',
    filePath,
  ]);

  return parseVideoMetadataJson(stdout);
}

export function isAudioExtension(extension: string, audioExtensions: string[]): boolean {
  return audioExtensions.includes(extension.toLowerCase().replace(/^\./, ''));
}

export function isVideoExtension(extension: string, videoExtensions: string[]): boolean {
  return videoExtensions.includes(extension.toLowerCase().replace(/^\./, ''));
}
