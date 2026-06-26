import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { RemixService } from '../electron/sceneforge/remix/remix-service';
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
      transcriptService: new RemixTranscriptService({ whisperProvider: mockProvider }),
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
});
