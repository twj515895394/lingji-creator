import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RemixAsrAvailability,
} from './remix-asr-provider-resolver';
import type {
  RemixAsrProviderCapabilities,
  RemixSegmentAsrProvider,
  RemixSegmentAsrResult,
  RemixSenseVoiceTags,
} from './remix-asr-types';
import { hashAudioFile } from './remix-whisper-provider';

const DEFAULT_SEGMENT_TIMEOUT_MS = 60_000;

const LANGUAGE_TAGS = new Set(['zh', 'en', 'ja', 'ko', 'yue']);
const EMOTION_TAGS = new Set(['NEUTRAL', 'HAPPY', 'ANGRY', 'SAD']);
const EVENT_TAGS = new Set(['Speech', 'Sing', 'Laughter', 'Crying']);
const ITN_TAGS = new Set(['woitn', 'itn']);

export interface RemixSenseVoiceAssetPaths {
  binaryPath: string;
  modelPath: string;
  vadModelPath: string | null;
}

export interface RemixSenseVoiceRunInput extends RemixSenseVoiceAssetPaths {
  audioPath: string;
  keepTags: boolean;
  timeoutMs: number;
  useVad: boolean;
}

export interface RemixSenseVoiceRunOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut?: boolean;
}

export interface RemixSenseVoiceParsedSegment {
  text: string;
  tags: RemixSenseVoiceTags;
}

export interface RemixSenseVoiceGgufProviderOptions {
  binaryPath?: string | null;
  modelPath?: string | null;
  vadModelPath?: string | null;
  timeoutMs?: number;
  run?: (input: RemixSenseVoiceRunInput) => Promise<RemixSenseVoiceRunOutput>;
}

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function senseVoiceSearchRoots(): string[] {
  const moduleDir = currentModuleDir();
  const roots = new Set<string>();
  const cwd = process.cwd();

  if (cwd) {
    roots.add(cwd);
  }

  if (path.basename(moduleDir) === 'dist-electron') {
    roots.add(path.resolve(moduleDir, '..'));
  } else {
    roots.add(path.resolve(moduleDir, '../../..'));
  }

  const envRoot = process.env.LINGJI_REPO_ROOT?.trim();
  if (envRoot) {
    roots.add(path.resolve(envRoot));
  }

  return Array.from(roots);
}

function buildAssetCandidates(
  explicitPaths: Array<string | null | undefined>,
  relativePaths: readonly string[],
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (candidate: string | null | undefined) => {
    if (!candidate) {
      return;
    }
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    candidates.push(normalized);
  };

  for (const candidate of explicitPaths) {
    push(candidate);
  }

  for (const root of senseVoiceSearchRoots()) {
    for (const relativePath of relativePaths) {
      push(path.join(root, relativePath));
    }
  }

  return candidates;
}

async function firstExisting(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export async function resolveSenseVoiceAssets(
  options: RemixSenseVoiceGgufProviderOptions = {},
): Promise<RemixSenseVoiceAssetPaths> {
  const binaryPath = await firstExisting(
    buildAssetCandidates(
      [options.binaryPath, process.env.REMIX_FUNASR_SENSEVOICE_BIN],
      [
        'tools/local-stt/funasr/llama-funasr-sensevoice',
        'resources/local-stt/funasr/llama-funasr-sensevoice',
        ...(isDevelopmentMode() ? ['.scratch/funasr-sensevoice-spike/llama-funasr-sensevoice'] : []),
      ],
    ),
  );
  const modelPath = await firstExisting(
    buildAssetCandidates(
      [options.modelPath, process.env.REMIX_FUNASR_SENSEVOICE_MODEL],
      [
        'tools/local-stt/funasr/sensevoice-small-f16.gguf',
        'resources/local-stt/funasr/sensevoice-small-f16.gguf',
      ],
    ),
  );
  const vadModelPath = await firstExisting(
    buildAssetCandidates(
      [options.vadModelPath, process.env.REMIX_FUNASR_VAD_MODEL],
      [
        'tools/local-stt/funasr/fsmn-vad.gguf',
        'resources/local-stt/funasr/fsmn-vad.gguf',
      ],
    ),
  );

  if (!binaryPath || !modelPath) {
    throw new Error(
      '未找到 SenseVoice binary 或模型，请配置 REMIX_FUNASR_SENSEVOICE_BIN / REMIX_FUNASR_SENSEVOICE_MODEL。',
    );
  }

  return { binaryPath, modelPath, vadModelPath };
}

export function normalizeSenseVoiceText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseSenseVoiceTagBlock(tagBlock: string): RemixSenseVoiceTags {
  const tags: RemixSenseVoiceTags = {};
  const tagRegex = /<\|([^>|]+)\|>/g;
  let match: RegExpExecArray | null = null;

  while ((match = tagRegex.exec(tagBlock)) !== null) {
    const tagValue = match[1];
    if (LANGUAGE_TAGS.has(tagValue)) {
      tags.language = tagValue;
    } else if (EMOTION_TAGS.has(tagValue)) {
      tags.emotion = tagValue;
    } else if (EVENT_TAGS.has(tagValue)) {
      tags.event = tagValue;
    } else if (ITN_TAGS.has(tagValue)) {
      tags.itn = tagValue;
    }
  }

  return tags;
}

export function parseSenseVoiceOutput(output: string): RemixSenseVoiceParsedSegment[] {
  const normalizedOutput = output.trim();
  if (!normalizedOutput) {
    return [];
  }

  const segmentRegex = /((?:<\|[^>]+\|>)+)([^<]*)/g;
  const parsed: RemixSenseVoiceParsedSegment[] = [];
  let match: RegExpExecArray | null = null;

  while ((match = segmentRegex.exec(normalizedOutput)) !== null) {
    const text = normalizeSenseVoiceText(match[2] ?? '');
    if (!text) {
      continue;
    }
    parsed.push({
      text,
      tags: parseSenseVoiceTagBlock(match[1] ?? ''),
    });
  }

  if (parsed.length > 0) {
    return parsed;
  }

  return [
    {
      text: normalizeSenseVoiceText(normalizedOutput),
      tags: {},
    },
  ].filter((item) => item.text);
}

async function runSenseVoiceProcess(input: RemixSenseVoiceRunInput): Promise<RemixSenseVoiceRunOutput> {
  const args = ['-m', input.modelPath, '-a', input.audioPath];
  if (input.useVad && input.vadModelPath) {
    args.push('--vad', input.vadModelPath);
  }
  if (input.keepTags) {
    args.push('--keep-tags');
  }

  return await new Promise<RemixSenseVoiceRunOutput>((resolve, reject) => {
    const child = spawn(input.binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, input.timeoutMs);

    const finish = (result: RemixSenseVoiceRunOutput) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', fail);
    child.on('close', (code) => {
      finish({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
      });
    });
  });
}

function pickAggregateTags(segments: RemixSenseVoiceParsedSegment[]): RemixSenseVoiceTags | undefined {
  const first = segments.find((item) => Object.keys(item.tags).length > 0);
  return first ? { ...first.tags } : undefined;
}

export class RemixSenseVoiceGgufProvider implements RemixSegmentAsrProvider {
  readonly capabilities: RemixAsrProviderCapabilities = {
    engine: 'funasr_sensevoice_gguf',
    mode: 'segment_audio_asr',
    timestampLevel: 'segment_range',
    canGenerateAccurateSrt: false,
    canProvideSegmentDialogue: true,
    supportsTags: true,
    supportsEmotion: true,
    supportsEvent: true,
  };

  constructor(private readonly options: RemixSenseVoiceGgufProviderOptions = {}) {}

  async probeAvailability(): Promise<RemixAsrAvailability> {
    try {
      await resolveSenseVoiceAssets(this.options);
      return { available: true };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async transcribeSegmentAudio(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
    audioPath: string;
    sourceStartMs: number;
    sourceEndMs: number;
    outputDir: string;
  }): Promise<RemixSegmentAsrResult> {
    await fs.mkdir(input.outputDir, { recursive: true });
    const assets = await resolveSenseVoiceAssets(this.options);
    const durationMs = Math.max(0, input.sourceEndMs - input.sourceStartMs);
    const timeoutMs = this.options.timeoutMs ?? DEFAULT_SEGMENT_TIMEOUT_MS;
    const startedAt = Date.now();
    const audioSha256 = await hashAudioFile(input.audioPath);
    const runner = this.options.run ?? runSenseVoiceProcess;
    const runResult = await runner({
      ...assets,
      audioPath: input.audioPath,
      keepTags: true,
      timeoutMs,
      useVad: durationMs > 20_000 && Boolean(assets.vadModelPath),
    });
    const elapsedMs = Date.now() - startedAt;

    if (runResult.timedOut) {
      throw new Error(`SenseVoice 转写超时：segment=${input.segmentId} timeoutMs=${timeoutMs}`);
    }

    if (runResult.exitCode !== 0) {
      throw new Error(
        `SenseVoice 进程退出码：${runResult.exitCode ?? 'null'}${runResult.stderr ? ` stderr=${runResult.stderr.trim()}` : ''}`,
      );
    }

    const parsedSegments = parseSenseVoiceOutput(runResult.stdout);
    if (parsedSegments.length === 0) {
      throw new Error(`SenseVoice 未返回有效文本：segment=${input.segmentId}`);
    }

    const warnings: string[] = [];
    if (!parsedSegments.some((item) => Object.keys(item.tags).length > 0)) {
      warnings.push('SenseVoice 输出未包含 keep-tags 标签，已降级为纯文本解析');
    }
    if (runResult.stderr.trim()) {
      warnings.push('SenseVoice 运行产生 stderr 输出');
    }

    return {
      engine: 'funasr_sensevoice_gguf',
      mode: 'segment_audio_asr',
      timestampLevel: 'segment_range',
      text: parsedSegments.map((item) => item.text).join('\n'),
      tags: pickAggregateTags(parsedSegments),
      rawOutput: runResult.stdout,
      stderr: runResult.stderr,
      durationMs: elapsedMs,
      audioSha256,
      warnings,
    };
  }
}
