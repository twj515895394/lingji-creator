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
import {
  buildSegmentUnderstandingInputHash,
  type RemixSegmentUnderstandingDocument,
  type RemixChineseVideoPrompt,
} from './remix-segment-understanding-schema';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';
import type { RemixSegmentTranscriptCorrectionDocument } from './remix-transcript-correction-service';
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
  chineseVideoPrompt?: RemixChineseVideoPrompt | null;
  keepElements: string[];
  replaceableElements: string[];
  confidence: number | null;
  understandingPath: string;
  isPlaceholder: boolean;

  transcriptCorrectionText: string;
  transcriptCorrectionStatus: 'raw' | 'edited' | 'confirmed';
  effectiveTranscript: string;
  isStale: boolean;
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
  storyStale: boolean;
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
  const correctionUpdatedTimes: number[] = [];

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

    let transcriptCorrectionText = '';
    let transcriptCorrectionStatus: 'raw' | 'edited' | 'confirmed' = 'raw';
    let effectiveTranscript = transcriptSummary;
    let isStale = false;
    let correctionUpdatedAt = '';

    if (segment.transcriptCorrectionPath?.trim()) {
      const correction = await readJson<RemixSegmentTranscriptCorrectionDocument>(
        resolveProjectFile(projectDir, segment.transcriptCorrectionPath),
      );
      if (correction) {
        transcriptCorrectionText = correction.transcript.correctedText ?? '';
        transcriptCorrectionStatus = correction.transcript.correctionStatus ?? 'raw';
        effectiveTranscript = correction.transcript.effectiveText || transcriptSummary;
        correctionUpdatedAt = correction.updatedAt ?? '';
        if (correctionUpdatedAt && transcriptCorrectionStatus !== 'raw') {
          const t = new Date(correctionUpdatedAt).getTime();
          if (!isNaN(t)) {
            correctionUpdatedTimes.push(t);
          }
        }
      }
    }

    const currentHash = buildSegmentUnderstandingInputHash({
      segment,
      transcript: { plainText: effectiveTranscript } as any,
      keyframes: segment.keyframes,
    });

    if (understanding) {
      const storedHash = understanding.inputHash;
      if (storedHash && storedHash !== currentHash) {
        isStale = true;
      } else if (correctionUpdatedAt && transcriptCorrectionStatus !== 'raw') {
        const correctionTime = new Date(correctionUpdatedAt).getTime();
        const understandingTime = new Date(understanding.generatedAt).getTime();
        if (!isNaN(correctionTime) && !isNaN(understandingTime)) {
          isStale = correctionTime > understandingTime;
        }
      }
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
        transcriptSummary: effectiveTranscript || '（无台词）',
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
        transcriptCorrectionText,
        transcriptCorrectionStatus,
        effectiveTranscript,
        isStale: false,
      });
      continue;
    }

    const fullChinesePrompt = (understanding.videoPrompt as any).fullChinesePrompt || (understanding.videoPrompt as any).positivePrompt || '';
    let chineseVideoPrompt: RemixChineseVideoPrompt | null = null;
    if (understanding.videoPrompt) {
      if ('fullChinesePrompt' in understanding.videoPrompt) {
        chineseVideoPrompt = understanding.videoPrompt;
      } else {
        const v1Prompt = understanding.videoPrompt as any;
        chineseVideoPrompt = {
          language: 'zh-CN',
          fullChinesePrompt: v1Prompt.positivePrompt || '',
          subjectPrompt: '（V1 占位）请参考动作与主体说明',
          scenePrompt: '（V1 占位）请参考场景与道具说明',
          actionPrompt: v1Prompt.motionPrompt || '（V1 占位）请参考动作与表演说明',
          performancePrompt: '（V1 占位）请参考表演与表情说明',
          cameraPrompt: v1Prompt.cameraPrompt || '（V1 占位）请参考机位与运动说明',
          lightingPrompt: '（V1 占位）请参考光照说明',
          colorPrompt: '（V1 占位）请参考色彩说明',
          emotionPrompt: '（V1 占位）请参考情绪说明',
          rhythmPrompt: '（V1 占位）请参考节奏说明',
          dialoguePrompt: v1Prompt.dialoguePrompt || '（V1 占位）请参考台词说明',
          soundPrompt: '（V1 占位）请参考声音说明',
          stylePrompt: '（V1 占位）请参考写实质感与风格说明',
          continuityPrompt: '（V1 占位）请参考前后段落的连续性',
          remixControlPrompt: '（V1 占位）请参考可保留和可替换元素说明',
          negativePrompt: v1Prompt.negativePrompt || '（V1 占位）避免错误画面',
          modelHints: {},
        };
      }
    }

    cards.push({
      segmentId: segment.id,
      segmentIndex: segment.index,
      title: segment.title,
      timeRangeLabel: formatTimeRange(segment.timeRange.startMs, segment.timeRange.endMs),
      thumbnailPath: pickThumbnail(segment),
      transcriptSummary: effectiveTranscript || understanding.audio.speechSummary,
      mainAction: understanding.visual.mainAction,
      shotSummary: `${understanding.camera.shotSize} / ${understanding.camera.movement}`,
      plotFunction: understanding.story.plotFunction,
      speechSummary: understanding.audio.speechSummary,
      positivePrompt: fullChinesePrompt,
      chineseVideoPrompt,
      keepElements: understanding.remix.keepElements,
      replaceableElements: understanding.remix.replaceableElements,
      confidence: understanding.quality.confidence ?? null,
      understandingPath: relPath,
      isPlaceholder: placeholder,
      transcriptCorrectionText,
      transcriptCorrectionStatus,
      effectiveTranscript,
      isStale,
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

  const hasAnySegmentStale = cards.some((card) => card.isStale);
  let storyStale = hasAnySegmentStale;
  if (!storyStale && original?.generatedAt && correctionUpdatedTimes.length > 0) {
    const originalTime = new Date(original.generatedAt).getTime();
    if (!isNaN(originalTime)) {
      const maxCorrectionTime = Math.max(...correctionUpdatedTimes);
      if (maxCorrectionTime > originalTime) {
        storyStale = true;
      }
    }
  }

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
    storyStale,
  };
}
