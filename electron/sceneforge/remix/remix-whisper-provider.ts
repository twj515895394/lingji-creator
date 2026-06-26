import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSrt, serializeSrtEntries } from '../../../src/lib/srt-parser';
import type { RemixTranscriptUtterance } from './remix-transcript-types';

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

function repoRoot(): string {
  return path.resolve(currentModuleDir(), '../../..');
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
    [options.whisperBin, process.env.REMIX_WHISPER_BIN, path.join(repoRoot(), 'tools/local-stt/whisper/main')]
      .filter(Boolean) as string[],
  );
  const modelPath = await firstExisting(
    [options.modelPath, process.env.REMIX_WHISPER_MODEL, path.join(repoRoot(), 'tools/local-stt/whisper/ggml-small.bin')]
      .filter(Boolean) as string[],
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
