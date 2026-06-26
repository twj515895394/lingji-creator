import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AISettings } from '../src/types/ai';
import { RemixService } from '../electron/sceneforge/remix/remix-service';
import { RemixTranscriptService } from '../electron/sceneforge/remix/remix-transcript-service';
import { RemixLocalWhisperProvider } from '../electron/sceneforge/remix/remix-whisper-provider';
import {
  REMIX_UNDERSTANDING_ROLLUP_KIND,
  validateRemixUnderstandingArtifacts,
} from '../electron/sceneforge/remix/remix-understanding-gate';
import { getRemixSegmentUnderstandingJsonPath } from '../electron/sceneforge/remix/remix-artifact-paths';

let projectDir: string;

const mockSettings = { provider: 'openai' } as AISettings;

function mockUnderstandingPayload(segmentId: string) {
  return {
    visual: { mainAction: `动作-${segmentId}` },
    camera: { shotSize: '中近景', movement: '固定镜头' },
    audio: { speechSummary: '对白摘要' },
    story: { plotFunction: '推进情节' },
    remix: { keepElements: ['节奏'] },
    videoPrompt: {
      positivePrompt: `固定镜头，${segmentId} 缓慢抬头。`,
      negativePrompt: '避免卡通风格。',
      motionPrompt: '先停顿再抬头。',
      cameraPrompt: '平视固定镜头。',
      dialoguePrompt: '语气迟疑。',
    },
    quality: { confidence: 0.88, needsHumanReview: true, missingInputs: [], warnings: [] },
  };
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-understanding-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix understanding service', () => {
  it('writes per-segment understanding artifacts with mock LLM', async () => {
    const mockProvider = new RemixLocalWhisperProvider({
      transcribe: async ({ outputPrefix }) => {
        const srtPath = `${outputPrefix}.srt`;
        await fs.writeFile(
          srtPath,
          '1\n00:00:00,420 --> 00:00:02,900\n第一句\n\n2\n00:00:03,100 --> 00:00:06,800\n第二句\n',
          'utf8',
        );
        return { srtPath };
      },
    });
    const service = new RemixService({
      readDurationMs: async () => 12000,
      transcriptService: new RemixTranscriptService({ whisperProvider: mockProvider }),
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
      },
    });

    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceAudio({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceTranscript({ projectDir, sourceAssetId: imported.sourceAsset.id });

    const understood = await service.runSourceUnderstanding({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(understood.processingStageStates.remix_understanding).toBe('ready_for_review');
    const overview = JSON.parse(
      await fs.readFile(path.join(projectDir, understood.sourceAsset.sourceOverviewJsonPath ?? ''), 'utf8'),
    );
    expect(overview.artifactKind).toBe(REMIX_UNDERSTANDING_ROLLUP_KIND);
    expect(overview.understoodSegmentCount).toBe(understood.sourceAsset.segments.length);

    for (const segment of understood.sourceAsset.segments) {
      const rel = getRemixSegmentUnderstandingJsonPath(imported.sourceAsset.id, segment.id);
      const perSegment = JSON.parse(await fs.readFile(path.join(projectDir, rel), 'utf8'));
      expect(perSegment.visual.mainAction).toContain(segment.id);
      expect(perSegment.videoPrompt.positivePrompt.length).toBeGreaterThan(0);
      expect(perSegment.inputHash.length).toBeGreaterThan(10);
    }

    const validation = await validateRemixUnderstandingArtifacts(projectDir, {
      schema: 'sceneforge-remix-source-asset',
      version: 1,
      sourceAsset: understood.sourceAsset,
      processingStageStates: understood.processingStageStates,
    });
    expect(validation.ok).toBe(true);
    expect(validation.isPlaceholder).toBe(false);
  });

  it('reruns a single segment and updates only that segment inputHash', async () => {
    const service = new RemixService({
      readDurationMs: async () => 12000,
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
      },
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });

    const firstRun = await service.runSourceUnderstanding({ projectDir, sourceAssetId: imported.sourceAsset.id });
    const firstSegmentId = firstRun.sourceAsset.segments[0]?.id;
    expect(firstSegmentId).toBeTruthy();
    const firstPath = getRemixSegmentUnderstandingJsonPath(imported.sourceAsset.id, firstSegmentId!);
    const before = JSON.parse(await fs.readFile(path.join(projectDir, firstPath), 'utf8'));

    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.rerunSegmentUnderstanding({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
      segmentId: firstSegmentId!,
    });

    const after = JSON.parse(await fs.readFile(path.join(projectDir, firstPath), 'utf8'));
    expect(after.generatedAt).not.toBe(before.generatedAt);
  });
});
