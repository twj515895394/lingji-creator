import type { StoredSourceAssetDocument } from './remix-store';
import {
  getRemixSegmentManifestIndexPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixSourceManifestPath,
  getRemixSourceTranscriptJsonPath,
} from './remix-artifact-paths';
import { REMIX_UNDERSTANDING_ROLLUP_KIND } from './remix-understanding-gate';
import type { RemixSegmentUnderstandingDocument } from './remix-segment-understanding-schema';

export const REMIX_ORIGINAL_UNDERSTANDING_SCHEMA = 'sceneforge-remix-original-understanding' as const;
export const REMIX_ORIGINAL_UNDERSTANDING_VERSION = 1 as const;

export interface RemixOriginalUnderstandingDocument {
  schema: typeof REMIX_ORIGINAL_UNDERSTANDING_SCHEMA;
  version: typeof REMIX_ORIGINAL_UNDERSTANDING_VERSION;
  sourceAssetId: string;
  title: string;
  generatedAt: string;
  inputRefs: {
    sourceManifestPath: string;
    segmentsIndexPath: string;
    sourceTranscriptPath: string | null;
    sourceOverviewPath: string;
    segmentAnalysisPath: string;
  };
  overall: {
    summary: string;
    storyArc: string;
    visualStyle: string;
    mainConflict: string;
    emotionCurve: string;
    remixPotential: string[];
    highValueSegmentIds: string[];
  };
  segmentRefs: Array<{
    segmentId: string;
    segmentIndex: number;
    title: string;
    understandingPath: string;
    plotFunction: string;
    mainAction: string;
    confidence: number | null;
  }>;
  quality: {
    segmentCount: number;
    understoodSegmentCount: number;
    failedSegmentCount: number;
    needsHumanReview: boolean;
    avgConfidence: number | null;
  };
}

export interface RemixSourceOverviewIndexDocument {
  artifactKind: typeof REMIX_UNDERSTANDING_ROLLUP_KIND;
  schema: typeof REMIX_ORIGINAL_UNDERSTANDING_SCHEMA;
  version: typeof REMIX_ORIGINAL_UNDERSTANDING_VERSION;
  sourceAssetId: string;
  title: string;
  generatedAt: string;
  originalUnderstandingPath: string;
  segmentCount: number;
  understoodSegmentCount: number;
  failedSegmentCount: number;
  segmentRefs: Array<{ segmentId: string; understandingPath: string }>;
  overall: RemixOriginalUnderstandingDocument['overall'];
  quality: RemixOriginalUnderstandingDocument['quality'];
  inputHash: {
    segments: string;
    keyframes: string;
  };
  partialFailures: Array<{ segmentId: string; error: string }>;
}

function averageConfidence(documents: RemixSegmentUnderstandingDocument[]): number | null {
  const values = documents
    .map((doc) => doc.quality.confidence)
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickHighValueSegmentIds(documents: RemixSegmentUnderstandingDocument[]): string[] {
  return [...documents]
    .sort((left, right) => (right.quality.confidence ?? 0) - (left.quality.confidence ?? 0))
    .slice(0, Math.min(5, documents.length))
    .map((doc) => doc.segmentId);
}

export function buildOriginalUnderstandingDocument(input: {
  document: StoredSourceAssetDocument;
  segmentDocuments: RemixSegmentUnderstandingDocument[];
  generatedAt: string;
  failedSegmentCount: number;
  sourceOverviewPath: string;
  segmentAnalysisPath: string;
  overallSummary?: string;
  remixIdeas?: string[];
}): RemixOriginalUnderstandingDocument {
  const { document, segmentDocuments, generatedAt, failedSegmentCount, overallSummary, remixIdeas } = input;
  const segmentCount = document.sourceAsset.segments.length;
  const understoodSegmentCount = segmentDocuments.length;
  const plotFunctions = segmentDocuments.map((doc) => doc.story.plotFunction).filter(Boolean);
  const emotions = segmentDocuments.map((doc) => doc.story.emotion).filter(Boolean);
  const remixIdeasFallback = segmentDocuments.flatMap((doc) => doc.remix.rewriteIdeas).slice(0, 6);
  const visualStyles = segmentDocuments.map((doc) => doc.visual.colorTone).filter(Boolean);

  return {
    schema: REMIX_ORIGINAL_UNDERSTANDING_SCHEMA,
    version: REMIX_ORIGINAL_UNDERSTANDING_VERSION,
    sourceAssetId: document.sourceAsset.id,
    title: document.sourceAsset.title,
    generatedAt,
    inputRefs: {
      sourceManifestPath: getRemixSourceManifestPath(document.sourceAsset.id),
      segmentsIndexPath: getRemixSegmentManifestIndexPath(document.sourceAsset.id),
      sourceTranscriptPath: document.sourceAsset.transcriptPath ?? null,
      sourceOverviewPath: input.sourceOverviewPath,
      segmentAnalysisPath: input.segmentAnalysisPath,
    },
    overall: {
      summary: overallSummary ?? `《${document.sourceAsset.title}》共 ${segmentCount} 段，已完成 ${understoodSegmentCount} 段结构化理解。`,
      storyArc: plotFunctions.length ? plotFunctions.join(' → ') : '待人工补充全片剧情线。',
      visualStyle: visualStyles.length ? [...new Set(visualStyles)].join('、') : '写实中性影像风格。',
      mainConflict: segmentDocuments.map((doc) => doc.story.conflict).find(Boolean) ?? '轻度戏剧张力',
      emotionCurve: emotions.length ? emotions.join(' → ') : '情绪平稳推进',
      remixPotential: remixIdeas ?? (remixIdeasFallback.length ? remixIdeasFallback : ['保留人物反应镜头', '替换台词做场景改写']),
      highValueSegmentIds: pickHighValueSegmentIds(segmentDocuments),
    },
    segmentRefs: document.sourceAsset.segments
      .map((segment) => {
        const doc = segmentDocuments.find((item) => item.segmentId === segment.id);
        if (!doc) {
          return null;
        }
        return {
          segmentId: segment.id,
          segmentIndex: segment.index,
          title: segment.title,
          understandingPath:
            segment.analysisJsonPath ??
            getRemixSegmentUnderstandingJsonPath(document.sourceAsset.id, segment.id),
          plotFunction: doc.story.plotFunction,
          mainAction: doc.visual.mainAction,
          confidence: doc.quality.confidence ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    quality: {
      segmentCount,
      understoodSegmentCount,
      failedSegmentCount,
      needsHumanReview: true,
      avgConfidence: averageConfidence(segmentDocuments),
    },
  };
}

export function buildSourceOverviewIndexDocument(input: {
  original: RemixOriginalUnderstandingDocument;
  originalUnderstandingPath: string;
  inputHash: { segments: string; keyframes: string };
  partialFailures: Array<{ segmentId: string; error: string }>;
}): RemixSourceOverviewIndexDocument {
  const { original, originalUnderstandingPath, inputHash, partialFailures } = input;
  return {
    artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
    schema: REMIX_ORIGINAL_UNDERSTANDING_SCHEMA,
    version: REMIX_ORIGINAL_UNDERSTANDING_VERSION,
    sourceAssetId: original.sourceAssetId,
    title: original.title,
    generatedAt: original.generatedAt,
    originalUnderstandingPath,
    segmentCount: original.quality.segmentCount,
    understoodSegmentCount: original.quality.understoodSegmentCount,
    failedSegmentCount: original.quality.failedSegmentCount,
    segmentRefs: original.segmentRefs.map((ref) => ({
      segmentId: ref.segmentId,
      understandingPath: ref.understandingPath,
    })),
    overall: original.overall,
    quality: original.quality,
    inputHash,
    partialFailures,
  };
}

export function buildOriginalUnderstandingSummaryMarkdown(
  original: RemixOriginalUnderstandingDocument,
): string {
  return [
    '# Original Understanding Summary',
    '',
    `- 标题：${original.title}`,
    `- 片段：${original.quality.understoodSegmentCount}/${original.quality.segmentCount}`,
    '',
    '## 故事内容',
    original.overall.summary,
    '',
    '## 二创方向',
    ...original.overall.remixPotential.map((item) => `- ${item}`),
  ].join('\n');
}
