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
  RemixVariantSummary,
  RetentionMatrix,
} from '../../../src/sceneforge/remix/types';

export interface RemixSourceAssetRefInput {
  projectDir: string;
  sourceAssetId: string;
}

export interface ListSourceAssetsInput {
  projectDir: string;
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

export interface RunSourceAssetStageInput extends RemixSourceAssetRefInput {}

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

export interface RemixIpcContract {
  listSourceAssets(input: ListSourceAssetsInput): Promise<RemixAssetLibrarySnapshot>;
  getSourceAsset(input: RemixSourceAssetRefInput): Promise<RemixAssetProcessingSnapshot>;
  updateSourceAssetMetadata(
    input: UpdateSourceAssetMetadataInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  createSourceAssetFromImport(
    input: CreateSourceAssetFromImportInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  runSourceSegmentation(
    input: RunSourceAssetStageInput,
  ): Promise<RemixAssetProcessingSnapshot>;
  runSourceKeyframes(input: RunSourceAssetStageInput): Promise<RemixAssetProcessingSnapshot>;
  runSourceUnderstanding(
    input: RunSourceAssetStageInput,
  ): Promise<RemixAssetProcessingSnapshot>;
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
