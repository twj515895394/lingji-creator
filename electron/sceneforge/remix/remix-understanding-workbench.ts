import fs from 'node:fs/promises';
import path from 'node:path';
import type { SourceAsset } from '../../../src/sceneforge/remix/types';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixSegmentFrameVisionJsonPath,
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
} from './remix-segment-understanding-schema';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';
import type { RemixSegmentTranscriptCorrectionDocument } from './remix-transcript-correction-service';
import { resolveProjectFile } from './remix-validators';

export interface RemixUnderstandingAnnotationPrefill {
  suggestedTags: string[];
  suggestedNote: string;
}

export interface RemixUnderstandingWorkbenchSnapshot {
  ready: boolean;
  version: 2;
  isPlaceholder: boolean;
  isStale: boolean;
  staleSegmentIds: string[];
  staleReasons: string[];
  rollupFallbackUsed: boolean;
  errors: string[];

  overview: {
    logline: string | null;
    storySummaryShort: string | null;
    storyContent: string | null;
    eventChain: string[];
    characterMap: Array<{
      nameOrRole: string;
      description: string;
      relation?: string | null;
    }>;
    mainConflict: string | null;
    emotionCurve: string | null;
    visualStyle: string | null;
    dialogueStyle: string | null;
    remixDirections: Array<{
      title: string;
      idea: string;
      suitableStyle?: string | null;
      risk?: string | null;
    }>;
    warnings: string[];
  };

  segments: Array<{
    segmentId: string;
    segmentIndex: number;
    title: string;
    timeRangeLabel: string;
    thumbnailPath: string | null;

    transcript: {
      asrText: string;
      correctedText: string;
      effectiveText: string;
      correctionStatus: 'raw' | 'edited' | 'confirmed';
    };

    visual: {
      sceneSummary: string;
      mainAction: string;
      characters: string[];
      environmentDetails: string;
      props: string[];
      lighting: string;
      colorTone: string;
    };

    camera: {
      shotSize: string;
      movement: string;
      angle?: string;
      composition?: string;
    };

    story: {
      plotFunction: string;
      event?: string;
      conflict?: string;
      emotion?: string;
      beforeAfterRelation?: string;
    };

    remix: {
      keepElements: string[];
      replaceableElements: string[];
      rewriteIdeas: string[];
      riskNotes: string[];
    };

    videoPrompt: {
      version: 2;
      fullChinesePrompt: string;
      dimensions: Array<{
        key: string;
        label: string;
        text: string;
      }>;
      negativePrompt: string;
    };

    frameVision: {
      available: boolean;
      segmentVisualSummary: string | null;
      warnings: string[];
    };

    quality: {
      confidence: number | null;
      needsHumanReview: boolean;
      warnings: string[];
    };

    isStale: boolean;
    staleReasons: string[];
    understandingPath: string;
    isPlaceholder: boolean;
  }>;

  annotationPrefill: RemixUnderstandingAnnotationPrefill | null;
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
  segments: RemixUnderstandingWorkbenchSnapshot['segments'],
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
      segments
        .flatMap((seg) => [...seg.remix.keepElements, ...seg.remix.replaceableElements])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);
  const lines = segments.map((seg) => {
    const keep = seg.remix.keepElements.length ? seg.remix.keepElements.join('、') : '（待补）';
    const replace = seg.remix.replaceableElements.length ? seg.remix.replaceableElements.join('、') : '（待补）';
    return `${seg.title}：保留 ${keep}；可替换 ${replace}。动作：${seg.visual.mainAction}`;
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
  const warnings: string[] = [];
  
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

  const cards: RemixUnderstandingWorkbenchSnapshot['segments'] = [];
  const staleSegmentIds: string[] = [];
  const staleReasonsSet = new Set<string>();

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
    const segStaleReasons: string[] = [];
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
      }
    }

    // 1. 台词及关键帧过期判定
    const currentHash = buildSegmentUnderstandingInputHash({
      segment,
      transcript: { plainText: effectiveTranscript } as any,
      keyframes: segment.keyframes,
    });

    if (understanding) {
      const storedHash = understanding.inputHash;
      if (storedHash && storedHash !== currentHash) {
        isStale = true;
        segStaleReasons.push('transcript_correction_changed');
        staleReasonsSet.add('transcript_correction_changed');
      }
    }

    // 2. 视觉抽取文件更新过期判定
    const fvPath = resolveProjectFile(projectDir, getRemixSegmentFrameVisionJsonPath(asset.id, segment.id));
    let frameVisionAvailable = false;
    let segmentVisualSummary: string | null = null;
    let frameVisionWarnings: string[] = [];

    try {
      const fv = await readJson<any>(fvPath);
      if (fv) {
        frameVisionAvailable = true;
        segmentVisualSummary = fv.segmentVisualSummary || null;
        frameVisionWarnings = fv.quality?.warnings || [];

        if (understanding?.generatedAt && fv.generatedAt) {
          const fvTime = new Date(fv.generatedAt).getTime();
          const understandingTime = new Date(understanding.generatedAt).getTime();
          if (!isNaN(fvTime) && !isNaN(understandingTime) && fvTime > understandingTime) {
            isStale = true;
            segStaleReasons.push('frame_vision_changed');
            staleReasonsSet.add('frame_vision_changed');
          }
        }
      }
    } catch {
      // 忽略
    }

    if (isStale) {
      staleSegmentIds.push(segment.id);
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
        transcript: {
          asrText: transcriptSummary,
          correctedText: transcriptCorrectionText,
          effectiveText: effectiveTranscript,
          correctionStatus: transcriptCorrectionStatus,
        },
        visual: {
          sceneSummary: '待生成',
          mainAction: '待生成',
          characters: [],
          environmentDetails: '待生成',
          props: [],
          lighting: '待生成',
          colorTone: '待生成',
        },
        camera: {
          shotSize: '待生成',
          movement: '待生成',
        },
        story: {
          plotFunction: '待生成',
        },
        remix: {
          keepElements: [],
          replaceableElements: [],
          rewriteIdeas: [],
          riskNotes: [],
        },
        videoPrompt: {
          version: 2,
          fullChinesePrompt: '',
          dimensions: [],
          negativePrompt: '',
        },
        frameVision: {
          available: frameVisionAvailable,
          segmentVisualSummary,
          warnings: frameVisionWarnings,
        },
        quality: {
          confidence: null,
          needsHumanReview: true,
          warnings: ['缺少片段分析，需重新理解'],
        },
        isStale: false,
        staleReasons: [],
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
      transcript: {
        asrText: transcriptSummary,
        correctedText: transcriptCorrectionText,
        effectiveText: effectiveTranscript,
        correctionStatus: transcriptCorrectionStatus,
      },
      visual: {
        sceneSummary: understanding.visual?.sceneSummary || '',
        mainAction: understanding.visual?.mainAction || '',
        characters: understanding.visual?.characters || [],
        environmentDetails: understanding.visual?.environmentDetails || '',
        props: [],
        lighting: understanding.visual?.lighting || '',
        colorTone: understanding.visual?.colorTone || '',
      },
      camera: {
        shotSize: understanding.camera?.shotSize || '',
        movement: understanding.camera?.movement || '',
        angle: understanding.camera?.angle,
        composition: understanding.camera?.composition,
      },
      story: {
        plotFunction: understanding.story?.plotFunction || '',
        event: (understanding.story as any)?.event,
        conflict: understanding.story?.conflict,
        emotion: understanding.story?.emotion,
        beforeAfterRelation: understanding.story?.beforeAfterRelation,
      },
      remix: {
        keepElements: understanding.remix?.keepElements || (understanding.remix as any)?.keepPoints || [],
        replaceableElements: understanding.remix?.replaceableElements || (understanding.remix as any)?.replacePoints || [],
        rewriteIdeas: understanding.remix?.rewriteIdeas || [],
        riskNotes: understanding.remix?.riskNotes || [],
      },
      videoPrompt: {
        version: 2,
        fullChinesePrompt: understanding.videoPrompt?.fullChinesePrompt || (understanding.videoPrompt as any)?.positivePrompt || '',
        dimensions: (understanding.videoPrompt as any)?.dimensions || [],
        negativePrompt: understanding.videoPrompt?.negativePrompt || '',
      },
      frameVision: {
        available: frameVisionAvailable,
        segmentVisualSummary,
        warnings: frameVisionWarnings,
      },
      quality: {
        confidence: understanding.quality?.confidence ?? null,
        needsHumanReview: understanding.quality?.needsHumanReview ?? false,
        warnings: understanding.quality?.warnings || [],
      },
      isStale,
      staleReasons: segStaleReasons,
      understandingPath: relPath,
      isPlaceholder: placeholder,
    });
  }

  const understoodSegmentCount = cards.filter((card) => !card.isPlaceholder).length;
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
    const originalWarnings = (original.quality as any).warnings;
    if (Array.isArray(originalWarnings)) {
      warnings.push(...originalWarnings);
    }
  }

  // 3. 全片故事汇总与过期联动检测
  const hasAnySegmentStale = cards.some((card) => card.isStale);
  let isOverviewStale = hasAnySegmentStale;
  if (!isOverviewStale && original?.generatedAt) {
    const originalTime = new Date(original.generatedAt).getTime();
    if (!isNaN(originalTime)) {
      // 检查是否有任何纠错的更新时间比 rollup 更加晚
      for (const segment of asset.segments) {
        if (segment.transcriptCorrectionPath?.trim()) {
          try {
            const corrPath = resolveProjectFile(projectDir, segment.transcriptCorrectionPath);
            const stats = await fs.stat(corrPath);
            if (stats.mtimeMs > originalTime) {
              isOverviewStale = true;
              break;
            }
          } catch {
            // 忽略
          }
        }
      }
    }
  }

  const suggestedTags = original?.remixStrategy?.suggestedTags || [];
  
  return {
    ready: understoodSegmentCount === asset.segments.length && !isPlaceholderUnderstandingOverview(overview),
    version: 2,
    isPlaceholder,
    isStale: isOverviewStale,
    staleSegmentIds,
    staleReasons: Array.from(staleReasonsSet),
    rollupFallbackUsed,
    errors,
    overview: {
      logline: original?.overall?.logline || null,
      storySummaryShort: original?.overall?.storySummaryShort || null,
      storyContent: rollupFallbackUsed ? null : (original?.overall?.storyContent || null),
      eventChain: original?.overall?.eventChain || [],
      characterMap: original?.overall?.characterMap || [],
      mainConflict: original?.overall?.mainConflict || null,
      emotionCurve: original?.overall?.emotionCurve || null,
      visualStyle: original?.overall?.visualStyle || null,
      dialogueStyle: original?.overall?.dialogueStyle || null,
      remixDirections: (original?.remixStrategy?.rewriteDirections || []).map((d) => ({
        title: d.title,
        idea: d.idea,
        suitableStyle: d.suitableStyle,
        risk: d.risk,
      })),
      warnings,
    },
    segments: cards,
    annotationPrefill: buildAnnotationPrefillFromUnderstanding(asset, cards.filter((c) => !c.isPlaceholder)),
  };
}
