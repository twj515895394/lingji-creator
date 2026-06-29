import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSrt, serializeSrtEntries } from '../../../src/lib/srt-parser';
import type { RemixTranscriptUtterance } from './remix-transcript-types';
import type { RemixAsrAvailability } from './remix-asr-provider-resolver';

export interface RemixWhisperProviderOptions {
  whisperBin?: string | null;
  modelPath?: string | null;
  transcribe?: (input: {
    whisperBin: string;
    modelPath: string;
    audioPath: string;
    outputPrefix: string;
  }) => Promise<{ srtPath: string; jsonPath?: string | null }>;
}

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

const WHISPER_RELATIVE_PATHS = {
  whisperBin: [
    'tools/local-stt/whisper/main',
    'resources/local-stt/whisper/main',
  ],
  modelPath: [
    'tools/local-stt/whisper/ggml-small.bin',
    'resources/local-stt/whisper/ggml-small.bin',
  ],
} as const;

function whisperSearchRoots(): string[] {
  const moduleDir = currentModuleDir();
  const roots = new Set<string>();
  const cwd = process.cwd();
  if (cwd) {
    roots.add(cwd);
  }

  // electron-vite 打包后主进程代码落在 dist-electron/，仓库根应为其上一级。
  if (path.basename(moduleDir) === 'dist-electron') {
    roots.add(path.resolve(moduleDir, '..'));
  } else {
    // 源码路径 electron/sceneforge/remix → 仓库根为三级父目录。
    roots.add(path.resolve(moduleDir, '../../..'));
  }

  const envRoot = process.env.LINGJI_REPO_ROOT?.trim();
  if (envRoot) {
    roots.add(path.resolve(envRoot));
  }

  return Array.from(roots);
}

function buildWhisperAssetCandidates(
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

  for (const root of whisperSearchRoots()) {
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

export async function resolveWhisperAssets(
  options: RemixWhisperProviderOptions = {},
): Promise<{ whisperBin: string; modelPath: string }> {
  const whisperBin = await firstExisting(
    buildWhisperAssetCandidates(
      [options.whisperBin, process.env.REMIX_WHISPER_BIN],
      WHISPER_RELATIVE_PATHS.whisperBin,
    ),
  );
  const modelPath = await firstExisting(
    buildWhisperAssetCandidates(
      [options.modelPath, process.env.REMIX_WHISPER_MODEL],
      WHISPER_RELATIVE_PATHS.modelPath,
    ),
  );

  if (!whisperBin || !modelPath) {
    throw new Error('未找到本地 Whisper 可执行文件或 ggml-small 模型，请配置 REMIX_WHISPER_BIN / REMIX_WHISPER_MODEL。');
  }

  return { whisperBin, modelPath };
}

export function utterancesFromSrt(srtText: string): RemixTranscriptUtterance[] {
  return parseSrt(srtText).map((entry, index) => ({
    id: `utt_${String(index + 1).padStart(3, '0')}`,
    text: entry.text,
    startMs: entry.startMs,
    endMs: entry.endMs,
    confidence: null,
    speaker: null,
  }));
}

export function buildSrtFromUtterances(utterances: RemixTranscriptUtterance[]): string {
  return serializeSrtEntries(
    utterances.map((utterance, index) => ({
      index: index + 1,
      startMs: utterance.startMs,
      endMs: utterance.endMs,
      text: utterance.text,
    })),
  );
}

export async function hashAudioFile(audioPath: string): Promise<string> {
  const bytes = await fs.readFile(audioPath);
  return createHash('sha256').update(bytes).digest('hex');
}

export class RemixLocalWhisperProvider {
  constructor(private readonly options: RemixWhisperProviderOptions = {}) {}

  async probeAvailability(): Promise<RemixAsrAvailability> {
    try {
      await resolveWhisperAssets(this.options);
      return { available: true };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async transcribeAudio(audioPath: string, outputDir: string): Promise<{
    utterances: RemixTranscriptUtterance[];
    srtText: string;
    audioSha256: string;
  }> {
    await fs.mkdir(outputDir, { recursive: true });
    const outputPrefix = path.join(outputDir, 'whisper_out');
    const audioSha256 = await hashAudioFile(audioPath);

    if (this.options.transcribe) {
      const result = await this.options.transcribe({
        whisperBin: this.options.whisperBin ?? 'mock-whisper',
        modelPath: this.options.modelPath ?? 'mock-model',
        audioPath,
        outputPrefix,
      });
      const srtText = await fs.readFile(result.srtPath, 'utf8');
      const utterances = utterancesFromSrt(srtText);
      return { utterances, srtText, audioSha256 };
    }

    const { whisperBin, modelPath } = await resolveWhisperAssets(this.options);
    const { spawn } = await import('node:child_process');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        whisperBin,
        ['-m', modelPath, '-f', audioPath, '-l', 'zh', '-osrt', '-of', outputPrefix],
        { stdio: 'inherit' },
      );
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Whisper 进程退出码：${code}`));
        }
      });
    });

    const srtPath = `${outputPrefix}.srt`;
    const srtText = await fs.readFile(srtPath, 'utf8');
    const utterances = utterancesFromSrt(srtText);
    return { utterances, srtText, audioSha256 };
  }
}
