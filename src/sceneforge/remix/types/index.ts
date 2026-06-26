export const REMIX_PIPELINE_ID = 'remix_reference';
export const REMIX_IPC_NAMESPACE = 'sceneForgeRemix';
export const REMIX_TARGET_PLATFORM = 'seedance_2_0';

export const REMIX_ROUTE_PATTERNS = {
  assetLibrary: '/remix/assets',
  assetProcessing: '/remix/assets/:sourceAssetId/process',
  assetDetails: '/remix/assets/:sourceAssetId',
  creationWorkspace: '/remix/projects/:variantId',
} as const;

export const REMIX_ASSET_LIBRARY_SECTIONS = ['published', 'processing', 'failed'] as const;

export const REMIX_SOURCE_ASSET_STATUSES = [
  'draft',
  'processing',
  'ready_for_review',
  'published_to_library',
  'failed',
] as const;

export const REMIX_STAGE_STATUSES = [
  'not_started',
  'running',
  'needs_input',
  'ready_for_review',
  'approved',
  'failed',
] as const;

export const REMIX_PROCESSING_JOB_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export const REMIX_EDITED_KEYFRAME_STATUSES = [
  'pending',
  'generated',
  'needs_revision',
  'approved',
  'rejected',
] as const;

export const REMIX_REFERENCE_STRENGTHS = ['light', 'medium', 'strong'] as const;

export const REMIX_GENERATION_MODES = [
  'keyframes_only',
  'keyframes_plus_source_clip',
] as const;

export const REMIX_SEGMENT_BOUNDARY_TYPES = [
  'source_shot',
  'merged_short_shots',
  'split_long_shot',
  'long_segment',
] as const;

export const REMIX_SEGMENT_REVIEW_STATUSES = [
  'auto',
  'needs_review',
  'approved',
  'manual_adjusted',
] as const;

export const REMIX_SEGMENTATION_MODES = ['fast', 'accurate'] as const;

export const REMIX_KEYFRAME_ROLES = ['first', 'middle', 'last'] as const;

export const REMIX_STAGE_IDS = [
  'remix_source_import',
  'remix_segmentation',
  'remix_keyframes',
  'remix_understanding',
  'remix_strategy',
  'remix_design',
  'remix_keyframe_edit_prompts',
  'edited_keyframes_review',
  'remix_video_prompts',
  'remix_publish',
] as const;

export const REMIX_ASSET_PROCESSING_STAGE_IDS = [
  'remix_source_import',
  'remix_segmentation',
  'remix_keyframes',
  'remix_understanding',
] as const;

export const REMIX_CREATION_STAGE_IDS = [
  'remix_strategy',
  'remix_design',
  'remix_keyframe_edit_prompts',
  'edited_keyframes_review',
  'remix_video_prompts',
  'remix_publish',
] as const;

export type RemixSourceAssetStatus = (typeof REMIX_SOURCE_ASSET_STATUSES)[number];
export type RemixAssetLibrarySection = (typeof REMIX_ASSET_LIBRARY_SECTIONS)[number];
export type RemixStageStatus = (typeof REMIX_STAGE_STATUSES)[number];
export type RemixProcessingJobStatus = (typeof REMIX_PROCESSING_JOB_STATUSES)[number];
export type RemixEditedKeyframeStatus = (typeof REMIX_EDITED_KEYFRAME_STATUSES)[number];
export type RemixReferenceStrength = (typeof REMIX_REFERENCE_STRENGTHS)[number];
export type RemixGenerationMode = (typeof REMIX_GENERATION_MODES)[number];
export type RemixSegmentBoundaryType = (typeof REMIX_SEGMENT_BOUNDARY_TYPES)[number];
export type RemixSegmentReviewStatus = (typeof REMIX_SEGMENT_REVIEW_STATUSES)[number];
export type RemixSegmentationMode = (typeof REMIX_SEGMENTATION_MODES)[number];
export type RemixKeyframeRole = (typeof REMIX_KEYFRAME_ROLES)[number];
export type RemixStageId = (typeof REMIX_STAGE_IDS)[number];
export type RemixAssetProcessingStageId = (typeof REMIX_ASSET_PROCESSING_STAGE_IDS)[number];
export type RemixCreationStageId = (typeof REMIX_CREATION_STAGE_IDS)[number];
export type RemixRoutePattern = (typeof REMIX_ROUTE_PATTERNS)[keyof typeof REMIX_ROUTE_PATTERNS];

export type RetentionChoicePlotStructure = 'keep' | 'soft_keep' | 'rewrite';
export type RetentionChoiceCharacterRelationship =
  | 'keep'
  | 'replace_identity'
  | 'rebuild';
export type RetentionChoiceDialogueMeaning = 'keep' | 'rewrite' | 'new_dialogue';
export type RetentionChoiceDialogueRhythm = 'keep' | 'adjust' | 'redo';
export type RetentionChoicePerformanceAction = 'keep' | 'exaggerate' | 'redo';
export type RetentionChoiceCameraComposition = 'keep' | 'soft_keep' | 'redo';
export type RetentionChoiceSceneEnvironment = 'keep' | 'replace' | 'abstract';
export type RetentionChoiceVisualStyle = 'original' | 'new_style' | 'hybrid';
export type RetentionChoiceMemeMechanism = 'keep' | 'enhance' | 'replace_hot_meme';

export interface RemixVideoMetadata {
  durationMs: number;
  width: number;
  height: number;
  fps?: number | null;
  audioChannels?: number | null;
  hasAudio: boolean;
}

export interface RemixSegmentTimeRange {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface RemixQualityCheck {
  code: string;
  label: string;
  passed: boolean;
  note?: string | null;
}

export interface SourceKeyframe {
  id: string;
  sourceAssetId: string;
  segmentId: string;
  frameRole: RemixKeyframeRole;
  timestampMs: number;
  imagePath: string;
}

export interface RemixKeyframeValidationResult {
  keyframeId: string;
  imagePath: string;
  exists: boolean;
  readable: boolean;
  error?: string | null;
}

export interface RemixSourceAssetMediaValidation {
  sourceVideo: {
    path: string | null;
    exists: boolean;
    readable: boolean;
    error?: string | null;
  };
  keyframes: {
    totalCount: number;
    validCount: number;
    invalidCount: number;
    items: RemixKeyframeValidationResult[];
  };
  thumbnail: {
    source: 'keyframe' | 'video_frame' | 'fallback';
    status: 'ready' | 'failed';
    error?: string | null;
  };
  validatedAt: string;
}

export interface RemixSegmentBoundaryDetails {
  startConfidence: number;
  endConfidence: number;
  startSources: string[];
  endSources: string[];
  boundaryType: 'hard_cut' | 'gradual' | 'manual' | 'inferred';
}

export interface RemixSegmentSemanticDetails {
  visualSummary?: string | null;
  shotType?: string | null;
  motion?: string | null;
  mergeSuggestion?: string | null;
}

export interface SourceSegment {
  id: string;
  sourceAssetId: string;
  index: number;
  title: string;
  boundaryType: RemixSegmentBoundaryType;
  timeRange: RemixSegmentTimeRange;
  boundary?: RemixSegmentBoundaryDetails | null;
  reviewStatus?: RemixSegmentReviewStatus | null;
  sourceClipPath: string;
  keyframes: SourceKeyframe[];
  semantic?: RemixSegmentSemanticDetails | null;
  analysisMarkdownPath?: string | null;
  analysisJsonPath?: string | null;
}

export interface RemixSegmentationInputProfile {
  durationMs: number;
  fps: number;
  analysisFps: number;
  width: number;
  height: number;
  frameCount: number;
}

export interface RemixSegmentationDiagnostics {
  mode: RemixSegmentationMode;
  detector: 'adaptive' | 'hybrid' | 'pyscenedetect_adaptive' | 'transnetv2' | 'hybrid_fallback';
  inputProfile: RemixSegmentationInputProfile;
  lowConfidenceSegmentIds: string[];
  notes: string[];
  usedFallback: boolean;
  fallbackReason?: string | null;
  preserveManualEdits: boolean;
  generatedAt: string;
  detectionMetrics?: {
    elapsedMs?: number;
    frameCount?: number;
    analysisFps?: number;
    modelDevice?: string;
    rawBoundaryCount?: number;
    filteredBoundaryCount?: number;
  } | null;
  clipGeneration?: {
    mode: 'stream_copy' | 'reencode_accurate';
    totalCount: number;
    successCount: number;
    failedCount: number;
    elapsedMs?: number;
  } | null;
}

export interface RemixManualSegmentationOverride {
  updatedAt: string;
  reason: 'manual_adjust' | 'merge' | 'split' | 'rerun';
  preserveOnRerun: boolean;
  segments: SourceSegment[];
}

export interface SourceAsset {
  id: string;
  title: string;
  status: RemixSourceAssetStatus;
  createdAt: string;
  updatedAt: string;
  sourceVideoPath: string;
  sourceManifestPath: string;
  transcriptPath?: string | null;
  srtPath?: string | null;
  videoMetadata: RemixVideoMetadata;
  sourceOverviewMarkdownPath?: string | null;
  sourceOverviewJsonPath?: string | null;
  segmentAnalysisMarkdownPath?: string | null;
  segmentAnalysisJsonPath?: string | null;
  segments: SourceSegment[];
  segmentationMode?: RemixSegmentationMode | null;
  segmentationDiagnostics?: RemixSegmentationDiagnostics | null;
  manualSegmentationOverride?: RemixManualSegmentationOverride | null;
  mediaValidation?: RemixSourceAssetMediaValidation | null;
  variantCount: number;
  tags: string[];
  annotationNote?: string | null;
  lastAnnotatedAt?: string | null;
  annotatedBy?: string | null;
  annotationSource?: string | null;
}

export interface RetentionMatrix {
  plotStructure: RetentionChoicePlotStructure;
  characterRelationship: RetentionChoiceCharacterRelationship;
  dialogueMeaning: RetentionChoiceDialogueMeaning;
  dialogueRhythm: RetentionChoiceDialogueRhythm;
  performanceAction: RetentionChoicePerformanceAction;
  cameraComposition: RetentionChoiceCameraComposition;
  sceneEnvironment: RetentionChoiceSceneEnvironment;
  visualStyle: RetentionChoiceVisualStyle;
  memeMechanism: RetentionChoiceMemeMechanism;
}

export interface RemixVariant {
  id: string;
  sourceAssetId: string;
  name: string;
  concept: string;
  referenceStrength: RemixReferenceStrength;
  retentionMatrix: RetentionMatrix;
  defaultGenerationMode: RemixGenerationMode;
  segmentGenerationModeOverrides: Partial<Record<string, RemixGenerationMode>>;
  createdAt: string;
  updatedAt: string;
  currentStage: RemixCreationStageId | null;
  stageStatuses: Partial<Record<RemixCreationStageId, RemixStageStatus>>;
  strategyMarkdownPath?: string | null;
  strategyJsonPath?: string | null;
  designMarkdownPath?: string | null;
  designJsonPath?: string | null;
}

export interface KeyframeEditPrompt {
  id: string;
  variantId: string;
  sourceAssetId: string;
  segmentId: string;
  sourceKeyframeId: string;
  frameRole: RemixKeyframeRole;
  promptPath: string;
  promptVersion: number;
  createdAt: string;
}

export interface EditedKeyframe {
  id: string;
  variantId: string;
  segmentId: string;
  frameRole: RemixKeyframeRole;
  sourceFramePath: string;
  promptPath: string;
  editedFramePath: string;
  status: RemixEditedKeyframeStatus;
  qualityChecks: RemixQualityCheck[];
  createdAt: string;
  updatedAt: string;
}

export interface SeedancePromptStructuredFields {
  visual: string;
  motion: string;
  camera: string;
  performance: string;
  dialogue: string;
  voice: string;
  soundEffects: string;
  ambientAudio: string;
  negative: string;
}

export interface SeedanceAudioPlanSegment {
  segmentId: string;
  dialogue: string;
  voice: string;
  soundEffects: string;
  ambientAudio: string;
}

export interface SeedanceAudioPlan {
  globalAudioRules: string[];
  voiceProfiles: Array<{
    id: string;
    description: string;
  }>;
  segmentAudioPlan: SeedanceAudioPlanSegment[];
}

export interface SeedancePrompt {
  id: string;
  variantId: string;
  segmentId: string;
  generationMode: RemixGenerationMode;
  targetPlatform: typeof REMIX_TARGET_PLATFORM;
  structuredFields: SeedancePromptStructuredFields;
  copyablePrompt: string;
  audioPlanPath?: string | null;
  audioPlan?: SeedanceAudioPlan | null;
}

export interface SourceAssetSummary {
  id: string;
  title: string;
  status: RemixSourceAssetStatus;
  durationMs: number;
  segmentCount: number;
  keyframeCount: number;
}
