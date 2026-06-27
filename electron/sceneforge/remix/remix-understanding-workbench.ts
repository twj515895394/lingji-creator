import fs from 'node:fs/promises';
import path from 'node:path';
import type { SourceAsset } from '../../../src/sceneforge/remix/types';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
} from './remix-artifact-paths';
import {
  isPlaceholderSegmentAnalysisItem,
  isPlaceholderUnderstandingOverview,
  type RemixUnderstandingGateSegmentItem,
} from './remix-understanding-gate';
import type { RemixOriginalUnderstandingDocument } from './remix-source-understanding-rollup';
import type { RemixSegmentUnderstandingDocument } from './remix-segment-understanding-schema';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';
import { resolveProjectFile } from './remix-validators';

export interface RemixUnderstandingWorkbenchSegmentCard {
  segmentId: string;
  segmentIndex: number;
  title: string;
  timeRangeLabel: string;
  thumbnailPath: string | null;
  transcriptSummary: string;
  mainAction: string;
  shotSummary: string;
  plotFunction: string;
  speechSummary: string;
  positivePrompt: string;
  keepElements: string[];
  replaceableElements: string[];
  confidence: number | null;
  understandingPath: string;
  isPlaceholder: boolean;
}

export interface RemixUnderstandingAnnotationPrefill {
  suggestedTags: string[];
  suggestedNote: string;
}

export interface RemixUnderstandingWorkbenchSnapshot {
  ready: boolean;
  isPlaceholder: boolean;
  errors: string[];
  overviewSummary: string | null;
  storyArc: string | null;
  emotionCurve: string | null;
  remixPotential: string[];
  highValueSegmentIds: string[];
  understoodSegmentCount: number;
  segmentCount: number;
  segments: RemixUnderstandingWorkbenchSegmentCard[];
  annotationPrefill: RemixUnderstandingAnnotationPrefill | null;
  rollupFallbackUsed: boolean;
}

async function readJson<T>(absPath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(absPath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function formatTimeRange(startMs: number, endMs: number): string {
  const format = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  return `${format(startMs)} - ${format(endMs)}`;
}

function pickThumbnail(segment: SourceAsset['segments'][number]): string | null {
  const preferred = segment.keyframes.find((frame) => frame.frameRole === 'middle') ?? segment.keyframes[0];
  return preferred?.imagePath ?? null;
}

export function buildAnnotationPrefillFromUnderstanding(
  asset: SourceAsset,
  segmentCards: RemixUnderstandingWorkbenchSegmentCard[],
): RemixUnderstandingAnnotationPrefill | null {
  const hasSavedAnnotation =
    (asset.tags?.length ?? 0) > 0 ||
    Boolean(asset.annotationNote?.trim()) ||
    Boolean(asset.lastAnnotatedAt?.trim());
  if (hasSavedAnnotation) {
    return null;
  }
  const suggestedTags = Array.from(
    new Set(
      segmentCards
        .flatMap((card) => [...card.keepElements, ...card.replaceableElements])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);
  const lines = segmentCards.map((card) => {
    const keep = card.keepElements.length ? card.keepElements.join('、') : '（待补）';
    const replace = card.replaceableElements.length ? card.replaceableElements.join('、') : '（待补）';
    return `${card.title}：保留 ${keep}；可替换 ${replace}。动作：${card.mainAction}`;
  });
  return {
    suggestedTags,
    suggestedNote: ['【AI 预填，请按真实观感修正】', ...lines].join('\n'),
  };
}

export async function loadRemixUnderstandingWorkbench(
  projectDir: string,
  asset: SourceAsset,
): Promise<RemixUnderstandingWorkbenchSnapshot> {
  const errors: string[] = [];
  const overviewPath = asset.sourceOverviewJsonPath?.trim();
  const overview = overviewPath
    ? await readJson<Record<string, unknown>>(resolveProjectFile(projectDir, overviewPath))
    : null;

  if (!overview) {
    errors.push('尚未生成 source_overview.json');
  } else if (isPlaceholderUnderstandingOverview(overview)) {
    errors.push('原片理解仍为占位汇总');
  }

  const originalRel =
    (typeof overview?.originalUnderstandingPath === 'string' && overview.originalUnderstandingPath) ||
    getRemixOriginalUnderstandingJsonPath(asset.id);
  const original = await readJson<RemixOriginalUnderstandingDocument>(
    resolveProjectFile(projectDir, originalRel),
  );

  const segmentAnalysisPath = asset.segmentAnalysisJsonPath?.trim();
  const segmentAnalysis = segmentAnalysisPath
    ? await readJson<unknown[]>(resolveProjectFile(projectDir, segmentAnalysisPath))
    : null;
  const gateItems = Array.isArray(segmentAnalysis)
    ? (segmentAnalysis as RemixUnderstandingGateSegmentItem[])
    : [];

  const cards: RemixUnderstandingWorkbenchSegmentCard[] = [];
  for (const segment of asset.segments) {
    const relPath =
      segment.analysisJsonPath?.trim() ||
      getRemixSegmentUnderstandingJsonPath(asset.id, segment.id);
    const understanding = await readJson<RemixSegmentUnderstandingDocument>(
      resolveProjectFile(projectDir, relPath),
    );
    let transcriptSummary = '';
    if (segment.segmentTranscriptJsonPath?.trim()) {
      const transcript = await readJson<RemixSegmentTranscriptDocument>(
        resolveProjectFile(projectDir, segment.segmentTranscriptJsonPath),
      );
      transcriptSummary = transcript?.plainText?.trim() ?? '';
    }

    const gateItem = gateItems.find((item) => item.segmentId === segment.id) ?? null;
    const placeholder =
      !understanding ||
      (gateItem ? isPlaceholderSegmentAnalysisItem(gateItem as unknown as Record<string, unknown>) : false);

    if (!understanding) {
      errors.push(`缺少片段理解：${segment.id}`);
      cards.push({
        segmentId: segment.id,
        segmentIndex: segment.index,
        title: segment.title,
        timeRangeLabel: formatTimeRange(segment.timeRange.startMs, segment.timeRange.endMs),
        thumbnailPath: pickThumbnail(segment),
        transcriptSummary: transcriptSummary || '（无台词）',
        mainAction: '待生成',
        shotSummary: '待生成',
        plotFunction: '待生成',
        speechSummary: '待生成',
        positivePrompt: '',
        keepElements: [],
        replaceableElements: [],
        confidence: null,
        understandingPath: relPath,
        isPlaceholder: true,
      });
      continue;
    }

    cards.push({
      segmentId: segment.id,
      segmentIndex: segment.index,
      title: segment.title,
      timeRangeLabel: formatTimeRange(segment.timeRange.startMs, segment.timeRange.endMs),
      thumbnailPath: pickThumbnail(segment),
      transcriptSummary: transcriptSummary || understanding.audio.speechSummary,
      mainAction: understanding.visual.mainAction,
      shotSummary: `${understanding.camera.shotSize} / ${understanding.camera.movement}`,
      plotFunction: understanding.story.plotFunction,
      speechSummary: understanding.audio.speechSummary,
      positivePrompt: understanding.videoPrompt.positivePrompt,
      keepElements: understanding.remix.keepElements,
      replaceableElements: understanding.remix.replaceableElements,
      confidence: understanding.quality.confidence ?? null,
      understandingPath: relPath,
      isPlaceholder: placeholder,
    });
  }

  const understoodSegmentCount = cards.filter((card) => !card.isPlaceholder && card.positivePrompt).length;
  const isPlaceholder = Boolean(
    !overview ||
      isPlaceholderUnderstandingOverview(overview) ||
      understoodSegmentCount !== asset.segments.length,
  );

  const rollupFallbackUsed = original?.quality && typeof original.quality === 'object'
    ? Boolean((original.quality as any).rollupFallbackUsed)
    : false;

  if (original?.quality && typeof original.quality === 'object') {
    const originalErrors = (original.quality as any).errors;
    if (Array.isArray(originalErrors)) {
      errors.push(...originalErrors);
    }
  }

  const rawStoryContent = original
    ? ((original.overall as any).storyContent ?? original.overall.summary ?? null)
    : (overview && typeof overview.overall === 'object' && overview.overall !== null
      ? String((overview.overall as any).storyContent ?? (overview.overall as any).summary ?? '').trim() || null
      : null);

  const overviewSummary = rollupFallbackUsed ? '' : rawStoryContent;

  return {
    ready: understoodSegmentCount === asset.segments.length && !isPlaceholderUnderstandingOverview(overview),
    isPlaceholder,
    errors,
    overviewSummary,
    storyArc: original?.overall.storyArc ?? null,
    emotionCurve: original?.overall.emotionCurve ?? null,
    remixPotential: original?.overall.remixPotential ?? [],
    highValueSegmentIds: original?.overall.highValueSegmentIds ?? [],
    understoodSegmentCount,
    segmentCount: asset.segments.length,
    segments: cards,
    annotationPrefill: buildAnnotationPrefillFromUnderstanding(asset, cards.filter((c) => !c.isPlaceholder)),
    rollupFallbackUsed,
  };
}
