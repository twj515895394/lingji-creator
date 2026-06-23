import type {
  RemixAssetProcessingStageId,
  RemixCreationStageId,
  EditedKeyframe,
  KeyframeEditPrompt,
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingSnapshot,
  RemixCreationWorkspaceSnapshot,
  RemixReferenceStrength,
  RemixStageStatus,
  RemixVariant,
  RetentionMatrix,
  SeedancePrompt,
  SourceAsset,
  SourceAssetSummary,
} from '../types';

const NOW = '2026-06-23T12:00:00.000Z';

export const DEFAULT_REMIX_PROJECT_DIR = '/mock/projects/sceneforge-remix';

export const DEFAULT_RETENTION_MATRIX: RetentionMatrix = {
  plotStructure: 'keep',
  characterRelationship: 'replace_identity',
  dialogueMeaning: 'rewrite',
  dialogueRhythm: 'adjust',
  performanceAction: 'exaggerate',
  cameraComposition: 'soft_keep',
  sceneEnvironment: 'replace',
  visualStyle: 'hybrid',
  memeMechanism: 'enhance',
};

function buildSourceAssetSummary(sourceAsset: SourceAsset): SourceAssetSummary {
  return {
    id: sourceAsset.id,
    title: sourceAsset.title,
    status: sourceAsset.status,
    durationMs: sourceAsset.videoMetadata.durationMs,
    segmentCount: sourceAsset.segments.length,
    keyframeCount: sourceAsset.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0),
    variantCount: sourceAsset.variantCount,
    updatedAt: sourceAsset.updatedAt,
  };
}

function buildAssetProcessingStages(
  statuses: Partial<Record<RemixAssetProcessingStageId, RemixStageStatus>>,
) {
  return {
    remix_source_import: statuses.remix_source_import ?? 'approved',
    remix_segmentation: statuses.remix_segmentation ?? 'not_started',
    remix_keyframes: statuses.remix_keyframes ?? 'not_started',
    remix_understanding: statuses.remix_understanding ?? 'not_started',
  } satisfies RemixAssetProcessingSnapshot['processingStageStates'];
}

function buildCreationStages(
  statuses: Partial<Record<RemixCreationStageId, RemixStageStatus>>,
) {
  return {
    remix_strategy: statuses.remix_strategy ?? 'not_started',
    remix_design: statuses.remix_design ?? 'not_started',
    remix_keyframe_edit_prompts: statuses.remix_keyframe_edit_prompts ?? 'not_started',
    edited_keyframes_review: statuses.edited_keyframes_review ?? 'not_started',
    remix_video_prompts: statuses.remix_video_prompts ?? 'not_started',
    remix_publish: statuses.remix_publish ?? 'not_started',
  } satisfies RemixCreationWorkspaceSnapshot['creationStageStates'];
}

export const MOCK_SOURCE_ASSETS: SourceAsset[] = [
  {
    id: 'source-processing-001',
    title: '夜市摊位对峙',
    status: 'processing',
    createdAt: '2026-06-22T09:00:00.000Z',
    updatedAt: '2026-06-23T10:30:00.000Z',
    sourceVideoPath: '/mock/remix/source-processing-001/source.mp4',
    sourceManifestPath: '/mock/remix/source-processing-001/source_manifest.json',
    transcriptPath: '/mock/remix/source-processing-001/transcript.txt',
    srtPath: '/mock/remix/source-processing-001/subtitles.srt',
    videoMetadata: {
      durationMs: 18400,
      width: 1920,
      height: 1080,
      fps: 25,
      audioChannels: 2,
      hasAudio: true,
    },
    sourceOverviewMarkdownPath: '/mock/remix/source-processing-001/source_overview.md',
    sourceOverviewJsonPath: '/mock/remix/source-processing-001/source_overview.json',
    segmentAnalysisMarkdownPath: '/mock/remix/source-processing-001/segment_analysis.md',
    segmentAnalysisJsonPath: '/mock/remix/source-processing-001/segment_analysis.json',
    segments: [
      {
        id: 'segment-p-001',
        sourceAssetId: 'source-processing-001',
        index: 1,
        title: '摊位压迫开场',
        boundaryType: 'source_shot',
        timeRange: { startMs: 0, endMs: 6200, durationMs: 6200 },
        sourceClipPath: '/mock/remix/source-processing-001/clips/segment-p-001.mp4',
        keyframes: [
          {
            id: 'keyframe-p-001-first',
            sourceAssetId: 'source-processing-001',
            segmentId: 'segment-p-001',
            frameRole: 'first',
            timestampMs: 400,
            imagePath: '/mock/remix/source-processing-001/keyframes/segment-p-001-first.png',
          },
          {
            id: 'keyframe-p-001-middle',
            sourceAssetId: 'source-processing-001',
            segmentId: 'segment-p-001',
            frameRole: 'middle',
            timestampMs: 3100,
            imagePath: '/mock/remix/source-processing-001/keyframes/segment-p-001-middle.png',
          },
          {
            id: 'keyframe-p-001-last',
            sourceAssetId: 'source-processing-001',
            segmentId: 'segment-p-001',
            frameRole: 'last',
            timestampMs: 6000,
            imagePath: '/mock/remix/source-processing-001/keyframes/segment-p-001-last.png',
          },
        ],
        analysisMarkdownPath: '/mock/remix/source-processing-001/segment-p-001-analysis.md',
        analysisJsonPath: '/mock/remix/source-processing-001/segment-p-001-analysis.json',
      },
      {
        id: 'segment-p-002',
        sourceAssetId: 'source-processing-001',
        index: 2,
        title: '情绪升温推近',
        boundaryType: 'split_long_shot',
        timeRange: { startMs: 6200, endMs: 18400, durationMs: 12200 },
        sourceClipPath: '/mock/remix/source-processing-001/clips/segment-p-002.mp4',
        keyframes: [
          {
            id: 'keyframe-p-002-first',
            sourceAssetId: 'source-processing-001',
            segmentId: 'segment-p-002',
            frameRole: 'first',
            timestampMs: 6600,
            imagePath: '/mock/remix/source-processing-001/keyframes/segment-p-002-first.png',
          },
          {
            id: 'keyframe-p-002-last',
            sourceAssetId: 'source-processing-001',
            segmentId: 'segment-p-002',
            frameRole: 'last',
            timestampMs: 18000,
            imagePath: '/mock/remix/source-processing-001/keyframes/segment-p-002-last.png',
          },
        ],
        analysisMarkdownPath: '/mock/remix/source-processing-001/segment-p-002-analysis.md',
        analysisJsonPath: '/mock/remix/source-processing-001/segment-p-002-analysis.json',
      },
    ],
    variantCount: 0,
    tags: ['city-night', 'dialogue', 'pending'],
  },
  {
    id: 'source-library-001',
    title: '天台谈判名场面',
    status: 'published_to_library',
    createdAt: '2026-06-20T08:00:00.000Z',
    updatedAt: '2026-06-23T11:30:00.000Z',
    sourceVideoPath: '/mock/remix/source-library-001/source.mp4',
    sourceManifestPath: '/mock/remix/source-library-001/source_manifest.json',
    transcriptPath: '/mock/remix/source-library-001/transcript.txt',
    srtPath: '/mock/remix/source-library-001/subtitles.srt',
    videoMetadata: {
      durationMs: 24600,
      width: 1080,
      height: 1920,
      fps: 30,
      audioChannels: 2,
      hasAudio: true,
    },
    sourceOverviewMarkdownPath: '/mock/remix/source-library-001/source_overview.md',
    sourceOverviewJsonPath: '/mock/remix/source-library-001/source_overview.json',
    segmentAnalysisMarkdownPath: '/mock/remix/source-library-001/segment_analysis.md',
    segmentAnalysisJsonPath: '/mock/remix/source-library-001/segment_analysis.json',
    segments: [
      {
        id: 'segment-l-001',
        sourceAssetId: 'source-library-001',
        index: 1,
        title: '天台风声压场',
        boundaryType: 'source_shot',
        timeRange: { startMs: 0, endMs: 8200, durationMs: 8200 },
        sourceClipPath: '/mock/remix/source-library-001/clips/segment-l-001.mp4',
        keyframes: [
          {
            id: 'keyframe-l-001-first',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-001',
            frameRole: 'first',
            timestampMs: 0,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-001-first.png',
          },
          {
            id: 'keyframe-l-001-middle',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-001',
            frameRole: 'middle',
            timestampMs: 3900,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-001-middle.png',
          },
          {
            id: 'keyframe-l-001-last',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-001',
            frameRole: 'last',
            timestampMs: 8100,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-001-last.png',
          },
        ],
        analysisMarkdownPath: '/mock/remix/source-library-001/segment-l-001-analysis.md',
        analysisJsonPath: '/mock/remix/source-library-001/segment-l-001-analysis.json',
      },
      {
        id: 'segment-l-002',
        sourceAssetId: 'source-library-001',
        index: 2,
        title: '反打与沉默',
        boundaryType: 'merged_short_shots',
        timeRange: { startMs: 8200, endMs: 15400, durationMs: 7200 },
        sourceClipPath: '/mock/remix/source-library-001/clips/segment-l-002.mp4',
        keyframes: [
          {
            id: 'keyframe-l-002-first',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-002',
            frameRole: 'first',
            timestampMs: 8300,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-002-first.png',
          },
          {
            id: 'keyframe-l-002-last',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-002',
            frameRole: 'last',
            timestampMs: 15200,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-002-last.png',
          },
        ],
        analysisMarkdownPath: '/mock/remix/source-library-001/segment-l-002-analysis.md',
        analysisJsonPath: '/mock/remix/source-library-001/segment-l-002-analysis.json',
      },
      {
        id: 'segment-l-003',
        sourceAssetId: 'source-library-001',
        index: 3,
        title: '气氛收束留白',
        boundaryType: 'long_segment',
        timeRange: { startMs: 15400, endMs: 24600, durationMs: 9200 },
        sourceClipPath: '/mock/remix/source-library-001/clips/segment-l-003.mp4',
        keyframes: [
          {
            id: 'keyframe-l-003-first',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-003',
            frameRole: 'first',
            timestampMs: 15600,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-003-first.png',
          },
          {
            id: 'keyframe-l-003-last',
            sourceAssetId: 'source-library-001',
            segmentId: 'segment-l-003',
            frameRole: 'last',
            timestampMs: 24400,
            imagePath: '/mock/remix/source-library-001/keyframes/segment-l-003-last.png',
          },
        ],
        analysisMarkdownPath: '/mock/remix/source-library-001/segment-l-003-analysis.md',
        analysisJsonPath: '/mock/remix/source-library-001/segment-l-003-analysis.json',
      },
    ],
    variantCount: 1,
    tags: ['library', 'rooftop', 'hero-asset'],
  },
  {
    id: 'source-failed-001',
    title: '雨夜追车失败样本',
    status: 'failed',
    createdAt: '2026-06-21T14:00:00.000Z',
    updatedAt: '2026-06-23T09:15:00.000Z',
    sourceVideoPath: '/mock/remix/source-failed-001/source.mp4',
    sourceManifestPath: '/mock/remix/source-failed-001/source_manifest.json',
    transcriptPath: null,
    srtPath: null,
    videoMetadata: {
      durationMs: 9100,
      width: 1920,
      height: 1080,
      fps: 24,
      audioChannels: 2,
      hasAudio: true,
    },
    sourceOverviewMarkdownPath: null,
    sourceOverviewJsonPath: null,
    segmentAnalysisMarkdownPath: null,
    segmentAnalysisJsonPath: null,
    segments: [
      {
        id: 'segment-f-001',
        sourceAssetId: 'source-failed-001',
        index: 1,
        title: '追车开场缺帧',
        boundaryType: 'source_shot',
        timeRange: { startMs: 0, endMs: 9100, durationMs: 9100 },
        sourceClipPath: '/mock/remix/source-failed-001/clips/segment-f-001.mp4',
        keyframes: [
          {
            id: 'keyframe-f-001-first',
            sourceAssetId: 'source-failed-001',
            segmentId: 'segment-f-001',
            frameRole: 'first',
            timestampMs: 300,
            imagePath: '/mock/remix/source-failed-001/keyframes/segment-f-001-first.png',
          },
        ],
        analysisMarkdownPath: null,
        analysisJsonPath: null,
      },
    ],
    variantCount: 0,
    tags: ['failed', 'rain', 'needs-retry'],
  },
];

export const MOCK_SOURCE_ASSET_SUMMARIES: SourceAssetSummary[] = MOCK_SOURCE_ASSETS.map(buildSourceAssetSummary);

export const MOCK_REMIX_VARIANT: RemixVariant = {
  id: 'variant-hero-001',
  sourceAssetId: 'source-library-001',
  name: '狸猫黑帮版',
  concept: '保留原片压迫感与停顿节奏，改写为狸猫黑帮的天台谈判。',
  referenceStrength: 'strong' as RemixReferenceStrength,
  retentionMatrix: DEFAULT_RETENTION_MATRIX,
  defaultGenerationMode: 'keyframes_plus_source_clip',
  segmentGenerationModeOverrides: {
    'segment-l-001': 'keyframes_only',
    'segment-l-003': 'keyframes_plus_source_clip',
  },
  createdAt: '2026-06-22T10:00:00.000Z',
  updatedAt: '2026-06-23T11:40:00.000Z',
  currentStage: 'edited_keyframes_review',
  stageStatuses: {
    remix_strategy: 'approved',
    remix_design: 'approved',
    remix_keyframe_edit_prompts: 'approved',
    edited_keyframes_review: 'running',
    remix_video_prompts: 'not_started',
    remix_publish: 'not_started',
  },
  strategyMarkdownPath: '/mock/remix/variants/variant-hero-001/strategy.md',
  strategyJsonPath: '/mock/remix/variants/variant-hero-001/strategy.json',
  designMarkdownPath: '/mock/remix/variants/variant-hero-001/design.md',
  designJsonPath: '/mock/remix/variants/variant-hero-001/design.json',
};

export const MOCK_KEYFRAME_EDIT_PROMPTS: KeyframeEditPrompt[] = [
  {
    id: 'kprompt-001',
    variantId: 'variant-hero-001',
    sourceAssetId: 'source-library-001',
    segmentId: 'segment-l-001',
    sourceKeyframeId: 'keyframe-l-001-first',
    frameRole: 'first',
    promptPath: '/mock/remix/variants/variant-hero-001/prompts/segment-l-001-first.md',
    promptVersion: 2,
    createdAt: NOW,
  },
  {
    id: 'kprompt-002',
    variantId: 'variant-hero-001',
    sourceAssetId: 'source-library-001',
    segmentId: 'segment-l-002',
    sourceKeyframeId: 'keyframe-l-002-last',
    frameRole: 'last',
    promptPath: '/mock/remix/variants/variant-hero-001/prompts/segment-l-002-last.md',
    promptVersion: 1,
    createdAt: NOW,
  },
];

export const MOCK_EDITED_KEYFRAMES: EditedKeyframe[] = [
  {
    id: 'edited-001',
    variantId: 'variant-hero-001',
    segmentId: 'segment-l-001',
    frameRole: 'first',
    sourceFramePath: '/mock/remix/source-library-001/keyframes/segment-l-001-first.png',
    promptPath: '/mock/remix/variants/variant-hero-001/prompts/segment-l-001-first.md',
    editedFramePath: '/mock/remix/variants/variant-hero-001/edited/segment-l-001-first.png',
    status: 'generated',
    qualityChecks: [
      { code: 'identity', label: '角色身份一致性', passed: true },
      { code: 'composition', label: '构图保真', passed: true },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'edited-002',
    variantId: 'variant-hero-001',
    segmentId: 'segment-l-002',
    frameRole: 'last',
    sourceFramePath: '/mock/remix/source-library-001/keyframes/segment-l-002-last.png',
    promptPath: '/mock/remix/variants/variant-hero-001/prompts/segment-l-002-last.md',
    editedFramePath: '/mock/remix/variants/variant-hero-001/edited/segment-l-002-last.png',
    status: 'needs_revision',
    qualityChecks: [
      { code: 'camera', label: '镜头高度', passed: false, note: '机位略高，压迫感不够。' },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const MOCK_SEEDANCE_PROMPTS: SeedancePrompt[] = [
  {
    id: 'seedance-001',
    variantId: 'variant-hero-001',
    segmentId: 'segment-l-001',
    generationMode: 'keyframes_plus_source_clip',
    targetPlatform: 'seedance_2_0',
    structuredFields: {
      visual: '拟人狸猫黑帮在废弃天台上谈判，保留原片压迫感与风切空间。',
      motion: '双方缓步逼近后停顿，再由主角轻微探身形成压迫推进。',
      camera: '从中景开始缓推到中近景，保持原始反打节奏。',
      performance: '表情克制但眼神更凶，动作少而准。',
      dialogue: '对白重写为黑帮试探，但保留停顿与攻防轮次。',
      voice: '低沉、缓慢、压迫感强的成年男声。',
      soundEffects: '风声、皮鞋摩擦、水泥地回响。',
      ambientAudio: '高处风噪与城市低频底噪。',
      negative: '避免赛博霓虹、卡通夸张表情、现代广告屏。',
    },
    copyablePrompt:
      '拟人狸猫黑帮在废弃天台谈判，保留压迫停顿与缓推镜头，角色动作克制、风声持续、对白重写但节奏不变。',
    audioPlanPath: '/mock/remix/variants/variant-hero-001/seedance/segment-l-001-audio-plan.json',
  },
];

export const MOCK_ASSET_LIBRARY_SNAPSHOT: RemixAssetLibrarySnapshot = {
  sourceAssets: MOCK_SOURCE_ASSET_SUMMARIES,
};

export const MOCK_ASSET_PROCESSING_SNAPSHOTS: Record<string, RemixAssetProcessingSnapshot> = {
  'source-processing-001': {
    sourceAsset: MOCK_SOURCE_ASSETS[0],
    processingStageStates: buildAssetProcessingStages({
      remix_segmentation: 'approved',
      remix_keyframes: 'running',
      remix_understanding: 'not_started',
    }),
  },
  'source-library-001': {
    sourceAsset: MOCK_SOURCE_ASSETS[1],
    processingStageStates: buildAssetProcessingStages({
      remix_segmentation: 'approved',
      remix_keyframes: 'approved',
      remix_understanding: 'approved',
    }),
  },
  'source-failed-001': {
    sourceAsset: MOCK_SOURCE_ASSETS[2],
    processingStageStates: buildAssetProcessingStages({
      remix_segmentation: 'failed',
    }),
  },
};

export const MOCK_CREATION_WORKSPACE_SNAPSHOT: RemixCreationWorkspaceSnapshot = {
  sourceAsset: buildSourceAssetSummary(MOCK_SOURCE_ASSETS[1]),
  variant: MOCK_REMIX_VARIANT,
  keyframeEditPrompts: MOCK_KEYFRAME_EDIT_PROMPTS,
  editedKeyframes: MOCK_EDITED_KEYFRAMES,
  seedancePrompts: MOCK_SEEDANCE_PROMPTS,
  creationStageStates: buildCreationStages(MOCK_REMIX_VARIANT.stageStatuses),
};
