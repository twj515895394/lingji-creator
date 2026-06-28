import type {
  EditedKeyframe,
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingSnapshot,
  RemixCreationWorkspaceSnapshot,
  RemixEditedKeyframeStatus,
  RemixGenerationMode,
  RemixKeyframeRole,
  RemixQualityCheck,
  RemixReferenceStrength,
  RemixSegmentationDiagnostics,
  RemixSegmentationMode,
  RemixSourceAssetMediaValidation,
  RemixSourceAssetStatus,
  RemixVariantSummary,
  SourceSegment,
  RetentionMatrix,
} from '../../../src/sceneforge/remix/types';
import type { RemixUnderstandingWorkbenchSnapshot } from './remix-understanding-workbench';
import type { RemixSegmentTranscriptCorrectionDocument } from './remix-transcript-correction-service';

export interface RemixSourceAssetRefInput {
  projectDir: string;
  sourceAssetId: string;
}

export interface DeleteSourceAssetInput extends RemixSourceAssetRefInput {}

export interface ListSourceAssetsInput {
  projectDir: string;
  statuses?: RemixSourceAssetStatus | RemixSourceAssetStatus[];
}

export interface RemixVariantRefInput {
  projectDir: string;
  variantId: string;
}

export interface ListVariantsForSourceAssetInput extends RemixSourceAssetRefInput {}

export interface CreateSourceAssetFromImportInput {
  projectDir: string;
  importId?: string | null;
  title?: string | null;
  sourceVideoPath?: string | null;
}

export interface RunSourceAssetStageInput extends RemixSourceAssetRefInput {
  minDurationForMiddleFrameSec?: number;
}

export interface RunSourceSegmentationInput extends RemixSourceAssetRefInput {
  mode?: RemixSegmentationMode;
  preserveManualEdits?: boolean;
  minShotDurationMs?: number;
}

export interface SegmentKeyframeActionInput extends RemixSourceAssetRefInput {
  segmentId: string;
}

export interface UpdateSourceSegmentsInput extends RemixSourceAssetRefInput {
  segments: SourceSegment[];
  reason: 'manual_adjust' | 'merge' | 'split' | 'rerun';
  preserveOnRerun?: boolean;
}

export interface CreateVariantFromSourceAssetInput extends RemixSourceAssetRefInput {
  name: string;
  concept: string;
  referenceStrength?: RemixReferenceStrength;
  retentionMatrix?: RetentionMatrix;
  defaultGenerationMode?: RemixGenerationMode;
}

export interface UpdateVariantConfigInput extends RemixVariantRefInput {
  name?: string;
  concept?: string;
  referenceStrength?: RemixReferenceStrength;
  retentionMatrix?: RetentionMatrix;
  defaultGenerationMode?: RemixGenerationMode;
  segmentGenerationModeOverrides?: Record<string, RemixGenerationMode>;
}

export interface RenameVariantInput extends RemixVariantRefInput {
  name: string;
}

export interface DuplicateVariantInput extends RemixVariantRefInput {
  name?: string | null;
}

export interface DeleteVariantInput extends RemixVariantRefInput {}

export interface UpdateSourceAssetMetadataInput extends RemixSourceAssetRefInput {
  tags?: string[];
  annotationNote?: string | null;
  annotatedBy?: string | null;
  annotationSource?: string | null;
}

export interface RegisterEditedKeyframeInput extends RemixVariantRefInput {
  segmentId: string;
  frameRole: RemixKeyframeRole;
  sourceFramePath: string;
  promptPath: string;
  editedFramePath: string;
}

export interface UpdateEditedKeyframeStatusInput extends RemixVariantRefInput {
  editedKeyframeId: string;
  status: RemixEditedKeyframeStatus;
  qualityChecks?: RemixQualityCheck[];
}

export interface ExportPromptBundleResult {
  bundlePath: string;
  workspace: RemixCreationWorkspaceSnapshot;
}

export interface ExportPromptBundleInput extends RemixVariantRefInput {
  outputPath?: string | null;
}

export interface RemixUnderstandingFreshnessReport {
  sourceAssetId: string;
  isStale: boolean;
  staleSegmentIds: string[];
  staleReasons: Array<
    | 'segments_changed'
    | 'keyframes_changed'
    | 'transcript_changed'
    | 'transcript_correction_changed'
    | 'frame_vision_changed'
    | 'prompt_version_changed'
    | 'model_changed'
    | 'missing_analysis'
  >;
  segmentReports: Array<{
    segmentId: string;
    isStale: boolean;
    staleReasons: string[];
    previousInputHash?: string | null;
    currentInputHash: string;
  }>;
  checkedAt: string;
}

export interface RemixIpcContract {
  listSourceAssets(input: ListSourceAssetsInput): Promise<RemixAssetLibrarySnapshot>;
  getSourceAsset(input: RemixSourceAssetRefInput): Promise<RemixAssetProcessingSnapshot>;
  deleteSourceAsset(input: DeleteSourceAssetInput): Promise<{ deletedSourceAssetId: string }>;
  updateSourceAssetMetadata(
    input: UpdateSourceAssetMetadataInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  createSourceAssetFromImport(
    input: CreateSourceAssetFromImportInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  runSourceSegmentation(
    input: RunSourceSegmentationInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  runSourceKeyframes(input: RunSourceAssetStageInput): Promise<RemixAssetProcessingSnapshot>;
  runSourceAudio(input: RunSourceAssetStageInput): Promise<RemixAssetProcessingSnapshot>;
  runSourceTranscript(input: RunSourceAssetStageInput): Promise<RemixAssetProcessingSnapshot>;
  addSegmentMiddleKeyframe(input: SegmentKeyframeActionInput): Promise<RemixAssetProcessingSnapshot>;
  deleteSegmentMiddleKeyframe(input: SegmentKeyframeActionInput): Promise<RemixAssetProcessingSnapshot>;
  runSourceUnderstanding(
    input: RunSourceAssetStageInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  rerunSegmentUnderstanding(
    input: SegmentKeyframeActionInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  rerunOriginalStoryRollup(
    input: RemixSourceAssetRefInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  getSourceUnderstandingWorkbench(
    input: RemixSourceAssetRefInput,
  ): Promise<RemixUnderstandingWorkbenchSnapshot>;
  validateUnderstandingFreshness(
    input: RemixSourceAssetRefInput,
  ): Promise<RemixUnderstandingFreshnessReport>;
  exportUnderstandingReport(input: {
    projectDir: string;
    sourceAssetId: string;
    format?: 'markdown';
  }): Promise<{ reportPath: string }>;
  runSegmentFrameVision(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
  }): Promise<import('./remix-frame-vision-service').RemixSegmentFrameVisionDocument>;
  rerunStaleSegmentUnderstandings(input: {
    projectDir: string;
    sourceAssetId: string;
    useCorrectedTranscript?: boolean;
  }): Promise<RemixAssetProcessingSnapshot>;
  getSegmentTranscriptCorrection(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
  }): Promise<RemixSegmentTranscriptCorrectionDocument | null>;
  updateSegmentTranscriptCorrection(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
    correctedText: string;
    markConfirmed?: boolean;
  }): Promise<RemixUnderstandingWorkbenchSnapshot>;
  updateSourceSegments(input: UpdateSourceSegmentsInput): Promise<RemixAssetProcessingSnapshot>;
  getSegmentationDiagnostics(input: RemixSourceAssetRefInput): Promise<RemixSegmentationDiagnostics | null>;
  validateSourceAssetMedia(input: RemixSourceAssetRefInput): Promise<RemixSourceAssetMediaValidation>;
  publishSourceAssetToLibrary(
    input: RemixSourceAssetRefInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  createVariantFromSourceAsset(
    input: CreateVariantFromSourceAssetInput,
  ): Promise<RemixCreationWorkspaceSnapshot>;
  listVariantsForSourceAsset(input: ListVariantsForSourceAssetInput): Promise<RemixVariantSummary[]>;
  renameVariant(input: RenameVariantInput): Promise<RemixVariantSummary[]>;
  duplicateVariant(input: DuplicateVariantInput): Promise<RemixVariantSummary[]>;
  deleteVariant(input: DeleteVariantInput): Promise<RemixVariantSummary[]>;
  getCreationWorkspace(
    input: RemixVariantRefInput,
  ): Promise<RemixCreationWorkspaceSnapshot>;
  updateVariantConfig(input: UpdateVariantConfigInput): Promise<RemixCreationWorkspaceSnapshot>;
  runRemixStrategy(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot>;
  runRemixDesign(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot>;
  runKeyframeEditPrompts(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot>;
  registerEditedKeyframe(
    input: RegisterEditedKeyframeInput,
  ): Promise<RemixCreationWorkspaceSnapshot>;
  updateEditedKeyframeStatus(
    input: UpdateEditedKeyframeStatusInput,
  ): Promise<RemixCreationWorkspaceSnapshot>;
  runSeedancePrompts(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot>;
  exportPromptBundle(input: ExportPromptBundleInput): Promise<ExportPromptBundleResult>;
}

export type RemixSourceAssetListResult = RemixAssetLibrarySnapshot;
export type RemixSourceAssetResult = RemixAssetProcessingSnapshot;
export type RemixCreationWorkspaceResult = RemixCreationWorkspaceSnapshot;
