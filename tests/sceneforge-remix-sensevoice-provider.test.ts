import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseSenseVoiceOutput,
  RemixSenseVoiceGgufProvider,
  resolveSenseVoiceAssets,
} from '../electron/sceneforge/remix/remix-sensevoice-gguf-provider';

describe('SceneForge Remix SenseVoice provider parsing', () => {
  it('parses keep-tags output into structured segments', () => {
    const output = [
      '<|zh|><|NEUTRAL|><|Speech|><|woitn|>第一句台词',
      '<|zh|><|HAPPY|><|Speech|><|itn|>第二句台词',
    ].join('\n');

    const parsed = parseSenseVoiceOutput(output);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe('第一句台词');
    expect(parsed[0].tags).toEqual({
      language: 'zh',
      emotion: 'NEUTRAL',
      event: 'Speech',
      itn: 'woitn',
    });
    expect(parsed[1].tags.emotion).toBe('HAPPY');
  });

  it('falls back to plain text when stdout has no tags', () => {
    const parsed = parseSenseVoiceOutput('  这是一段没有标签的输出  ');
    expect(parsed).toEqual([{ text: '这是一段没有标签的输出', tags: {} }]);
  });
});

describe('resolveSenseVoiceAssets', () => {
  const originalCwd = process.cwd();
  const originalRepoRoot = process.env.LINGJI_REPO_ROOT;

  beforeEach(() => {
    delete process.env.LINGJI_REPO_ROOT;
    delete process.env.REMIX_FUNASR_SENSEVOICE_BIN;
    delete process.env.REMIX_FUNASR_SENSEVOICE_MODEL;
    delete process.env.REMIX_FUNASR_VAD_MODEL;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalRepoRoot === undefined) {
      delete process.env.LINGJI_REPO_ROOT;
    } else {
      process.env.LINGJI_REPO_ROOT = originalRepoRoot;
    }
  });

  it('resolves sensevoice assets from repo root when main process runs from dist-electron', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'lingji-sensevoice-repo-'));
    const distElectron = path.join(repoRoot, 'dist-electron');
    const funasrDir = path.join(repoRoot, 'tools/local-stt/funasr');
    await mkdir(funasrDir, { recursive: true });
    await writeFile(path.join(funasrDir, 'llama-funasr-sensevoice'), 'bin', 'utf8');
    await writeFile(path.join(funasrDir, 'sensevoice-small-f16.gguf'), 'model', 'utf8');
    await writeFile(path.join(funasrDir, 'fsmn-vad.gguf'), 'vad', 'utf8');

    vi.resetModules();
    vi.doMock('node:url', async () => {
      const actual = await vi.importActual<typeof import('node:url')>('node:url');
      return {
        ...actual,
        fileURLToPath: () => path.join(distElectron, 'main.js'),
      };
    });

    process.chdir(repoRoot);
    const { resolveSenseVoiceAssets: resolveFromDist } = await import(
      '../electron/sceneforge/remix/remix-sensevoice-gguf-provider'
    );
    const assets = await resolveFromDist();

    expect(await realpath(assets.binaryPath)).toBe(
      await realpath(path.join(repoRoot, 'tools/local-stt/funasr/llama-funasr-sensevoice')),
    );
    expect(await realpath(assets.modelPath)).toBe(
      await realpath(path.join(repoRoot, 'tools/local-stt/funasr/sensevoice-small-f16.gguf')),
    );
    expect(await realpath(assets.vadModelPath ?? '')).toBe(
      await realpath(path.join(repoRoot, 'tools/local-stt/funasr/fsmn-vad.gguf')),
    );

    vi.doUnmock('node:url');
    vi.resetModules();
  });
});

describe('RemixSenseVoiceGgufProvider', () => {
  let tempDir = '';
  let audioPath = '';
  let binaryPath = '';
  let modelPath = '';
  let vadModelPath = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'lingji-sensevoice-provider-'));
    audioPath = path.join(tempDir, 'segment.wav');
    binaryPath = path.join(tempDir, 'llama-funasr-sensevoice');
    modelPath = path.join(tempDir, 'sensevoice-small-f16.gguf');
    vadModelPath = path.join(tempDir, 'fsmn-vad.gguf');
    await writeFile(audioPath, 'fake-audio', 'utf8');
    await writeFile(binaryPath, 'bin', 'utf8');
    await writeFile(modelPath, 'model', 'utf8');
    await writeFile(vadModelPath, 'vad', 'utf8');
  });

  it('returns parsed text, tags and warnings from runner output', async () => {
    const run = vi.fn(async () => ({
      stdout: '<|zh|><|NEUTRAL|><|Speech|><|woitn|>第一句\n<|zh|><|NEUTRAL|><|Speech|><|woitn|>第二句',
      stderr: 'vad warmup',
      exitCode: 0,
    }));
    const provider = new RemixSenseVoiceGgufProvider({
      binaryPath,
      modelPath,
      vadModelPath,
      run,
    });

    const result = await provider.transcribeSegmentAudio({
      projectDir: tempDir,
      sourceAssetId: 'asset-1',
      segmentId: 'seg-1',
      audioPath,
      sourceStartMs: 0,
      sourceEndMs: 25_000,
      outputDir: path.join(tempDir, 'out'),
    });

    expect(result.engine).toBe('funasr_sensevoice_gguf');
    expect(result.text).toBe('第一句\n第二句');
    expect(result.tags).toEqual({
      language: 'zh',
      emotion: 'NEUTRAL',
      event: 'Speech',
      itn: 'woitn',
    });
    expect(result.stderr).toBe('vad warmup');
    expect(result.warnings).toContain('SenseVoice 运行产生 stderr 输出');
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        binaryPath,
        modelPath,
        vadModelPath,
        useVad: true,
        keepTags: true,
      }),
    );
  });

  it('adds downgrade warning when output has no tags', async () => {
    const provider = new RemixSenseVoiceGgufProvider({
      binaryPath,
      modelPath,
      run: async () => ({
        stdout: '纯文本输出',
        stderr: '',
        exitCode: 0,
      }),
    });

    const result = await provider.transcribeSegmentAudio({
      projectDir: tempDir,
      sourceAssetId: 'asset-1',
      segmentId: 'seg-2',
      audioPath,
      sourceStartMs: 0,
      sourceEndMs: 5_000,
      outputDir: path.join(tempDir, 'out'),
    });

    expect(result.text).toBe('纯文本输出');
    expect(result.warnings).toContain('SenseVoice 输出未包含 keep-tags 标签，已降级为纯文本解析');
  });

  it('throws when runner returns empty stdout', async () => {
    const provider = new RemixSenseVoiceGgufProvider({
      binaryPath,
      modelPath,
      run: async () => ({
        stdout: '   ',
        stderr: '',
        exitCode: 0,
      }),
    });

    await expect(
      provider.transcribeSegmentAudio({
        projectDir: tempDir,
        sourceAssetId: 'asset-1',
        segmentId: 'seg-3',
        audioPath,
        sourceStartMs: 0,
        sourceEndMs: 5_000,
        outputDir: path.join(tempDir, 'out'),
      }),
    ).rejects.toThrow('SenseVoice 未返回有效文本');
  });

  it('throws when runner exits with non-zero code', async () => {
    const provider = new RemixSenseVoiceGgufProvider({
      binaryPath,
      modelPath,
      run: async () => ({
        stdout: '',
        stderr: 'bad model',
        exitCode: 2,
      }),
    });

    await expect(
      provider.transcribeSegmentAudio({
        projectDir: tempDir,
        sourceAssetId: 'asset-1',
        segmentId: 'seg-4',
        audioPath,
        sourceStartMs: 0,
        sourceEndMs: 5_000,
        outputDir: path.join(tempDir, 'out'),
      }),
    ).rejects.toThrow('SenseVoice 进程退出码：2');
  });

  it('throws when runner times out', async () => {
    const provider = new RemixSenseVoiceGgufProvider({
      binaryPath,
      modelPath,
      timeoutMs: 1234,
      run: async () => ({
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: true,
      }),
    });

    await expect(
      provider.transcribeSegmentAudio({
        projectDir: tempDir,
        sourceAssetId: 'asset-1',
        segmentId: 'seg-5',
        audioPath,
        sourceStartMs: 0,
        sourceEndMs: 5_000,
        outputDir: path.join(tempDir, 'out'),
      }),
    ).rejects.toThrow('SenseVoice 转写超时');
  });

  it('falls back to discovered repo assets when explicit paths are missing', async () => {
    const provider = new RemixSenseVoiceGgufProvider({
      binaryPath: path.join(tempDir, 'missing-bin'),
      modelPath: path.join(tempDir, 'missing-model'),
    });

    await expect(resolveSenseVoiceAssets({
      binaryPath: path.join(tempDir, 'missing-bin'),
      modelPath: path.join(tempDir, 'missing-model'),
    })).resolves.toEqual(
      expect.objectContaining({
        binaryPath: expect.stringContaining('llama-funasr-sensevoice'),
        modelPath: expect.stringContaining('sensevoice-small-f16.gguf'),
      }),
    );

    await expect(provider.probeAvailability()).resolves.toEqual(
      expect.objectContaining({
        available: true,
      }),
    );
  });
});
