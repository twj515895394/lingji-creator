import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AISettings, SourceSegment } from '../src/types/ai';
import { RemixFrameVisionService } from '../electron/sceneforge/remix/remix-frame-vision-service';
import { getRemixSegmentFrameVisionJsonPath } from '../electron/sceneforge/remix/remix-artifact-paths';
import { resolveProjectFile } from '../electron/sceneforge/remix/remix-validators';

let invokeCount = 0;

// Mock 我们的 langchain 构造类，以拦截多模态大模型的真实网络请求
vi.mock('../src/lib/llm/model', () => {
  return {
    createChatModelFromProvider: () => {
      return {
        invoke: async () => {
          invokeCount++;
          return {
            content: JSON.stringify({
              caption: '影视画面包含主角在室内。',
              visibleCharacters: ['主角'],
              visibleActions: ['低头看书'],
              environment: '微暗的书房室内',
              props: ['眼镜', '古旧书籍'],
              lighting: '侧面自然光照',
              composition: '主体居中平视',
            }),
          };
        },
      };
    },
  };
});

describe('RemixFrameVisionService', () => {
  let projectDir: string;
  const sourceAssetId = 'asset-123';
  let segment: SourceSegment;

  beforeEach(async () => {
    invokeCount = 0;
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-frame-vision-'));
    
    // 写入虚拟的图片文件以供 nativeImage 加载，内容为简单的非空字符串即可
    const firstImagePath = 'source_segments/seg-01/first_frame.png';
    const middleImagePath = 'source_segments/seg-01/middle_frame.png';
    
    await fs.mkdir(path.join(projectDir, 'source_segments/seg-01'), { recursive: true });
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await fs.writeFile(path.join(projectDir, firstImagePath), pngBuffer);
    await fs.writeFile(path.join(projectDir, middleImagePath), pngBuffer);

    segment = {
      id: 'seg-01',
      title: '片段 1',
      index: 0,
      timeRange: { startMs: 0, endMs: 5000 },
      keyframes: [
        {
          id: 'kf-first',
          frameRole: 'first',
          timestampMs: 0,
          imagePath: firstImagePath,
        },
        {
          id: 'kf-middle',
          frameRole: 'middle',
          timestampMs: 2500,
          imagePath: middleImagePath,
        },
      ],
      boundaryType: 'manual',
    };
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('gracefully downgrades to text mode when LLM provider has no visionInput capability', async () => {
    const settings: AISettings = {
      llmProviders: [
        {
          id: 'provider-text-only',
          name: 'Text Model Provider',
          type: 'openai_compatible',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-123',
          models: ['gpt-4-turbo'],
          capabilities: {
            visionInput: false, // 纯文本模型，不开启 vision 支持
          },
        },
      ],
      defaultProviderId: 'provider-text-only',
      defaultModel: 'gpt-4-turbo',
    } as any;

    const service = new RemixFrameVisionService();
    const doc = await service.runSegmentFrameVision({
      projectDir,
      sourceAssetId,
      segment,
      settings,
    });

    expect(doc.schema).toBe('sceneforge-remix-segment-frame-vision');
    expect(doc.version).toBe(1);
    expect(doc.quality.needsHumanReview).toBe(true);
    expect(doc.quality.warnings[0]).toContain('当前模型不支持多模态视觉识别');
    expect(doc.frames[0].caption).toBe('');
    expect(doc.segmentVisualSummary).toBe('（降级模式，无视觉总结）');

    // 检查本地落盘的文件是否存在
    const relPath = getRemixSegmentFrameVisionJsonPath(sourceAssetId, 'seg-01');
    const localContent = JSON.parse(await fs.readFile(resolveProjectFile(projectDir, relPath), 'utf8'));
    expect(localContent.segmentId).toBe('seg-01');
  });

  it('runs multimodal vision extraction when visionInput is enabled', async () => {
    const settings: AISettings = {
      llmProviders: [
        {
          id: 'provider-vision-enabled',
          name: 'Vision Model Provider',
          type: 'openai_compatible',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-123',
          models: ['gpt-4o'],
          capabilities: {
            visionInput: true, // 开启 vision 支持
          },
        },
      ],
      defaultProviderId: 'provider-vision-enabled',
      defaultModel: 'gpt-4o',
    } as any;

    const service = new RemixFrameVisionService();
    const doc = await service.runSegmentFrameVision({
      projectDir,
      sourceAssetId,
      segment,
      settings,
    });

    expect(doc.quality.needsHumanReview).toBe(false);
    expect(doc.frames[0].caption).toContain('包含主角在室内');
    expect(doc.frames[0].visibleCharacters).toContain('主角');
    expect(doc.frames[0].visibleActions).toContain('低头看书');
    expect(doc.segmentVisualSummary).toContain('包含主角在室内');
    expect(invokeCount).toBe(2); // 包含两个关键帧 (first 和 middle)

    // 测试缓存复用：第二次运行时，哈希和模型不变，invokeCount 不应该再增加，应该直接复用缓存
    const docCached = await service.runSegmentFrameVision({
      projectDir,
      sourceAssetId,
      segment,
      settings,
    });

    expect(docCached.frames[0].caption).toContain('包含主角在室内');
    expect(invokeCount).toBe(2); // 没有发起新的 vision 大模型调用
  });
});
