import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AISettings } from '../src/types/ai';
import { RemixService } from '../electron/sceneforge/remix/remix-service';
import { RemixTranscriptService } from '../electron/sceneforge/remix/remix-transcript-service';
import { RemixLocalWhisperProvider } from '../electron/sceneforge/remix/remix-whisper-provider';
import {
  RemixUnderstandingOrchestrator,
  isSourceTranscriptFresh,
} from '../electron/sceneforge/remix/remix-understanding-orchestrator';
import { getRemixSourceTranscriptJsonPath } from '../electron/sceneforge/remix/remix-artifact-paths';
import { hashAudioFile } from '../electron/sceneforge/remix/remix-whisper-provider';
import { readStoredSourceAsset } from '../electron/sceneforge/remix/remix-store';
import { resolveProjectFile } from '../electron/sceneforge/remix/remix-validators';

let projectDir: string;
const mockSettings = { provider: 'openai' } as AISettings;

function mockUnderstandingPayload(segmentId: string) {
  return {
    visual: { mainAction: segmentId },
    camera: { shotSize: '中景', movement: '固定' },
    audio: { speechSummary: '台词' },
    story: { plotFunction: '推进' },
    remix: { keepElements: ['节奏'], replaceableElements: ['身份'] },
    videoPrompt: {
      positivePrompt: `prompt-${segmentId}`,
      negativePrompt: '无',
      motionPrompt: '动',
      cameraPrompt: '镜',
      dialoguePrompt: '词',
    },
    quality: { confidence: 0.9, needsHumanReview: false, missingInputs: [], warnings: [] },
  };
}

function buildMockWhisper() {
  return new RemixLocalWhisperProvider({
    transcribe: async ({ outputPrefix }) => {
      const srtPath = `${outputPrefix}.srt`;
      await fs.writeFile(srtPath, '1\n00:00:00,000 --> 00:00:01,000\n测试\n', 'utf8');
      return { srtPath };
    },
  });
}

async function prepareAsset(service: RemixService) {
  const imported = await service.createSourceAssetFromImport({
    projectDir,
    sourceVideoPath: path.join(projectDir, 'source.mp4'),
  });
  const id = imported.sourceAsset.id;
  await service.runSourceSegmentation({ projectDir, sourceAssetId: id });
  await service.runSourceKeyframes({ projectDir, sourceAssetId: id });
  await service.runSourceAudio({ projectDir, sourceAssetId: id });
  await service.runSourceTranscript({ projectDir, sourceAssetId: id });
  return id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remix-orchestrator-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('Remix understanding orchestrator', () => {
  it('skips whisper when source transcript matches current audio hash', async () => {
    const mockProvider = buildMockWhisper();
    const service = new RemixService({
      readDurationMs: async () => 8000,
      understandingConcurrency: 2,
      transcriptService: new RemixTranscriptService({ whisperProvider: mockProvider }),
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
      },
    });

    const id = await prepareAsset(service);
    const doc = await readStoredSourceAsset(projectDir, id);
    const audioPath = doc.sourceAsset.sourceAudioPath!;
    const audioSha256 = await hashAudioFile(resolveProjectFile(projectDir, audioPath));
    const transcriptAbs = resolveProjectFile(projectDir, getRemixSourceTranscriptJsonPath(id));
    const transcript = JSON.parse(await fs.readFile(transcriptAbs, 'utf8'));
    transcript.inputHash = { audioSha256, promptVersion: 'remix-stt-v1' };
    await fs.writeFile(transcriptAbs, JSON.stringify(transcript, null, 2));

    expect(await isSourceTranscriptFresh(projectDir, doc)).toBe(true);

    const transcriptRun = vi.fn(async () => doc);
    const orchestratorService = new RemixService({
      readDurationMs: async () => 8000,
      understandingConcurrency: 2,
      transcriptService: { run: transcriptRun } as unknown as RemixTranscriptService,
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
      },
    });

    const understood = await orchestratorService.runSourceUnderstanding({ projectDir, sourceAssetId: id });
    expect(understood.processingJobs?.[0]?.understandingProgress?.phase).toBe('done');
    expect(transcriptRun).not.toHaveBeenCalled();
  });

  it('reports understanding progress through onJobUpdate hooks', async () => {
    const mockProvider = buildMockWhisper();
    const service = new RemixService({
      readDurationMs: async () => 8000,
      understandingConcurrency: 2,
      transcriptService: new RemixTranscriptService({ whisperProvider: mockProvider }),
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
      },
    });

    const id = await prepareAsset(service);
    const doc = await readStoredSourceAsset(projectDir, id);
    const segmentTotal = doc.sourceAsset.segments.length;
    const updates: number[] = [];

    const wired = new RemixUnderstandingOrchestrator({
      skipTranscriptIfFresh: true,
      understandingConcurrency: 2,
      transcriptService: new RemixTranscriptService({ whisperProvider: mockProvider }),
      understandingService: (service as any).understandingService,
    });

    await wired.run(projectDir, id, {
      onJobUpdate: async (patch) => {
        const up = patch.understandingProgress;
        if (typeof up?.completed === 'number') {
          updates.push(up.completed);
        }
      },
    });

    expect(segmentTotal).toBeGreaterThan(0);
    expect(Math.max(...updates, 0)).toBe(segmentTotal);
  });
});
