import type {
  CreateSourceAssetFromImportInput,
  CreateVariantFromSourceAssetInput,
  DeleteVariantInput,
  DuplicateVariantInput,
  ExportPromptBundleInput,
  ExportPromptBundleResult,
  ListVariantsForSourceAssetInput,
  RegisterEditedKeyframeInput,
  RemixIpcContract,
  RemixSourceAssetRefInput,
  RemixVariantRefInput,
  RunSourceAssetStageInput,
  UpdateSourceAssetMetadataInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
  RenameVariantInput,
} from '../../../../electron/sceneforge/remix/remix-ipc-types';
import type {
  EditedKeyframe,
  KeyframeEditPrompt,
  RemixAssetProcessingStageId,
  RemixAssetProcessingSnapshot,
  RemixCreationWorkspaceSnapshot,
  RemixVariantSummary,
  RemixVariant,
  SeedancePrompt,
  SourceAsset,
} from '../types';
import {
  DEFAULT_REMIX_PROJECT_DIR,
  DEFAULT_RETENTION_MATRIX,
  MOCK_ASSET_LIBRARY_SNAPSHOT,
  MOCK_ASSET_PROCESSING_SNAPSHOTS,
  MOCK_CREATION_WORKSPACE_SNAPSHOT,
  MOCK_EDITED_KEYFRAMES,
  MOCK_KEYFRAME_EDIT_PROMPTS,
  MOCK_REMIX_VARIANT,
  MOCK_SEEDANCE_PROMPTS,
  MOCK_SOURCE_ASSETS,
} from './mock-data';

const NOW = '2026-06-23T12:00:00.000Z';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findSourceAsset(sourceAssetId: string): SourceAsset {
  return clone(
    MOCK_SOURCE_ASSETS.find((sourceAsset) => sourceAsset.id === sourceAssetId) ?? MOCK_SOURCE_ASSETS[1],
  );
}

function findProcessingSnapshot(sourceAssetId: string): RemixAssetProcessingSnapshot {
  return clone(
    MOCK_ASSET_PROCESSING_SNAPSHOTS[sourceAssetId] ?? MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
  );
}

function buildVariantSummary(variantId: string, sourceAssetId: string, name: string): RemixVariantSummary {
  return {
    id: variantId,
    sourceAssetId,
    name,
    currentStage: 'edited_keyframes_review',
    updatedAt: NOW,
  };
}

function buildVariant(variantId: string, overrides: Partial<RemixVariant> = {}): RemixVariant {
  return {
    ...clone(MOCK_REMIX_VARIANT),
    id: variantId,
    updatedAt: new Date('2026-06-23T12:00:00.000Z').toISOString(),
    ...overrides,
  };
}

interface WorkspaceOverrides {
  variant?: Partial<RemixVariant>;
  keyframeEditPrompts?: KeyframeEditPrompt[];
  editedKeyframes?: EditedKeyframe[];
  seedancePrompts?: SeedancePrompt[];
  creationStageStates?: RemixCreationWorkspaceSnapshot['creationStageStates'];
}

function buildWorkspace(
  variantId: string,
  overrides: WorkspaceOverrides = {},
): RemixCreationWorkspaceSnapshot {
  const base = clone(MOCK_CREATION_WORKSPACE_SNAPSHOT);
  const variant = buildVariant(variantId, overrides.variant);
  return {
    ...base,
    ...overrides,
    variant,
    keyframeEditPrompts: clone(overrides.keyframeEditPrompts ?? MOCK_KEYFRAME_EDIT_PROMPTS).map(
      (prompt: KeyframeEditPrompt) => ({
        ...prompt,
        variantId,
      }),
    ),
    editedKeyframes: clone(overrides.editedKeyframes ?? MOCK_EDITED_KEYFRAMES).map(
      (edited: EditedKeyframe) => ({
        ...edited,
        variantId,
      }),
    ),
    seedancePrompts: clone(overrides.seedancePrompts ?? MOCK_SEEDANCE_PROMPTS).map(
      (prompt: SeedancePrompt) => ({
        ...prompt,
        variantId,
      }),
    ),
    creationStageStates: clone(overrides.creationStageStates ?? base.creationStageStates),
  };
}

function setProcessingStage(
  snapshot: RemixAssetProcessingSnapshot,
  stage: RemixAssetProcessingStageId,
  status: NonNullable<RemixAssetProcessingSnapshot['processingStageStates'][RemixAssetProcessingStageId]>,
) {
  snapshot.processingStageStates[stage] = status;
}

export const remixMockApi: RemixIpcContract = {
  async listSourceAssets() {
    return clone(MOCK_ASSET_LIBRARY_SNAPSHOT);
  },

  async getSourceAsset(input: RemixSourceAssetRefInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    snapshot.variants = input.sourceAssetId === 'source-library-001'
      ? [buildVariantSummary('variant-hero-001', input.sourceAssetId, '狸猫黑帮版')]
      : [];
    return snapshot;
  },

  async deleteSourceAsset(input: RemixSourceAssetRefInput) {
    return { deletedSourceAssetId: input.sourceAssetId };
  },

  async updateSourceAssetMetadata(input: UpdateSourceAssetMetadataInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    snapshot.sourceAsset.tags = clone(input.tags ?? snapshot.sourceAsset.tags);
    snapshot.sourceAsset.annotationNote = input.annotationNote ?? snapshot.sourceAsset.annotationNote ?? null;
    snapshot.sourceAsset.lastAnnotatedAt = NOW;
    snapshot.sourceAsset.annotatedBy = input.annotatedBy ?? 'Remix Editor';
    snapshot.sourceAsset.annotationSource = input.annotationSource ?? 'workspace_manual';
    return snapshot;
  },

  async createSourceAssetFromImport(input: CreateSourceAssetFromImportInput) {
    const sourceAsset = findSourceAsset('source-processing-001');
    sourceAsset.id = input.importId?.trim() || 'source-imported-001';
    sourceAsset.title = input.title?.trim() || sourceAsset.title;
    sourceAsset.sourceVideoPath = input.sourceVideoPath?.trim() || sourceAsset.sourceVideoPath;
    return {
      sourceAsset,
      processingStageStates: {
        remix_source_import: 'approved',
        remix_segmentation: 'ready_for_review',
        remix_keyframes: 'not_started',
        remix_understanding: 'not_started',
      },
    };
  },

  async runSourceSegmentation(input: RunSourceAssetStageInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    snapshot.sourceAsset.status = 'processing';
    setProcessingStage(snapshot, 'remix_segmentation', 'approved');
    setProcessingStage(snapshot, 'remix_keyframes', 'ready_for_review');
    return snapshot;
  },

  async runSourceKeyframes(input: RunSourceAssetStageInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    snapshot.sourceAsset.status = 'processing';
    setProcessingStage(snapshot, 'remix_segmentation', 'approved');
    setProcessingStage(snapshot, 'remix_keyframes', 'approved');
    setProcessingStage(snapshot, 'remix_understanding', 'ready_for_review');
    return snapshot;
  },

  async runSourceUnderstanding(input: RunSourceAssetStageInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_segmentation', 'approved');
    setProcessingStage(snapshot, 'remix_keyframes', 'approved');
    setProcessingStage(snapshot, 'remix_understanding', 'approved');
    snapshot.sourceAsset.status = 'ready_for_review';
    return snapshot;
  },

  async publishSourceAssetToLibrary(input: RemixSourceAssetRefInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    snapshot.sourceAsset.status = 'published_to_library';
    return snapshot;
  },

  async createVariantFromSourceAsset(input: CreateVariantFromSourceAssetInput) {
    const sourceAsset = findSourceAsset(input.sourceAssetId);
    if (sourceAsset.status !== 'published_to_library') {
      throw new Error('这份素材尚未保存入库，不能创建二创版本。请先完成处理并保存入库。');
    }
    return buildWorkspace('variant-created-001', {
      variant: {
        sourceAssetId: input.sourceAssetId,
        name: input.name,
        concept: input.concept,
        referenceStrength: input.referenceStrength ?? 'strong',
        retentionMatrix: input.retentionMatrix ?? DEFAULT_RETENTION_MATRIX,
        defaultGenerationMode: input.defaultGenerationMode ?? 'keyframes_plus_source_clip',
        currentStage: 'remix_strategy',
        stageStatuses: {
          remix_strategy: 'ready_for_review',
          remix_design: 'not_started',
          remix_keyframe_edit_prompts: 'not_started',
          edited_keyframes_review: 'not_started',
          remix_video_prompts: 'not_started',
          remix_publish: 'not_started',
        },
      },
    });
  },

  async listVariantsForSourceAsset(input: ListVariantsForSourceAssetInput) {
    return input.sourceAssetId === 'source-library-001'
      ? [buildVariantSummary('variant-hero-001', input.sourceAssetId, '狸猫黑帮版')]
      : [];
  },

  async renameVariant(input: RenameVariantInput) {
    return [buildVariantSummary(input.variantId, 'source-library-001', input.name)];
  },

  async duplicateVariant(input: DuplicateVariantInput) {
    return [
      buildVariantSummary(input.variantId, 'source-library-001', '狸猫黑帮版'),
      buildVariantSummary('variant-copy-001', 'source-library-001', input.name ?? '狸猫黑帮版 Copy'),
    ];
  },

  async deleteVariant(_input: DeleteVariantInput) {
    return [];
  },

  async getCreationWorkspace(input: RemixVariantRefInput) {
    return buildWorkspace(input.variantId);
  },

  async updateVariantConfig(input: UpdateVariantConfigInput) {
    return buildWorkspace(input.variantId, {
      variant: {
        name: input.name ?? MOCK_REMIX_VARIANT.name,
        concept: input.concept ?? MOCK_REMIX_VARIANT.concept,
        referenceStrength: input.referenceStrength ?? MOCK_REMIX_VARIANT.referenceStrength,
        retentionMatrix: input.retentionMatrix ?? MOCK_REMIX_VARIANT.retentionMatrix,
        defaultGenerationMode:
          input.defaultGenerationMode ?? MOCK_REMIX_VARIANT.defaultGenerationMode,
        segmentGenerationModeOverrides:
          input.segmentGenerationModeOverrides ?? MOCK_REMIX_VARIANT.segmentGenerationModeOverrides,
      },
    });
  },

  async runRemixStrategy(input: RemixVariantRefInput) {
    return buildWorkspace(input.variantId, {
      variant: {
        currentStage: 'remix_strategy',
        stageStatuses: {
          remix_strategy: 'ready_for_review',
          remix_design: 'not_started',
          remix_keyframe_edit_prompts: 'not_started',
          edited_keyframes_review: 'not_started',
          remix_video_prompts: 'not_started',
          remix_publish: 'not_started',
        },
      },
      creationStageStates: {
        remix_strategy: 'ready_for_review',
        remix_design: 'not_started',
        remix_keyframe_edit_prompts: 'not_started',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
  },

  async runRemixDesign(input: RemixVariantRefInput) {
    return buildWorkspace(input.variantId, {
      variant: {
        currentStage: 'remix_design',
        stageStatuses: {
          remix_strategy: 'approved',
          remix_design: 'ready_for_review',
          remix_keyframe_edit_prompts: 'not_started',
          edited_keyframes_review: 'not_started',
          remix_video_prompts: 'not_started',
          remix_publish: 'not_started',
        },
      },
      creationStageStates: {
        remix_strategy: 'approved',
        remix_design: 'ready_for_review',
        remix_keyframe_edit_prompts: 'not_started',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
  },

  async runKeyframeEditPrompts(input: RemixVariantRefInput) {
    return buildWorkspace(input.variantId, {
      variant: {
        currentStage: 'remix_keyframe_edit_prompts',
        stageStatuses: {
          remix_strategy: 'approved',
          remix_design: 'approved',
          remix_keyframe_edit_prompts: 'ready_for_review',
          edited_keyframes_review: 'not_started',
          remix_video_prompts: 'not_started',
          remix_publish: 'not_started',
        },
      },
      creationStageStates: {
        remix_strategy: 'approved',
        remix_design: 'approved',
        remix_keyframe_edit_prompts: 'ready_for_review',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
  },

  async registerEditedKeyframe(input: RegisterEditedKeyframeInput) {
    return buildWorkspace(input.variantId, {
      editedKeyframes: [
        {
          id: `${input.variantId}-${input.segmentId}-${input.frameRole}`,
          variantId: input.variantId,
          segmentId: input.segmentId,
          frameRole: input.frameRole,
          sourceFramePath: input.sourceFramePath,
          promptPath: input.promptPath,
          editedFramePath: input.editedFramePath,
          status: 'generated',
          qualityChecks: [],
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      variant: {
        currentStage: 'edited_keyframes_review',
        stageStatuses: {
          remix_strategy: 'approved',
          remix_design: 'approved',
          remix_keyframe_edit_prompts: 'approved',
          edited_keyframes_review: 'running',
          remix_video_prompts: 'not_started',
          remix_publish: 'not_started',
        },
      },
    });
  },

  async updateEditedKeyframeStatus(input: UpdateEditedKeyframeStatusInput) {
    return buildWorkspace(input.variantId, {
      editedKeyframes: [
        {
          ...clone(MOCK_EDITED_KEYFRAMES[0]),
          id: input.editedKeyframeId,
          variantId: input.variantId,
          status: input.status,
          qualityChecks: clone(input.qualityChecks ?? []),
          updatedAt: NOW,
        },
      ],
    });
  },

  async runSeedancePrompts(input: RemixVariantRefInput) {
    return buildWorkspace(input.variantId, {
      variant: {
        currentStage: 'remix_video_prompts',
        stageStatuses: {
          remix_strategy: 'approved',
          remix_design: 'approved',
          remix_keyframe_edit_prompts: 'approved',
          edited_keyframes_review: 'approved',
          remix_video_prompts: 'ready_for_review',
          remix_publish: 'not_started',
        },
      },
      creationStageStates: {
        remix_strategy: 'approved',
        remix_design: 'approved',
        remix_keyframe_edit_prompts: 'approved',
        edited_keyframes_review: 'approved',
        remix_video_prompts: 'ready_for_review',
        remix_publish: 'not_started',
      },
    });
  },

  async exportPromptBundle(input: ExportPromptBundleInput): Promise<ExportPromptBundleResult> {
    return {
      bundlePath: input.outputPath ?? `/mock/remix/variants/${input.variantId}/prompt-bundle.zip`,
      workspace: await this.runSeedancePrompts(input),
    };
  },
};

export function createMockRemixApi(overrides?: Partial<RemixIpcContract>): RemixIpcContract {
  return {
    ...remixMockApi,
    ...overrides,
  };
}

export { DEFAULT_REMIX_PROJECT_DIR };
