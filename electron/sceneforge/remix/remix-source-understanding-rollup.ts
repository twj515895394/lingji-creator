import type { StoredSourceAssetDocument } from './remix-store';
import {
  getRemixSegmentManifestIndexPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixSourceManifestPath,
} from './remix-artifact-paths';
import { REMIX_UNDERSTANDING_ROLLUP_KIND } from './remix-understanding-gate';
import type { RemixSegmentUnderstandingDocument } from './remix-segment-understanding-schema';

export const REMIX_ORIGINAL_UNDERSTANDING_SCHEMA = 'sceneforge-remix-original-understanding' as const;
export const REMIX_ORIGINAL_UNDERSTANDING_VERSION = 2 as const;

export interface RemixOriginalUnderstandingDocument {
  schema: typeof REMIX_ORIGINAL_UNDERSTANDING_SCHEMA;
  version: typeof REMIX_ORIGINAL_UNDERSTANDING_VERSION;
  sourceAssetId: string;
  title: string;
  generatedAt: string;
  inputHash: string;
  inputRefs: {
    sourceManifestPath: string;
    segmentsIndexPath: string;
    sourceTranscriptPath: string | null;
    sourceOverviewPath: string;
    segmentAnalysisPath: string;
  };
  overall: {
    logline: string;
    storySummaryShort: string;
    storyContent: string;
    eventChain: string[];
    characterMap: Array<{
      nameOrRole: string;
      description: string;
      relation?: string | null;
    }>;
    mainConflict: string;
    keyTurns: string[];
    emotionCurve: string;
    visualStyle: string;
    dialogueStyle: string;
    highValueSegmentIds: string[];
  };
  remixStrategy: {
    keepMust: string[];
    canReplace: string[];
    rewriteDirections: Array<{
      title: string;
      idea: string;
      suitableStyle: string;
      requiredSegments: string[];
      risk: string;
    }>;
    suggestedTags: string[];
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
    rollupConfidence: number;
    avgSegmentConfidence: number | null;
    needsHumanReview: boolean;
    rollupFallbackUsed: boolean;
    errors: string[];
    warnings: string[];
    staleReasons: string[];
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
  remixStrategy: RemixOriginalUnderstandingDocument['remixStrategy'];
  quality: RemixOriginalUnderstandingDocument['quality'];
  inputHash: {
    segments: string;
    keyframes: string;
  };
  partialFailures: Array<{ segmentId: string; error: string }>;
}

function averageConfidence(documents: RemixSegmentUnderstandingDocument[]): number | null {
  const values = documents
    .map((doc) => doc.quality?.confidence)
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickHighValueSegmentIds(documents: RemixSegmentUnderstandingDocument[]): string[] {
  return [...documents]
    .sort((left, right) => (right.quality?.confidence ?? 0) - (left.quality?.confidence ?? 0))
    .slice(0, Math.min(5, documents.length))
    .map((doc) => doc.segmentId);
}

export function buildOriginalUnderstandingDocument(input: {
  document: StoredSourceAssetDocument;
  segmentDocuments: RemixSegmentUnderstandingDocument[];
  generatedAt: string;
  inputHash: string;
  failedSegmentCount: number;
  sourceOverviewPath: string;
  segmentAnalysisPath: string;
  
  // overall 字段
  logline?: string;
  storySummaryShort?: string;
  storyContent?: string;
  eventChain?: string[];
  characterMap?: Array<{ nameOrRole: string; description: string; relation?: string | null }>;
  mainConflict?: string;
  keyTurns?: string[];
  emotionCurve?: string;
  visualStyle?: string;
  dialogueStyle?: string;
  
  // remixStrategy 字段
  keepMust?: string[];
  canReplace?: string[];
  rewriteDirections?: Array<{
    title: string;
    idea: string;
    suitableStyle: string;
    requiredSegments: string[];
    risk: string;
  }>;
  suggestedTags?: string[];

  rollupFallbackUsed?: boolean;
  errors?: string[];
  warnings?: string[];
  staleReasons?: string[];
}): RemixOriginalUnderstandingDocument {
  const { document, segmentDocuments, generatedAt, inputHash, failedSegmentCount } = input;
  const segmentCount = document.sourceAsset.segments.length;
  const understoodSegmentCount = segmentDocuments.length;
  const fallbackUsed = input.rollupFallbackUsed ?? false;

  // 兜底推导字段，以防大模型报错或返回空
  const plotFunctions = segmentDocuments.map((doc) => doc.story?.plotFunction).filter(Boolean);
  const emotions = segmentDocuments.map((doc) => doc.story?.emotion).filter(Boolean);
  const visualStyles = segmentDocuments.map((doc) => doc.visual?.colorTone).filter(Boolean);

  const avgConf = averageConfidence(segmentDocuments);

  return {
    schema: REMIX_ORIGINAL_UNDERSTANDING_SCHEMA,
    version: REMIX_ORIGINAL_UNDERSTANDING_VERSION,
    sourceAssetId: document.sourceAsset.id,
    title: document.sourceAsset.title,
    generatedAt,
    inputHash,
    inputRefs: {
      sourceManifestPath: getRemixSourceManifestPath(document.sourceAsset.id),
      segmentsIndexPath: getRemixSegmentManifestIndexPath(document.sourceAsset.id),
      sourceTranscriptPath: document.sourceAsset.transcriptPath ?? null,
      sourceOverviewPath: input.sourceOverviewPath,
      segmentAnalysisPath: input.segmentAnalysisPath,
    },
    overall: {
      logline: input.logline ?? '',
      storySummaryShort: fallbackUsed ? '' : (input.storySummaryShort ?? ''),
      storyContent: fallbackUsed ? '' : (input.storyContent ?? ''),
      eventChain: input.eventChain ?? [],
      characterMap: input.characterMap ?? [],
      mainConflict: input.mainConflict ?? (segmentDocuments.map((doc) => doc.story?.conflict).find(Boolean) ?? '轻度戏剧张力'),
      keyTurns: input.keyTurns ?? [],
      emotionCurve: input.emotionCurve ?? (emotions.length ? emotions.join(' → ') : '情绪平稳推进'),
      visualStyle: input.visualStyle ?? (visualStyles.length ? [...new Set(visualStyles)].join('、') : '写实中性影像风格'),
      dialogueStyle: input.dialogueStyle ?? '日常口语风格',
      highValueSegmentIds: pickHighValueSegmentIds(segmentDocuments),
    },
    remixStrategy: {
      keepMust: input.keepMust ?? [],
      canReplace: input.canReplace ?? [],
      rewriteDirections: input.rewriteDirections ?? [],
      suggestedTags: input.suggestedTags ?? [],
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
          plotFunction: doc.story?.plotFunction || '',
          mainAction: doc.visual?.mainAction || '',
          confidence: doc.quality?.confidence ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    quality: {
      segmentCount,
      understoodSegmentCount,
      failedSegmentCount,
      rollupConfidence: fallbackUsed ? 0.3 : 0.85,
      avgSegmentConfidence: avgConf,
      needsHumanReview: true,
      rollupFallbackUsed: fallbackUsed,
      errors: input.errors ?? [],
      warnings: input.warnings ?? [],
      staleReasons: input.staleReasons ?? [],
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
    remixStrategy: original.remixStrategy,
    quality: original.quality,
    inputHash,
    partialFailures,
  };
}

export function buildOriginalUnderstandingSummaryMarkdown(
  original: RemixOriginalUnderstandingDocument,
): string {
  const characterLines = original.overall.characterMap.map(
    (c) => `- **${c.nameOrRole}**：${c.description}${c.relation ? ` (冲突关系: ${c.relation})` : ''}`,
  );
  
  const eventLines = original.overall.eventChain.map(
    (e, idx) => `${idx + 1}. ${e}`,
  );

  const directionLines = original.remixStrategy.rewriteDirections.map(
    (d) => `### 方向：${d.title}\n- **构想**：${d.idea}\n- **风格建议**：${d.suitableStyle}\n- **风险点**：${d.risk}`,
  );

  return [
    '# Original Understanding Summary',
    '',
    `- 标题：${original.title}`,
    `- 片段：${original.quality.understoodSegmentCount}/${original.quality.segmentCount}`,
    '',
    '## 故事一句话梗概 (Logline)',
    original.overall.logline || '（无）',
    '',
    '## 全片故事内容 (完整解说)',
    original.overall.storyContent || '（无）',
    '',
    '## 故事短摘要',
    original.overall.storySummaryShort || '（无）',
    '',
    '## 事件链',
    eventLines.length ? eventLines.join('\n') : '（无）',
    '',
    '## 人物与冲突关系',
    characterLines.length ? characterLines.join('\n') : '（无）',
    '',
    '## 二创剪辑策略',
    `- **必须保留点**：${original.remixStrategy.keepMust.join('、') || '无'}`,
    `- **可替换内容**：${original.remixStrategy.canReplace.join('、') || '无'}`,
    '',
    '## 二创改造方案',
    directionLines.length ? directionLines.join('\n\n') : '（无）',
  ].join('\n');
}
