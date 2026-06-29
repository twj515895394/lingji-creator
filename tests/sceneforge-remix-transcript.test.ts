import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { RemixService } from '../electron/sceneforge/remix/remix-service';
import { RemixSegmentTranscriptService } from '../electron/sceneforge/remix/remix-segment-transcript-service';
import { RemixTranscriptService } from '../electron/sceneforge/remix/remix-transcript-service';
import { RemixLocalWhisperProvider } from '../electron/sceneforge/remix/remix-whisper-provider';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-transcript-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix transcript service', () => {
  it('writes source and segment transcript artifacts after audio extraction', async () => {
    const mockProvider = new RemixLocalWhisperProvider({
      transcribe: async ({ outputPrefix }) => {
        const srtPath = `${outputPrefix}.srt`;
        await fs.writeFile(srtPath, '1\n00:00:00,420 --> 00:00:02,900\n这里是第一句\n\n2\n00:00:03,100 --> 00:00:06,800\n第二句对白\n', 'utf8');
        return { srtPath };
      },
    });
    const service = new RemixService({
      readDurationMs: async () => 12000,
      transcriptService: new RemixTranscriptService({
        whisperProvider: mockProvider,
        preferredEngine: 'local_whisper_cpp',
      }),
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceAudio({ projectDir, sourceAssetId: imported.sourceAsset.id });

    const transcribed = await service.runSourceTranscript({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(transcribed.sourceAsset.transcriptPath).toContain('source_transcript.json');
    expect(transcribed.sourceAsset.srtPath).toContain('source_transcript.srt');
    const sourceJson = JSON.parse(
      await fs.readFile(path.join(projectDir, transcribed.sourceAsset.transcriptPath ?? ''), 'utf8'),
    );
    expect(sourceJson.engine).toBe('local_whisper_cpp');
    expect(sourceJson.utterances.length).toBeGreaterThan(0);

    const segmentJson = JSON.parse(
      await fs.readFile(
        path.join(projectDir, transcribed.sourceAsset.segments[0].segmentTranscriptJsonPath ?? ''),
        'utf8',
      ),
    );
    expect(segmentJson.schema).toBe('sceneforge-remix-segment-transcript');
    expect(segmentJson.plainText.length).toBeGreaterThan(0);
  });

  it('prefers sensevoice in auto mode and does not generate source srt', async () => {
    const sensevoiceProvider = {
      capabilities: {
        engine: 'funasr_sensevoice_gguf',
        mode: 'segment_audio_asr',
        timestampLevel: 'segment_range',
        canGenerateAccurateSrt: false,
        canProvideSegmentDialogue: true,
      },
      async probeAvailability() {
        return { available: true };
      },
      async transcribeSegmentAudio(input: { segmentId: string }) {
        return {
          engine: 'funasr_sensevoice_gguf' as const,
          mode: 'segment_audio_asr' as const,
          timestampLevel: 'segment_range' as const,
          text: `台词-${input.segmentId}`,
          rawOutput: `台词-${input.segmentId}`,
          stderr: '',
          durationMs: 8,
          warnings: [],
        };
      },
    };
    const whisperProvider = new RemixLocalWhisperProvider({
      transcribe: async () => {
        throw new Error('whisper should not run in auto sensevoice case');
      },
    });
    const service = new RemixService({
      readDurationMs: async () => 12000,
      transcriptService: new RemixTranscriptService({
        whisperProvider,
        sensevoiceProvider: sensevoiceProvider as any,
        segmentTranscriptService: new RemixSegmentTranscriptService({
          provider: sensevoiceProvider as any,
        }),
      }),
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceAudio({ projectDir, sourceAssetId: imported.sourceAsset.id });

    const transcribed = await service.runSourceTranscript({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(transcribed.sourceAsset.srtPath).toBeNull();
    const sourceJson = JSON.parse(
      await fs.readFile(path.join(projectDir, transcribed.sourceAsset.transcriptPath ?? ''), 'utf8'),
    );
    expect(sourceJson.engine).toBe('funasr_sensevoice_gguf');
    expect(sourceJson.mode).toBe('segment_audio_asr');
    expect(sourceJson.srtStatus).toBe('not_generated');
    await expect(
      fs.access(path.join(projectDir, 'sceneforge/remix/source-assets', imported.sourceAsset.id, 'transcripts/source_transcript.srt')),
    ).rejects.toThrow();
  });

  it('falls back to whisper when sensevoice is unavailable in auto mode', async () => {
    const sensevoiceProvider = {
      capabilities: {
        engine: 'funasr_sensevoice_gguf',
        mode: 'segment_audio_asr',
        timestampLevel: 'segment_range',
        canGenerateAccurateSrt: false,
        canProvideSegmentDialogue: true,
      },
      async probeAvailability() {
        return { available: false, reason: 'missing sensevoice model' };
      },
      async transcribeSegmentAudio() {
        throw new Error('sensevoice should not run in fallback case');
      },
    };
    const whisperProvider = new RemixLocalWhisperProvider({
      transcribe: async ({ outputPrefix }) => {
        const srtPath = `${outputPrefix}.srt`;
        await fs.writeFile(srtPath, '1\n00:00:00,000 --> 00:00:01,000\n回退字幕\n', 'utf8');
        return { srtPath };
      },
    });
    const service = new RemixService({
      readDurationMs: async () => 12000,
      transcriptService: new RemixTranscriptService({
        whisperProvider,
        sensevoiceProvider: sensevoiceProvider as any,
      }),
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceAudio({ projectDir, sourceAssetId: imported.sourceAsset.id });

    const transcribed = await service.runSourceTranscript({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(transcribed.sourceAsset.srtPath).toContain('source_transcript.srt');
    const sourceJson = JSON.parse(
      await fs.readFile(path.join(projectDir, transcribed.sourceAsset.transcriptPath ?? ''), 'utf8'),
    );
    expect(sourceJson.engine).toBe('local_whisper_cpp');
    expect(sourceJson.srtStatus).toBe('fallback_whisper');
  });

  it('supports forced whisper and errors clearly when forced sensevoice is unavailable', async () => {
    const sensevoiceProvider = {
      capabilities: {
        engine: 'funasr_sensevoice_gguf',
        mode: 'segment_audio_asr',
        timestampLevel: 'segment_range',
        canGenerateAccurateSrt: false,
        canProvideSegmentDialogue: true,
      },
      async probeAvailability() {
        return { available: false, reason: 'missing sensevoice model' };
      },
      async transcribeSegmentAudio() {
        throw new Error('sensevoice should not run in forced whisper case');
      },
    };
    const whisperProvider = new RemixLocalWhisperProvider({
      transcribe: async ({ outputPrefix }) => {
        const srtPath = `${outputPrefix}.srt`;
        await fs.writeFile(srtPath, '1\n00:00:00,000 --> 00:00:01,000\n强制 whisper\n', 'utf8');
        return { srtPath };
      },
    });
    const forcedWhisperService = new RemixService({
      readDurationMs: async () => 12000,
      transcriptService: new RemixTranscriptService({
        whisperProvider,
        sensevoiceProvider: sensevoiceProvider as any,
        preferredEngine: 'local_whisper_cpp',
      }),
    });
    const imported = await forcedWhisperService.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await forcedWhisperService.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await forcedWhisperService.runSourceAudio({ projectDir, sourceAssetId: imported.sourceAsset.id });
    const forcedWhisperResult = await forcedWhisperService.runSourceTranscript({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });
    const whisperJson = JSON.parse(
      await fs.readFile(path.join(projectDir, forcedWhisperResult.sourceAsset.transcriptPath ?? ''), 'utf8'),
    );
    expect(whisperJson.engine).toBe('local_whisper_cpp');
    expect(whisperJson.srtStatus).toBe('accurate');

    const forcedSenseVoiceService = new RemixService({
      readDurationMs: async () => 12000,
      transcriptService: new RemixTranscriptService({
        whisperProvider,
        sensevoiceProvider: sensevoiceProvider as any,
        preferredEngine: 'funasr_sensevoice_gguf',
      }),
    });
    const imported2 = await forcedSenseVoiceService.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await forcedSenseVoiceService.runSourceSegmentation({ projectDir, sourceAssetId: imported2.sourceAsset.id });
    await forcedSenseVoiceService.runSourceAudio({ projectDir, sourceAssetId: imported2.sourceAsset.id });

    await expect(
      forcedSenseVoiceService.runSourceTranscript({
        projectDir,
        sourceAssetId: imported2.sourceAsset.id,
      }),
    ).rejects.toThrow('SenseVoice 不可用');
  });
});
