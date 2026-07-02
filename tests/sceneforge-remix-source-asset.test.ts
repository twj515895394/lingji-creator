import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AISettings } from '../src/types/ai';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

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
      fullChinesePrompt: `固定镜头，${segmentId} 缓慢抬头。`,
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
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-source-asset-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix source asset service', () => {
  it('creates source manifest from local video input', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
        generateStructuredData: async () => ({
          storyContent: '全片故事内容连贯串起，已完成段数汇总。',
          remixPotential: ['保留人物反应镜头'],
        }),
      },
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });

    expect(snapshot.sourceAsset.title).toBe('夜市原片');
    expect(snapshot.sourceAsset.videoMetadata.durationMs).toBe(9800);
    expect(snapshot.sourceAsset.videoMetadata.width).toBe(1920);
    expect(snapshot.sourceAsset.videoMetadata.height).toBe(1080);
    await expect(
      fs.readFile(path.join(projectDir, snapshot.sourceAsset.sourceManifestPath), 'utf8'),
    ).resolves.toContain('"schema": "sceneforge-remix-source-asset"');
  });

  it('persists probed source video metadata when a metadata reader is provided', async () => {
    const service = new RemixService({
      readVideoMetadata: async () => ({
        durationMs: 8033,
        width: 852,
        height: 480,
        fps: 29.97,
        audioChannels: 1,
        hasAudio: false,
      }),
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '样片',
    });

    expect(snapshot.sourceAsset.videoMetadata).toEqual({
      durationMs: 8033,
      width: 852,
      height: 480,
      fps: 29.97,
      audioChannels: 1,
      hasAudio: false,
    });
    await expect(
      fs.readFile(path.join(projectDir, snapshot.sourceAsset.sourceManifestPath), 'utf8'),
    ).resolves.toContain('"width": 852');
  });

  it('persists manual metadata and blocks publish until metadata is saved', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
      understandingServiceOptions: {
        loadAISettings: async () => mockSettings,
        generateSegmentUnderstanding: async (_settings, context) =>
          mockUnderstandingPayload(context.segment.id),
        generateStructuredData: async () => ({
          storyContent: '全片故事内容连贯串起，已完成段数汇总。',
          remixPotential: ['保留人物反应镜头'],
        }),
      },
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: snapshot.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: snapshot.sourceAsset.id });
    await service.runSourceUnderstanding({ projectDir, sourceAssetId: snapshot.sourceAsset.id });

    await expect(
      service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: snapshot.sourceAsset.id }),
    ).rejects.toThrow('请先保存至少一个资产标签');

    const annotated = await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
      tags: ['night-market', 'slow-burn'],
      annotationNote: '保留停顿和压迫感。',
    });

    expect(annotated.sourceAsset.tags).toEqual(['night-market', 'slow-burn']);
    expect(annotated.sourceAsset.annotationNote).toBe('保留停顿和压迫感。');

    const reloaded = await service.getSourceAsset({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });
    expect(reloaded.sourceAsset.lastAnnotatedAt).toBe('2026-06-23T12:00:00.000Z');
  });

  it('validates media readiness and persists keyframe anomalies', async () => {
    const service = new RemixService({
      readDurationMs: async () => 9800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });

    const snapshot = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
      title: '夜市原片',
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: snapshot.sourceAsset.id });
    await service.runSourceKeyframes({ projectDir, sourceAssetId: snapshot.sourceAsset.id });

    const sourceAsset = await service.getSourceAsset({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });
    const brokenKeyframePath = path.join(projectDir, sourceAsset.sourceAsset.segments[0]!.keyframes[0]!.imagePath);
    await fs.rm(brokenKeyframePath, { force: true });

    const validation = await service.validateSourceAssetMedia({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });

    expect(validation.sourceVideo.readable).toBe(true);
    expect(validation.keyframes.invalidCount).toBe(1);
    expect(validation.thumbnail.source).toBe('keyframe');

    const reloaded = await service.getSourceAsset({
      projectDir,
      sourceAssetId: snapshot.sourceAsset.id,
    });
    expect(reloaded.sourceAsset.mediaValidation?.keyframes.invalidCount).toBe(1);
  });
});
