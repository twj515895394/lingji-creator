import fs from 'node:fs/promises';
import path from 'node:path';
import type { AISettings } from '../../../src/types/ai';
import { generateStructuredData } from '../../../src/lib/llm';
import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentManifestPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixSegmentFrameVisionJsonPath,
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
  buildSegmentUnderstandingInputHash,
  type RemixSegmentUnderstandingDocument,
} from './remix-segment-understanding-schema';
import type { RemixUnderstandingFreshnessReport } from './remix-ipc-types';
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
  frameVision?: import('./remix-frame-vision-service').RemixSegmentFrameVisionDocument | null;
  previousSegmentPrompt?: string | null;
  /** 用户本次重跑时补充的理解提示，一次性、不写入工程 */
  understandingRerunHint?: string | null;
}

export function buildSegmentUserPrompt(context: RemixSegmentGenerationContext): string {
  const {
    segment,
    transcript,
    neighborSummaries,
    frameVision,
    previousSegmentPrompt,
    understandingRerunHint,
  } = context;
  const keyframeLines = segment.keyframes.map(
    (frame) => `- ${frame.frameRole}: ${frame.imagePath} @ ${frame.timestampMs}ms`,
  );

  let visionPromptBlock = '';
  if (frameVision) {
    const hasWarnings = frameVision.quality?.warnings?.some((w) => w.includes('不支持多模态'));
    if (hasWarnings) {
      visionPromptBlock = [
        '【画面视觉不足提示】',
        '当前无法获取关键帧的真实画面先验，请主要根据台词意图与上下文逻辑合理推测并生成符合影视逻辑的二创提示词。',
      ].join('\n');
    } else {
      const frameDescLines = frameVision.frames.map(
        (f) => `* ${f.frameRole}帧(${f.timestampMs}ms): ${f.caption} (环境: ${f.environment}, 构图: ${f.composition})`
      );
      visionPromptBlock = [
        '【画面视觉先验描述】',
        ...frameDescLines,
      ].join('\n');
    }
  } else {
    visionPromptBlock = [
      '// 画面视觉先验未提供',
      '当前无法获取关键帧的真实画面先验，请主要根据台词意图与上下文逻辑合理推测并生成符合影视逻辑的二创提示词。',
    ].join('\n');
  }

  let previousPromptBlock = '';
  if (previousSegmentPrompt?.trim()) {
    previousPromptBlock = [
      '【上一段的视频提示词 (仅供参考时序与画画风格连续性)】',
      previousSegmentPrompt,
      '注意：当前片段的画面提示词生成在核心主体（如人物服装、面部细节）、空间色彩、画面镜头风格上必须与上一段保持连贯一致，避免突变。',
      '',
    ].join('\n');
  }

  return [
    `片段 ID: ${segment.id}`,
    `标题: ${segment.title}`,
    `时间范围: ${segment.timeRange.startMs}ms - ${segment.timeRange.endMs}ms`,
    `边界类型: ${segment.boundaryType}`,
    '',
    previousPromptBlock,
    '关键帧:',
    ...(keyframeLines.length ? keyframeLines : ['- （无关键帧路径）']),
    '',
    visionPromptBlock,
    '',
    '分段台词:',
    transcript?.plainText?.trim() || '（无台词）',
    '',
    '相邻片段摘要:',
    `- 前一段: ${neighborSummaries.previous ?? '无'}`,
    `- 后一段: ${neighborSummaries.next ?? '无'}`,
    '',
    ...(understandingRerunHint?.trim()
      ? ['【用户补充建议】', understandingRerunHint.trim(), '']
      : []),
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
      `- 正向提示词：${segment.videoPrompt.fullChinesePrompt}`,
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
  understandingRerunHint?: string | null;
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

  async getAISettings(): Promise<AISettings | null> {
    return this.loadAISettings();
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
    options: { understandingRerunHint?: string | null } = {},
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
    if (transcript && segment.transcriptCorrectionPath?.trim()) {
      try {
        const correctionAbsPath = resolveProjectFile(projectDir, segment.transcriptCorrectionPath);
        const correctionRaw = await fs.readFile(correctionAbsPath, 'utf8');
        const correction = JSON.parse(correctionRaw);
        if (correction?.transcript?.effectiveText) {
          transcript.plainText = correction.transcript.effectiveText;
        }
      } catch {
        // 读取失败则默默回退 ASR
      }
    }
    const frameVisionPath = resolveProjectFile(
      projectDir,
      getRemixSegmentFrameVisionJsonPath(document.sourceAsset.id, segmentId),
    );
    let frameVision: import('./remix-frame-vision-service').RemixSegmentFrameVisionDocument | null = null;
    try {
      frameVision = JSON.parse(await fs.readFile(frameVisionPath, 'utf8'));
    } catch {
      // 忽略
    }

    let previousSegmentPrompt: string | null = null;
    if (previous) {
      const prevUnderstanding = await readExistingSegmentUnderstanding(projectDir, previous);
      if (prevUnderstanding?.videoPrompt?.fullChinesePrompt) {
        previousSegmentPrompt = prevUnderstanding.videoPrompt.fullChinesePrompt;
      }
    }

    const generatedAt = new Date().toISOString();
    const payload = await this.generateForSegment(settings, {
      sourceAssetId: document.sourceAsset.id,
      segment,
      transcript,
      neighborSummaries: {
        previous: previous?.title,
        next: next?.title,
      },
      frameVision,
      previousSegmentPrompt,
      understandingRerunHint: options.understandingRerunHint ?? null,
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
    options: { segmentIds?: string[]; understandingRerunHint?: string | null } = {},
  ): Promise<StoredSourceAssetDocument> {
    return this.runWithProgress(projectDir, sourceAssetId, {
      segmentIds: options.segmentIds,
      concurrency: 1,
      understandingRerunHint: options.understandingRerunHint,
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

    const rerunHint = options.understandingRerunHint ?? null;

    await mapWithConcurrency(targetIds, concurrency, async (segmentId) => {
      try {
        const understanding = await this.generateSegment(projectDir, document, segmentId, settings, {
          understandingRerunHint: rerunHint,
        });
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

  async validateUnderstandingFreshness(
    projectDir: string,
    sourceAssetId: string,
  ): Promise<RemixUnderstandingFreshnessReport> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const staleSegmentIds: string[] = [];
    const staleReasons = new Set<RemixUnderstandingFreshnessReport['staleReasons'][number]>();
    const segmentReports: RemixUnderstandingFreshnessReport['segmentReports'] = [];

    for (const segment of document.sourceAsset.segments) {
      let effectiveTranscript = '';
      if (segment.segmentTranscriptJsonPath?.trim()) {
        const transcriptDoc = await readSegmentTranscript(projectDir, segment);
        effectiveTranscript = transcriptDoc?.plainText ?? '';
      }
      if (segment.transcriptCorrectionPath?.trim()) {
        try {
          const correctionAbsPath = resolveProjectFile(projectDir, segment.transcriptCorrectionPath);
          const correctionRaw = await fs.readFile(correctionAbsPath, 'utf8');
          const correction = JSON.parse(correctionRaw);
          if (correction?.transcript?.effectiveText) {
            effectiveTranscript = correction.transcript.effectiveText;
          }
        } catch {
          // 读取失败默默忽略
        }
      }

      const currentInputHash = buildSegmentUnderstandingInputHash({
        segment,
        transcript: { plainText: effectiveTranscript } as any,
        keyframes: segment.keyframes,
      });

      const existing = await readExistingSegmentUnderstanding(projectDir, segment);
      let isStale = false;
      const segStaleReasons: string[] = [];
      const previousInputHash = existing?.inputHash ?? null;

      if (!existing) {
        isStale = true;
        segStaleReasons.push('missing_analysis');
        staleReasons.add('missing_analysis');
      } else {
        if (previousInputHash !== currentInputHash) {
          isStale = true;
          segStaleReasons.push('transcript_correction_changed');
          staleReasons.add('transcript_correction_changed');
        } else {
          // 比较 frame vision 更新时间判定过期
          const fvPath = resolveProjectFile(
            projectDir,
            getRemixSegmentFrameVisionJsonPath(document.sourceAsset.id, segment.id),
          );
          try {
            const fvRaw = await fs.readFile(fvPath, 'utf8');
            const fv = JSON.parse(fvRaw);
            if (fv && fv.generatedAt && existing.generatedAt) {
              const fvTime = new Date(fv.generatedAt).getTime();
              const existingTime = new Date(existing.generatedAt).getTime();
              if (!isNaN(fvTime) && !isNaN(existingTime) && fvTime > existingTime) {
                isStale = true;
                segStaleReasons.push('frame_vision_changed');
                staleReasons.add('frame_vision_changed');
              }
            }
          } catch {
            // 忽略
          }
        }
      }

      if (isStale) {
        staleSegmentIds.push(segment.id);
      }

      segmentReports.push({
        segmentId: segment.id,
        isStale,
        staleReasons: segStaleReasons,
        previousInputHash,
        currentInputHash,
      });
    }

    return {
      sourceAssetId,
      isStale: staleSegmentIds.length > 0,
      staleSegmentIds,
      staleReasons: Array.from(staleReasons),
      segmentReports,
      checkedAt: new Date().toISOString(),
    };
  }

  async rerunStaleSegmentUnderstandings(
    projectDir: string,
    sourceAssetId: string,
    options: { useCorrectedTranscript?: boolean } = {},
  ): Promise<StoredSourceAssetDocument> {
    const report = await this.validateUnderstandingFreshness(projectDir, sourceAssetId);
    const targetSegmentIds = report.staleSegmentIds;
    if (targetSegmentIds.length === 0) {
      return readStoredSourceAsset(projectDir, sourceAssetId);
    }
    return this.runWithProgress(projectDir, sourceAssetId, {
      segmentIds: targetSegmentIds,
      concurrency: 1,
    });
  }
}
