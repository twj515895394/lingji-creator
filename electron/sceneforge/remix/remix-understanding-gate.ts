import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import type { StoredSourceAssetDocument } from './remix-store';
import { resolveProjectFile } from './remix-validators';

export const REMIX_UNDERSTANDING_PLACEHOLDER_KIND = 'segment_boundary_summary';
export const REMIX_UNDERSTANDING_ROLLUP_KIND = 'source_understanding_rollup';

export interface RemixUnderstandingGateSegmentRef {
  segmentId: string;
  understandingPath: string;
}

export interface RemixUnderstandingGateOverview {
  artifactKind: string;
  sourceAssetId: string;
  segmentCount: number;
  understoodSegmentCount: number;
  failedSegmentCount?: number;
  segmentRefs: RemixUnderstandingGateSegmentRef[];
  overall?: {
    summary?: string;
    storyContent?: string;
    storyArc?: string;
    highValueSegmentIds?: string[];
  };
  quality?: {
    segmentCount?: number;
    understoodSegmentCount?: number;
    failedSegmentCount?: number;
    needsHumanReview?: boolean;
    avgConfidence?: number | null;
  };
  originalUnderstandingPath?: string;
  inputHash?: {
    segments?: string;
    keyframes?: string;
  };
}

export interface RemixUnderstandingGateSegmentItem {
  segmentId: string;
  artifactKind?: string;
  visual?: { mainAction?: string };
  camera?: { shotSize?: string };
  videoPrompt?: string;
}

export interface RemixUnderstandingValidationResult {
  ok: boolean;
  isPlaceholder: boolean;
  isStale: boolean;
  errors: string[];
}

function hashPayload(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildRemixUnderstandingInputFingerprint(document: StoredSourceAssetDocument): {
  segments: string;
  keyframes: string;
} {
  const segments = document.sourceAsset.segments.map((segment) => ({
    id: segment.id,
    index: segment.index,
    startMs: segment.timeRange.startMs,
    endMs: segment.timeRange.endMs,
    boundaryType: segment.boundaryType,
    keyframes: segment.keyframes.map((frame) => ({
      id: frame.id,
      frameRole: frame.frameRole,
      timestampMs: frame.timestampMs,
      imagePath: frame.imagePath,
    })),
  }));

  return {
    segments: hashPayload(segments),
    keyframes: hashPayload(segments.flatMap((segment) => segment.keyframes)),
  };
}

export function isPlaceholderUnderstandingOverview(
  payload: Record<string, unknown> | null,
): boolean {
  if (!payload) {
    return true;
  }
  if (payload.artifactKind === REMIX_UNDERSTANDING_PLACEHOLDER_KIND) {
    return true;
  }
  if (payload.artifactStatus === 'placeholder') {
    return true;
  }
  return !Array.isArray(payload.segmentRefs);
}

export function isPlaceholderSegmentAnalysisItem(item: Record<string, unknown>): boolean {
  if (item.artifactKind === REMIX_UNDERSTANDING_PLACEHOLDER_KIND) {
    return true;
  }
  if (item.artifactStatus === 'placeholder') {
    return true;
  }
  return !item.videoPrompt && !item.visual && !item.camera;
}

function validateSegmentCoverage(
  segments: SourceSegment[],
  segmentItems: RemixUnderstandingGateSegmentItem[],
): string[] {
  const errors: string[] = [];
  const expectedIds = segments.map((segment) => segment.id);
  const actualIds = segmentItems.map((item) => item.segmentId);

  if (segmentItems.length !== segments.length) {
    errors.push(
      `片段理解产物数量不匹配：期望 ${segments.length}，实际 ${segmentItems.length}。`,
    );
  }

  for (const segmentId of expectedIds) {
    if (!actualIds.includes(segmentId)) {
      errors.push(`缺少片段理解产物：${segmentId}`);
    }
  }

  return errors;
}

function validateRollupPayload(
  overview: RemixUnderstandingGateOverview,
  segments: SourceSegment[],
): string[] {
  const errors: string[] = [];

  if (overview.artifactKind !== REMIX_UNDERSTANDING_ROLLUP_KIND) {
    errors.push('全片理解产物不是有效的 rollup schema。');
  }

  if (overview.segmentCount !== segments.length) {
    errors.push(
      `全片理解 segmentCount 不匹配：期望 ${segments.length}，实际 ${overview.segmentCount}。`,
    );
  }

  if (overview.understoodSegmentCount !== segments.length) {
    errors.push(
      `全片理解 understoodSegmentCount 不完整：期望 ${segments.length}，实际 ${overview.understoodSegmentCount}。`,
    );
  }

  if (overview.failedSegmentCount && overview.failedSegmentCount > 0) {
    errors.push(`全片理解存在 ${overview.failedSegmentCount} 个失败片段。`);
  }

  if (!overview.quality || overview.quality.understoodSegmentCount !== segments.length) {
    errors.push('全片理解 quality 计数不完整。');
  }

  if (!overview.overall?.storyContent?.trim() && !overview.overall?.summary?.trim()) {
    errors.push('全片理解缺少 overall 完整故事内容或摘要。');
  }

  if (!overview.originalUnderstandingPath?.trim()) {
    errors.push('全片理解缺少 original_understanding 索引路径。');
  }

  if (!Array.isArray(overview.segmentRefs) || overview.segmentRefs.length !== segments.length) {
    errors.push('全片理解缺少完整的 segmentRefs。');
  }

  return errors;
}

function validateSegmentUnderstandingItems(
  segmentItems: RemixUnderstandingGateSegmentItem[],
): string[] {
  const errors: string[] = [];

  for (const item of segmentItems) {
    if (isPlaceholderSegmentAnalysisItem(item as unknown as Record<string, unknown>)) {
      errors.push(`片段 ${item.segmentId} 仍为占位理解产物。`);
      continue;
    }

    const visualAction = item.visual?.mainAction?.trim();
    const cameraShot = item.camera?.shotSize?.trim();
    const videoPrompt = item.videoPrompt?.trim();

    if (!visualAction || !cameraShot || !videoPrompt) {
      errors.push(`片段 ${item.segmentId} 理解 schema 不完整。`);
    }
  }

  return errors;
}

export function isRemixUnderstandingStale(
  document: StoredSourceAssetDocument,
  overview: RemixUnderstandingGateOverview | null,
): boolean {
  if (!overview?.inputHash) {
    return false;
  }

  const current = buildRemixUnderstandingInputFingerprint(document);
  return (
    overview.inputHash.segments !== current.segments ||
    overview.inputHash.keyframes !== current.keyframes
  );
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function validateRemixUnderstandingArtifacts(
  projectDir: string,
  document: StoredSourceAssetDocument,
): Promise<RemixUnderstandingValidationResult> {
  const errors: string[] = [];
  const overviewPath = document.sourceAsset.sourceOverviewJsonPath;
  const segmentAnalysisPath = document.sourceAsset.segmentAnalysisJsonPath;

  if (!overviewPath?.trim() || !segmentAnalysisPath?.trim()) {
    return {
      ok: false,
      isPlaceholder: true,
      isStale: false,
      errors: ['原片理解产物路径未配置。'],
    };
  }

  const overview = await readJsonFile<Record<string, unknown>>(
    resolveProjectFile(projectDir, overviewPath),
  );
  const segmentAnalysis = await readJsonFile<unknown[]>(
    resolveProjectFile(projectDir, segmentAnalysisPath),
  );

  if (!overview) {
    errors.push('缺少 source_overview.json。');
  }
  if (!segmentAnalysis || !Array.isArray(segmentAnalysis)) {
    errors.push('缺少 segment_analysis.json。');
  }

  const placeholderOverview = isPlaceholderUnderstandingOverview(overview);
  const segmentItems = Array.isArray(segmentAnalysis)
    ? (segmentAnalysis as RemixUnderstandingGateSegmentItem[])
    : [];

  if (placeholderOverview) {
    errors.push('当前原片理解仍为占位汇总，不能视为完成。');
  }

  if (segmentItems.some((item) => isPlaceholderSegmentAnalysisItem(item as unknown as Record<string, unknown>))) {
    errors.push('存在占位型片段理解产物。');
  }

  if (!placeholderOverview && overview) {
    errors.push(
      ...validateRollupPayload(overview as unknown as RemixUnderstandingGateOverview, document.sourceAsset.segments),
    );
  }

  errors.push(...validateSegmentCoverage(document.sourceAsset.segments, segmentItems));
  errors.push(...validateSegmentUnderstandingItems(segmentItems));

  const isStale = overview
    ? isRemixUnderstandingStale(document, overview as unknown as RemixUnderstandingGateOverview)
    : false;
  if (isStale) {
    errors.push('原片理解与当前切片/关键帧输入不一致，需要重新生成。');
  }

  const isPlaceholder = placeholderOverview || segmentItems.length === 0;

  return {
    ok: errors.length === 0,
    isPlaceholder,
    isStale,
    errors,
  };
}

export async function assertRemixUnderstandingReady(
  projectDir: string,
  document: StoredSourceAssetDocument,
): Promise<void> {
  const result = await validateRemixUnderstandingArtifacts(projectDir, document);
  if (!result.ok) {
    throw new Error(result.errors[0] ?? '原片理解产物未通过校验。');
  }
}

export function markRemixUnderstandingStale(
  document: StoredSourceAssetDocument,
): void {
  const current = document.processingStageStates.remix_understanding;
  if (current === 'approved' || current === 'ready_for_review') {
    document.processingStageStates.remix_understanding = 'needs_input';
  }
}
