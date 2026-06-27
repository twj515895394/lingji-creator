import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveWhisperAssets } from '../electron/sceneforge/remix/remix-whisper-provider';

import { buildSrtFromUtterances, utterancesFromSrt } from '../electron/sceneforge/remix/remix-whisper-provider';
import { parseSrt } from '../src/lib/srt-parser';

const sampleSrt = `1
00:00:00,420 --> 00:00:02,900
这里是第一句

2
00:00:03,100 --> 00:00:06,800
第二句对白
`;

describe('SceneForge Remix whisper provider parsing', () => {
  it('parses sample srt into utterances and round-trips through serializeSrt', () => {
    const utterances = utterancesFromSrt(sampleSrt);
    expect(utterances).toHaveLength(2);
    expect(utterances[0].startMs).toBe(420);
    expect(utterances[1].text).toBe('第二句对白');

    const rebuilt = buildSrtFromUtterances(utterances);
    const parsedAgain = parseSrt(rebuilt);
    expect(parsedAgain).toHaveLength(2);
    expect(parsedAgain[0].startMs).toBe(420);
    expect(parsedAgain[1].endMs).toBe(6800);
  });
});


describe('resolveWhisperAssets', () => {
  const originalCwd = process.cwd();
  const originalRepoRoot = process.env.LINGJI_REPO_ROOT;

  beforeEach(() => {
    delete process.env.LINGJI_REPO_ROOT;
    delete process.env.REMIX_WHISPER_BIN;
    delete process.env.REMIX_WHISPER_MODEL;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalRepoRoot === undefined) {
      delete process.env.LINGJI_REPO_ROOT;
    } else {
      process.env.LINGJI_REPO_ROOT = originalRepoRoot;
    }
  });

  it('resolves whisper assets from repo root when main process runs from dist-electron', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'lingji-remix-repo-'));
    const distElectron = path.join(repoRoot, 'dist-electron');
    const whisperDir = path.join(repoRoot, 'tools/local-stt/whisper');
    await mkdir(whisperDir, { recursive: true });
    await writeFile(path.join(whisperDir, 'main'), 'bin', 'utf8');
    await writeFile(path.join(whisperDir, 'ggml-small.bin'), 'model', 'utf8');

    vi.resetModules();
    vi.doMock('node:url', async () => {
      const actual = await vi.importActual<typeof import('node:url')>('node:url');
      return {
        ...actual,
        fileURLToPath: () => path.join(distElectron, 'main.js'),
      };
    });

    process.chdir(repoRoot);
    const { resolveWhisperAssets: resolveFromDist } = await import('../electron/sceneforge/remix/remix-whisper-provider');
    const assets = await resolveFromDist();

    expect(await realpath(assets.whisperBin)).toBe(await realpath(path.join(repoRoot, 'tools/local-stt/whisper/main')));
    expect(await realpath(assets.modelPath)).toBe(await realpath(path.join(repoRoot, 'tools/local-stt/whisper/ggml-small.bin')));
    vi.doUnmock('node:url');
    vi.resetModules();
  });
});
