import fs from 'node:fs/promises';
import path from 'node:path';
import type { AISettings } from '../../../src/types/ai';
import { generateStructuredData } from '../../../src/lib/llm';
import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentManifestPath,
  getRemixSegmentUnderstandingJsonPath,
} from './remix-artifact-paths';
import { buildRemixUnderstandingInputFingerprint } from './remix-understanding-gate';
import { assertSourceAssetStageReady, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';
import {
  REMIX_SEGMENT_UNDERSTANDING_SYSTEM_PROMPT,
  normalizeSegmentUnderstandingPayload,
  toGateSegmentUnderstandingItem,
  validateSegmentUnderstandingDocument,
  type RemixSegmentUnderstandingDocument,
} from './remix-segment-understanding-schema';
import { RemixOriginalStoryRollupService } from './remix-original-story-rollup-service';

export interface RemixUnderstandingServiceOptions {
  loadAISettings?: () => Promise<AISettings | null>;
  generateStructuredData?: typeof generateStructuredData;
  generateSegmentUnderstanding?: (
    settings: AISettings,
    context: RemixSegmentGenerationContext,
  ) => Promise<Record<string, unknown>>;
}

export interface RemixSegmentGenerationContext {
  sourceAssetId: string;
  segment: SourceSegment;
  transcript?: RemixSegmentTranscriptDocument | null;
  neighborSummaries: {
    previous?: string;
    next?: string;
  };
}

function buildSegmentUserPrompt(context: RemixSegmentGenerationContext): string {
  const { segment, transcript, neighborSummaries } = context;
  const keyframeLines = segment.keyframes.map(
    (frame) => `- ${frame.frameRole}: ${frame.imagePath} @ ${frame.timestampMs}ms`,
  );
  return [
    `片段 ID: ${segment.id}`,
    `标题: ${segment.title}`,
    `时间范围: ${segment.timeRange.startMs}ms - ${segment.timeRange.endMs}ms`,
    `边界类型: ${segment.boundaryType}`,
    '',
    '关键帧:',
    ...(keyframeLines.length ? keyframeLines : ['- （无关键帧路径）']),
    '',
    '分段台词:',
    transcript?.plainText?.trim() || '（无台词）',
    '',
    '相邻片段摘要:',
    `- 前一段: ${neighborSummaries.previous ?? '无'}`,
    `- 后一段: ${neighborSummaries.next ?? '无'}`,
    '',
    '请输出单个片段的结构化理解 JSON。',
  ].join('\n');
}

function buildSegmentAnalysisMarkdown(segments: RemixSegmentUnderstandingDocument[]): string {
  return [
    '# Segment Analysis',
    '',
    ...segments.flatMap((segment) => [
      `## ${segment.title}`,
      `- 片段 ID：${segment.segmentId}`,
      `- 画面动作：${segment.visual.mainAction}`,
      `- 镜头：${segment.camera.shotSize} / ${segment.camera.movement}`,
      `- 台词摘要：${segment.audio.speechSummary}`,
      `- 剧情功能：${segment.story.plotFunction}`,
      `- 正向提示词：${segment.videoPrompt.positivePrompt}`,
      '',
    ]),
  ].join('\n');
}

function buildSourceOverviewMarkdown(
  document: StoredSourceAssetDocument,
  segments: RemixSegmentUnderstandingDocument[],
): string {
  const asset = document.sourceAsset;
  return [
    '# Source Overview',
    '',
    `- 标题：${asset.title}`,
    `- Source Asset：${asset.id}`,
    `- 镜头分段：${asset.segments.length}`,
    `- 已理解片段：${segments.length}`,
    `- 总时长：${Math.round(asset.videoMetadata.durationMs / 1000)} 秒`,
    '',
    '## 处理结论',
    '',
    '原片已完成片段级结构化理解，可进入人工校对与二创引用。',
  ].join('\n');
}

async function readSegmentTranscript(
  projectDir: string,
  segment: SourceSegment,
): Promise<RemixSegmentTranscriptDocument | null> {
  if (!segment.segmentTranscriptJsonPath?.trim()) {
    return null;
  }
  try {
    const raw = await fs.readFile(
      resolveProjectFile(projectDir, segment.segmentTranscriptJsonPath),
      'utf8',
    );
    return JSON.parse(raw) as RemixSegmentTranscriptDocument;
  } catch {
    return null;
  }
}


async function readExistingSegmentUnderstanding(
  projectDir: string,
  segment: SourceSegment,
): Promise<RemixSegmentUnderstandingDocument | null> {
  const relPath =
    segment.analysisJsonPath?.trim() ||
    getRemixSegmentUnderstandingJsonPath(segment.sourceAssetId, segment.id);
  try {
    const raw = await fs.readFile(resolveProjectFile(projectDir, relPath), 'utf8');
    const parsed = JSON.parse(raw) as RemixSegmentUnderstandingDocument;
    if (parsed.schema !== 'sceneforge-remix-segment-understanding') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}


export interface RemixUnderstandingRunProgress {
  completed: number;
  total: number;
  currentSegmentId?: string;
  failedSegmentIds?: string[];
}

export interface RemixUnderstandingRunWithProgressOptions {
  segmentIds?: string[];
  concurrency?: number;
  onProgress?: (progress: RemixUnderstandingRunProgress) => void | Promise<void>;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
}

export class RemixUnderstandingService {
  private readonly loadAISettings: () => Promise<AISettings | null>;

  private readonly generateStructured: typeof generateStructuredData;

  private readonly generateSegmentUnderstanding?: RemixUnderstandingServiceOptions['generateSegmentUnderstanding'];

  private readonly rollupService: RemixOriginalStoryRollupService;

  constructor(options: RemixUnderstandingServiceOptions = {}) {
    this.loadAISettings = options.loadAISettings ?? (async () => null);
    this.generateStructured = options.generateStructuredData ?? generateStructuredData;
    this.generateSegmentUnderstanding = options.generateSegmentUnderstanding;
    this.rollupService = new RemixOriginalStoryRollupService({
      generateStructuredData: options.generateStructuredData,
    });
  }

  private async generateForSegment(
    settings: AISettings,
    context: RemixSegmentGenerationContext,
  ): Promise<Record<string, unknown>> {
    if (this.generateSegmentUnderstanding) {
      return this.generateSegmentUnderstanding(settings, context);
    }
    return this.generateStructured(
      settings,
      REMIX_SEGMENT_UNDERSTANDING_SYSTEM_PROMPT,
      buildSegmentUserPrompt(context),
      undefined,
      { label: `remix-segment-understanding:${context.segment.id}` },
    );
  }

  async generateSegment(
    projectDir: string,
    document: StoredSourceAssetDocument,
    segmentId: string,
    settings: AISettings,
  ): Promise<RemixSegmentUnderstandingDocument> {
    const segment = document.sourceAsset.segments.find((item) => item.id === segmentId);
    if (!segment) {
      throw new Error(`未找到片段：${segmentId}`);
    }
    const index = document.sourceAsset.segments.findIndex((item) => item.id === segmentId);
    const previous = index > 0 ? document.sourceAsset.segments[index - 1] : undefined;
    const next =
      index >= 0 && index < document.sourceAsset.segments.length - 1
        ? document.sourceAsset.segments[index + 1]
        : undefined;
    const transcript = await readSegmentTranscript(projectDir, segment);
    const generatedAt = new Date().toISOString();
    const payload = await this.generateForSegment(settings, {
      sourceAssetId: document.sourceAsset.id,
      segment,
      transcript,
      neighborSummaries: {
        previous: previous?.title,
        next: next?.title,
      },
    });
    const understanding = normalizeSegmentUnderstandingPayload(payload, {
      segment,
      sourceAssetId: document.sourceAsset.id,
      transcript,
      keyframes: segment.keyframes,
      generatedAt,
    });
    const errors = validateSegmentUnderstandingDocument(understanding);
    if (errors.length > 0) {
      throw new Error(errors[0]);
    }
    return understanding;
  }

  private async writeSegmentUnderstanding(
    projectDir: string,
    sourceAssetId: string,
    segment: SourceSegment,
    understanding: RemixSegmentUnderstandingDocument,
  ): Promise<string> {
    const relPath = getRemixSegmentUnderstandingJsonPath(sourceAssetId, segment.id);
    const absPath = resolveProjectFile(projectDir, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, `${JSON.stringify(understanding, null, 2)}\n`, 'utf8');
    segment.analysisJsonPath = relPath;
    await fs.writeFile(
      resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
      `${JSON.stringify(
        {
          segmentId: segment.id,
          sourceAssetId,
          understandingJsonPath: relPath,
          segmentTranscriptJsonPath: segment.segmentTranscriptJsonPath ?? null,
          keyframeCount: segment.keyframes.length,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    return relPath;
  }

  async run(
    projectDir: string,
    sourceAssetId: string,
    options: { segmentIds?: string[] } = {},
  ): Promise<StoredSourceAssetDocument> {
    return this.runWithProgress(projectDir, sourceAssetId, {
      segmentIds: options.segmentIds,
      concurrency: 1,
    });
  }

  async runWithProgress(
    projectDir: string,
    sourceAssetId: string,
    options: RemixUnderstandingRunWithProgressOptions = {},
  ): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    assertSourceAssetStageReady(document, 'remix_keyframes');

    const settings = await this.loadAISettings();
    if (!settings) {
      throw new Error('未配置 LLM，无法生成片段理解。请在应用设置中配置 AI 后再试。');
    }

    const targetIds =
      options.segmentIds?.length
        ? options.segmentIds
        : document.sourceAsset.segments.map((segment) => segment.id);
    const concurrency = Math.max(1, options.concurrency ?? 1);

    const generated: RemixSegmentUnderstandingDocument[] = [];
    const failures: Array<{ segmentId: string; error: string }> = [];
    let completed = 0;
    const total = targetIds.length;

    await mapWithConcurrency(targetIds, concurrency, async (segmentId) => {
      try {
        const understanding = await this.generateSegment(projectDir, document, segmentId, settings);
        await this.writeSegmentUnderstanding(
          projectDir,
          sourceAssetId,
          document.sourceAsset.segments.find((item) => item.id === segmentId)!,
          understanding,
        );
        generated.push(understanding);
      } catch (error) {
        failures.push({
          segmentId,
          error: error instanceof Error ? error.message : '片段理解失败',
        });
      } finally {
        completed += 1;
        await options.onProgress?.({
          completed,
          total,
          currentSegmentId: segmentId,
          failedSegmentIds: failures.map((item) => item.segmentId),
        });
      }
    });

    if (generated.length === 0) {
      throw new Error(failures[0]?.error ?? '所有片段理解均失败。');
    }

    const overviewMarkdownPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.sourceOverviewMarkdownPath ?? '',
    );
    const segmentAnalysisMarkdownPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.segmentAnalysisMarkdownPath ?? '',
    );
    const overviewJsonPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.sourceOverviewJsonPath ?? '',
    );
    const segmentAnalysisJsonPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.segmentAnalysisJsonPath ?? '',
    );

    await fs.mkdir(path.dirname(overviewMarkdownPath), { recursive: true });
    await fs.mkdir(path.dirname(segmentAnalysisMarkdownPath), { recursive: true });

    const allById = new Map<string, RemixSegmentUnderstandingDocument>();
    for (const item of generated) {
      allById.set(item.segmentId, item);
    }
    for (const segment of document.sourceAsset.segments) {
      if (allById.has(segment.id)) {
        continue;
      }
      const existing = await readExistingSegmentUnderstanding(projectDir, segment);
      if (existing) {
        allById.set(segment.id, existing);
      }
    }

    const orderedDocuments = document.sourceAsset.segments
      .map((segment) => allById.get(segment.id))
      .filter((item): item is RemixSegmentUnderstandingDocument => Boolean(item));
    const orderedGateItems = orderedDocuments.map((doc) => toGateSegmentUnderstandingItem(doc));
    const missingSegmentIds = document.sourceAsset.segments
      .filter((segment) => !allById.has(segment.id))
      .map((segment) => segment.id);
    if (missingSegmentIds.length > 0) {
      failures.push(
        ...missingSegmentIds.map((segmentId) => ({
          segmentId,
          error: '片段理解缺失',
        })),
      );
    }

    const failedSegmentCount = document.sourceAsset.segments.length - orderedDocuments.length + failures.length;
    if (orderedDocuments.length !== document.sourceAsset.segments.length) {
      throw new Error(`片段理解未全部完成：${orderedDocuments.length}/${document.sourceAsset.segments.length}`);
    }

    const generatedAt = new Date().toISOString();
    const segmentAnalysisIndex = orderedDocuments.map((doc) => ({
      ...toGateSegmentUnderstandingItem(doc),
      understandingPath:
        document.sourceAsset.segments.find((segment) => segment.id === doc.segmentId)?.analysisJsonPath ??
        getRemixSegmentUnderstandingJsonPath(sourceAssetId, doc.segmentId),
      title: doc.title,
      generatedAt: doc.generatedAt,
      inputHash: doc.inputHash,
    }));

    await fs.writeFile(
      segmentAnalysisMarkdownPath,
      buildSegmentAnalysisMarkdown(orderedDocuments),
      'utf8',
    );
    await fs.writeFile(
      segmentAnalysisJsonPath,
      `${JSON.stringify(segmentAnalysisIndex, null, 2)}\n`,
      'utf8',
    );

    await writeStoredSourceAsset(projectDir, document);

    return this.rollupService.runStoryRollup(projectDir, sourceAssetId, settings);
  }

  async rerunRollupOnly(projectDir: string, sourceAssetId: string) {
    const settings = await this.loadAISettings();
    if (!settings) {
      throw new Error('未配置或加载 AI 设置失败，无法重新串联故事。请先前往设置配置您的模型。');
    }
    return this.rollupService.runStoryRollup(projectDir, sourceAssetId, settings);
  }
}
