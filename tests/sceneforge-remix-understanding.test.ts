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
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
} from '../electron/sceneforge/remix/remix-artifact-paths';

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
      language: 'zh-CN',
      fullChinesePrompt: `固定镜头，${segmentId} 缓慢抬头。人物主体神态严肃，胶片质感。`,
      subjectPrompt: '人物主体神态严肃',
      scenePrompt: '微暗的室内环境',
      actionPrompt: `${segmentId} 缓慢抬头`,
      performancePrompt: '神态严肃，视线聚焦',
      cameraPrompt: '平视固定镜头',
      lightingPrompt: '微弱室内自然光',
      colorPrompt: '冷色调，胶片颗粒感',
      emotionPrompt: '紧张，压抑',
      rhythmPrompt: '舒缓深沉',
      dialoguePrompt: '对白语气中性',
      soundPrompt: '无明显音效',
      stylePrompt: '电影写实风格',
      continuityPrompt: '镜头衔接逻辑连贯',
      remixControlPrompt: '保留面部神态',
      negativePrompt: '避免卡通风格，画面保持稳定。',
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
        generateStructuredData: async () => ({
          storyContent: '全片故事内容连贯串起，已完成段数汇总。',
          remixPotential: ['保留人物反应镜头', '替换台词做场景改写']
        }),
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
    expect(overview.originalUnderstandingPath).toBe(
      getRemixOriginalUnderstandingJsonPath(imported.sourceAsset.id),
    );
    expect(overview.overall.storyContent).toContain('段');
    const original = JSON.parse(
      await fs.readFile(
        path.join(projectDir, getRemixOriginalUnderstandingJsonPath(imported.sourceAsset.id)),
        'utf8',
      ),
    );
    expect(original.quality.understoodSegmentCount).toBe(understood.sourceAsset.segments.length);

    for (const segment of understood.sourceAsset.segments) {
      const rel = getRemixSegmentUnderstandingJsonPath(imported.sourceAsset.id, segment.id);
      const perSegment = JSON.parse(await fs.readFile(path.join(projectDir, rel), 'utf8'));
      expect(perSegment.visual.mainAction).toContain(segment.id);
      expect(perSegment.videoPrompt.fullChinesePrompt.length).toBeGreaterThan(0);
      expect(perSegment.videoPrompt.subjectPrompt).toContain('神态严肃');
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
    const mockProvider = new RemixLocalWhisperProvider({
      transcribe: async ({ outputPrefix }) => {
        const srtPath = `${outputPrefix}.srt`;
        const srt = '1\n00:00:00,420 --> 00:00:02,900\n第一句\n';
        await fs.writeFile(srtPath, srt, 'utf8');
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
        generateStructuredData: async () => ({
          storyContent: '全片故事内容连贯串起，已完成段数汇总。',
          remixPotential: ['保留人物反应镜头', '替换台词做场景改写']
        }),
      },
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
    await service.runSourceTranscript({ projectDir, sourceAssetId: imported.sourceAsset.id });

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

describe('loadRemixUnderstandingAISettings', () => {
  it('returns null when global settings have no usable LLM', async () => {
    const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'remix-ai-settings-'));
    await fs.mkdir(userData, { recursive: true });
    await fs.writeFile(
      path.join(userData, 'settings.json'),
      JSON.stringify({ aiSettings: { llmProviders: [], llmBaseUrl: '', llmApiKey: '', llmModel: '' } }),
      'utf8',
    );
    const { loadRemixUnderstandingAISettings } = await import('../electron/sceneforge/remix/remix-ai-settings');
    const loaded = await loadRemixUnderstandingAISettings(userData);
    expect(loaded).toBeNull();
    await fs.rm(userData, { recursive: true, force: true });
  });
});

