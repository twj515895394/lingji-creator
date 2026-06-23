import type {
  EditedKeyframe,
  KeyframeEditPrompt,
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingSnapshot,
  RemixCreationWorkspaceSnapshot,
  RemixEditedKeyframeStatus,
  RemixQualityCheck,
  RemixVariant,
  RetentionMatrix,
  SeedancePrompt,
  SourceAsset,
} from '../../../src/sceneforge/remix/types';
import {
  getRemixSegmentClipPath,
  getRemixSegmentKeyframePath,
  getRemixSegmentManifestPath,
  getRemixSourceManifestPath,
  getRemixSourceOverviewJsonPath,
  getRemixSourceOverviewMarkdownPath,
  getRemixSegmentAnalysisJsonPath,
  getRemixSegmentAnalysisMarkdownPath,
  getRemixVariantDesignJsonPath,
  getRemixVariantDesignMarkdownPath,
  getRemixVariantEditedKeyframePath,
  getRemixVariantKeyframePromptPath,
  getRemixVariantPromptBundlePath,
  getRemixVariantSeedancePromptPath,
  getRemixVariantStrategyJsonPath,
  getRemixVariantStrategyMarkdownPath,
} from './remix-artifact-paths';
import type {
  CreateSourceAssetFromImportInput,
  CreateVariantFromSourceAssetInput,
  ExportPromptBundleResult,
  RegisterEditedKeyframeInput,
  RemixSourceAssetRefInput,
  RemixVariantRefInput,
  RunSourceAssetStageInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
} from './remix-ipc-types';

const DEFAULT_RETENTION_MATRIX: RetentionMatrix = {
  plotStructure: 'keep',
  characterRelationship: 'replace_identity',
  dialogueMeaning: 'rewrite',
  dialogueRhythm: 'keep',
  performanceAction: 'keep',
  cameraComposition: 'soft_keep',
  sceneEnvironment: 'replace',
  visualStyle: 'new_style',
  memeMechanism: 'enhance',
};

function now(): string {
  return new Date().toISOString();
}

function buildSourceAssetSummary(sourceAsset: SourceAsset): RemixAssetLibrarySnapshot['sourceAssets'][number] {
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

function buildStubSourceAsset(sourceAssetId: string, title?: string | null): SourceAsset {
  const timestamp = now();
  return {
    id: sourceAssetId,
    title: title?.trim() || `Remix Source ${sourceAssetId}`,
    status: 'ready_for_review',
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceVideoPath: `imports/${sourceAssetId}.mp4`,
    sourceManifestPath: getRemixSourceManifestPath(sourceAssetId),
    transcriptPath: `imports/${sourceAssetId}.transcript.txt`,
    srtPath: `imports/${sourceAssetId}.srt`,
    videoMetadata: {
      durationMs: 12800,
      width: 1920,
      height: 1080,
      fps: 25,
      audioChannels: 2,
      hasAudio: true,
    },
    sourceOverviewMarkdownPath: getRemixSourceOverviewMarkdownPath(sourceAssetId),
    sourceOverviewJsonPath: getRemixSourceOverviewJsonPath(sourceAssetId),
    segmentAnalysisMarkdownPath: getRemixSegmentAnalysisMarkdownPath(sourceAssetId),
    segmentAnalysisJsonPath: getRemixSegmentAnalysisJsonPath(sourceAssetId),
    segments: [
      {
        id: 'segment-001',
        sourceAssetId,
        index: 1,
        title: '开场对峙',
        boundaryType: 'source_shot',
        timeRange: { startMs: 0, endMs: 6100, durationMs: 6100 },
        sourceClipPath: getRemixSegmentClipPath(sourceAssetId, 'segment-001'),
        keyframes: [
          {
            id: `${sourceAssetId}-segment-001-first`,
            sourceAssetId,
            segmentId: 'segment-001',
            frameRole: 'first',
            timestampMs: 0,
            imagePath: getRemixSegmentKeyframePath(sourceAssetId, 'segment-001', 'first'),
          },
          {
            id: `${sourceAssetId}-segment-001-last`,
            sourceAssetId,
            segmentId: 'segment-001',
            frameRole: 'last',
            timestampMs: 6100,
            imagePath: getRemixSegmentKeyframePath(sourceAssetId, 'segment-001', 'last'),
          },
        ],
        analysisMarkdownPath: getRemixSegmentAnalysisMarkdownPath(sourceAssetId),
        analysisJsonPath: getRemixSegmentAnalysisJsonPath(sourceAssetId),
      },
      {
        id: 'segment-002',
        sourceAssetId,
        index: 2,
        title: '情绪升级',
        boundaryType: 'split_long_shot',
        timeRange: { startMs: 6100, endMs: 12800, durationMs: 6700 },
        sourceClipPath: getRemixSegmentClipPath(sourceAssetId, 'segment-002'),
        keyframes: [
          {
            id: `${sourceAssetId}-segment-002-first`,
            sourceAssetId,
            segmentId: 'segment-002',
            frameRole: 'first',
            timestampMs: 6100,
            imagePath: getRemixSegmentKeyframePath(sourceAssetId, 'segment-002', 'first'),
          },
          {
            id: `${sourceAssetId}-segment-002-last`,
            sourceAssetId,
            segmentId: 'segment-002',
            frameRole: 'last',
            timestampMs: 12800,
            imagePath: getRemixSegmentKeyframePath(sourceAssetId, 'segment-002', 'last'),
          },
        ],
        analysisMarkdownPath: getRemixSegmentAnalysisMarkdownPath(sourceAssetId),
        analysisJsonPath: getRemixSegmentAnalysisJsonPath(sourceAssetId),
      },
    ],
    variantCount: 1,
    tags: ['stub', 'remix'],
  };
}

function buildStubVariant(
  sourceAssetId: string,
  variantId: string,
  overrides: Partial<RemixVariant> = {},
): RemixVariant {
  const timestamp = now();
  return {
    id: variantId,
    sourceAssetId,
    name: '动物拟人版',
    concept: '保持冲突节奏，替换为动物黑帮对峙',
    referenceStrength: 'strong',
    retentionMatrix: DEFAULT_RETENTION_MATRIX,
    defaultGenerationMode: 'keyframes_plus_source_clip',
    segmentGenerationModeOverrides: { 'segment-001': 'keyframes_only' },
    createdAt: timestamp,
    updatedAt: timestamp,
    currentStage: 'remix_design',
    stageStatuses: {
      remix_strategy: 'approved',
      remix_design: 'running',
      remix_keyframe_edit_prompts: 'not_started',
      edited_keyframes_review: 'not_started',
      remix_video_prompts: 'not_started',
      remix_publish: 'not_started',
    },
    strategyMarkdownPath: getRemixVariantStrategyMarkdownPath(variantId),
    strategyJsonPath: getRemixVariantStrategyJsonPath(variantId),
    designMarkdownPath: getRemixVariantDesignMarkdownPath(variantId),
    designJsonPath: getRemixVariantDesignJsonPath(variantId),
    ...overrides,
  };
}

function buildStubKeyframePrompts(
  variantId: string,
  sourceAssetId: string,
): KeyframeEditPrompt[] {
  const timestamp = now();
  return [
    {
      id: `${variantId}-segment-001-first`,
      variantId,
      sourceAssetId,
      segmentId: 'segment-001',
      sourceKeyframeId: `${sourceAssetId}-segment-001-first`,
      frameRole: 'first',
      promptPath: getRemixVariantKeyframePromptPath(variantId, 'segment-001', 'first'),
      promptVersion: 1,
      createdAt: timestamp,
    },
  ];
}

function buildEditedKeyframe(
  variantId: string,
  sourceAssetId: string,
  status: RemixEditedKeyframeStatus,
  qualityChecks: RemixQualityCheck[] = [],
): EditedKeyframe {
  const timestamp = now();
  return {
    id: `${variantId}-edited-segment-001-first`,
    variantId,
    segmentId: 'segment-001',
    frameRole: 'first',
    sourceFramePath: getRemixSegmentKeyframePath(sourceAssetId, 'segment-001', 'first'),
    promptPath: getRemixVariantKeyframePromptPath(variantId, 'segment-001', 'first'),
    editedFramePath: getRemixVariantEditedKeyframePath(variantId, 'segment-001', 'first'),
    status,
    qualityChecks,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildSeedancePrompts(variantId: string): SeedancePrompt[] {
  return [
    {
      id: `${variantId}-seedance-segment-001`,
      variantId,
      segmentId: 'segment-001',
      generationMode: 'keyframes_plus_source_clip',
      targetPlatform: 'seedance_2_0',
      structuredFields: {
        visual: '动物黑帮摊位对峙，保持压迫感',
        motion: '角色前压，保留原片节奏推进',
        camera: '中近景缓推，保留对峙构图',
        performance: '克制到突然爆发',
        dialogue: '重写对白但保留轮次与停顿',
        voice: '低沉压迫感男声',
        soundEffects: '摊位摩擦与脚步声',
        ambientAudio: '街市环境底噪',
        negative: '避免现代电子屏与赛博霓虹',
      },
      copyablePrompt: '【生成任务】动物黑帮摊位对峙',
      audioPlanPath: `sceneforge/remix/variants/${variantId}/audio_plan.json`,
    },
  ];
}

function buildProcessingSnapshot(sourceAsset: SourceAsset): RemixAssetProcessingSnapshot {
  return {
    sourceAsset,
    processingStageStates: {
      remix_source_import: 'approved',
      remix_segmentation: 'ready_for_review',
      remix_keyframes: 'not_started',
      remix_understanding: 'not_started',
    },
  };
}

function buildCreationWorkspace(
  sourceAsset: SourceAsset,
  variant: RemixVariant,
  editedKeyframeStatus: RemixEditedKeyframeStatus = 'generated',
  qualityChecks: RemixQualityCheck[] = [],
): RemixCreationWorkspaceSnapshot {
  return {
    sourceAsset: buildSourceAssetSummary(sourceAsset),
    variant,
    keyframeEditPrompts: buildStubKeyframePrompts(variant.id, sourceAsset.id),
    editedKeyframes: [buildEditedKeyframe(variant.id, sourceAsset.id, editedKeyframeStatus, qualityChecks)],
    seedancePrompts: buildSeedancePrompts(variant.id),
    creationStageStates: {
      remix_strategy: variant.stageStatuses.remix_strategy ?? 'approved',
      remix_design: variant.stageStatuses.remix_design ?? 'running',
      remix_keyframe_edit_prompts: variant.stageStatuses.remix_keyframe_edit_prompts ?? 'not_started',
      edited_keyframes_review: variant.stageStatuses.edited_keyframes_review ?? 'not_started',
      remix_video_prompts: variant.stageStatuses.remix_video_prompts ?? 'not_started',
      remix_publish: variant.stageStatuses.remix_publish ?? 'not_started',
    },
  };
}

export class RemixService {
  async listSourceAssets(): Promise<RemixAssetLibrarySnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001', 'Remix Source Asset');
    return { sourceAssets: [buildSourceAssetSummary(sourceAsset)] };
  }

  async getSourceAsset(input: RemixSourceAssetRefInput): Promise<RemixAssetProcessingSnapshot> {
    return buildProcessingSnapshot(buildStubSourceAsset(input.sourceAssetId));
  }

  async createSourceAssetFromImport(
    input: CreateSourceAssetFromImportInput,
  ): Promise<RemixAssetProcessingSnapshot> {
    const sourceAssetId = input.importId?.trim() || 'source-from-import';
    return buildProcessingSnapshot(buildStubSourceAsset(sourceAssetId, input.title));
  }

  async runSourceSegmentation(input: RunSourceAssetStageInput): Promise<RemixAssetProcessingSnapshot> {
    const snapshot = buildProcessingSnapshot(buildStubSourceAsset(input.sourceAssetId));
    snapshot.processingStageStates.remix_segmentation = 'approved';
    snapshot.processingStageStates.remix_keyframes = 'ready_for_review';
    return snapshot;
  }

  async runSourceKeyframes(input: RunSourceAssetStageInput): Promise<RemixAssetProcessingSnapshot> {
    const snapshot = buildProcessingSnapshot(buildStubSourceAsset(input.sourceAssetId));
    snapshot.processingStageStates.remix_segmentation = 'approved';
    snapshot.processingStageStates.remix_keyframes = 'approved';
    snapshot.processingStageStates.remix_understanding = 'ready_for_review';
    return snapshot;
  }

  async runSourceUnderstanding(
    input: RunSourceAssetStageInput,
  ): Promise<RemixAssetProcessingSnapshot> {
    const snapshot = buildProcessingSnapshot(buildStubSourceAsset(input.sourceAssetId));
    snapshot.processingStageStates.remix_source_import = 'approved';
    snapshot.processingStageStates.remix_segmentation = 'approved';
    snapshot.processingStageStates.remix_keyframes = 'approved';
    snapshot.processingStageStates.remix_understanding = 'ready_for_review';
    return snapshot;
  }

  async publishSourceAssetToLibrary(
    input: RemixSourceAssetRefInput,
  ): Promise<RemixAssetProcessingSnapshot> {
    const sourceAsset = buildStubSourceAsset(input.sourceAssetId);
    sourceAsset.status = 'published_to_library';
    return buildProcessingSnapshot(sourceAsset);
  }

  async createVariantFromSourceAsset(
    input: CreateVariantFromSourceAssetInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset(input.sourceAssetId);
    const variant = buildStubVariant(input.sourceAssetId, 'variant-001', {
      name: input.name,
      concept: input.concept,
      referenceStrength: input.referenceStrength ?? 'strong',
      retentionMatrix: input.retentionMatrix ?? DEFAULT_RETENTION_MATRIX,
      defaultGenerationMode: input.defaultGenerationMode ?? 'keyframes_plus_source_clip',
    });
    return buildCreationWorkspace(sourceAsset, variant);
  }

  async getCreationWorkspace(
    input: RemixVariantRefInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    return buildCreationWorkspace(sourceAsset, buildStubVariant(sourceAsset.id, input.variantId));
  }

  async updateVariantConfig(
    input: UpdateVariantConfigInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      name: input.name ?? '动物拟人版',
      concept: input.concept ?? '保持冲突节奏，替换为动物黑帮对峙',
      referenceStrength: input.referenceStrength ?? 'strong',
      retentionMatrix: input.retentionMatrix ?? DEFAULT_RETENTION_MATRIX,
      defaultGenerationMode: input.defaultGenerationMode ?? 'keyframes_plus_source_clip',
      segmentGenerationModeOverrides: input.segmentGenerationModeOverrides ?? { 'segment-001': 'keyframes_only' },
    });
    return buildCreationWorkspace(sourceAsset, variant);
  }

  async runRemixStrategy(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      currentStage: 'remix_strategy',
      stageStatuses: {
        remix_strategy: 'ready_for_review',
        remix_design: 'not_started',
        remix_keyframe_edit_prompts: 'not_started',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
    return buildCreationWorkspace(sourceAsset, variant);
  }

  async runRemixDesign(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      currentStage: 'remix_design',
      stageStatuses: {
        remix_strategy: 'approved',
        remix_design: 'ready_for_review',
        remix_keyframe_edit_prompts: 'not_started',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
    return buildCreationWorkspace(sourceAsset, variant);
  }

  async runKeyframeEditPrompts(
    input: RemixVariantRefInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      currentStage: 'remix_keyframe_edit_prompts',
      stageStatuses: {
        remix_strategy: 'approved',
        remix_design: 'approved',
        remix_keyframe_edit_prompts: 'ready_for_review',
        edited_keyframes_review: 'not_started',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
    return buildCreationWorkspace(sourceAsset, variant);
  }

  async registerEditedKeyframe(
    input: RegisterEditedKeyframeInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      currentStage: 'edited_keyframes_review',
      stageStatuses: {
        remix_strategy: 'approved',
        remix_design: 'approved',
        remix_keyframe_edit_prompts: 'approved',
        edited_keyframes_review: 'running',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
    const workspace = buildCreationWorkspace(sourceAsset, variant, 'generated');
    workspace.editedKeyframes = [
      {
        id: `${input.variantId}-${input.segmentId}-${input.frameRole}-edited`,
        variantId: input.variantId,
        segmentId: input.segmentId,
        frameRole: input.frameRole,
        sourceFramePath: input.sourceFramePath,
        promptPath: input.promptPath,
        editedFramePath: input.editedFramePath,
        status: 'generated',
        qualityChecks: [],
        createdAt: now(),
        updatedAt: now(),
      },
    ];
    return workspace;
  }

  async updateEditedKeyframeStatus(
    input: UpdateEditedKeyframeStatusInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      currentStage: 'edited_keyframes_review',
      stageStatuses: {
        remix_strategy: 'approved',
        remix_design: 'approved',
        remix_keyframe_edit_prompts: 'approved',
        edited_keyframes_review: input.status === 'approved' ? 'ready_for_review' : 'running',
        remix_video_prompts: 'not_started',
        remix_publish: 'not_started',
      },
    });
    const qualityChecks = input.qualityChecks ?? [];
    const workspace = buildCreationWorkspace(sourceAsset, variant, input.status, qualityChecks);
    workspace.editedKeyframes[0].id = input.editedKeyframeId;
    return workspace;
  }

  async runSeedancePrompts(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot> {
    const sourceAsset = buildStubSourceAsset('source-001');
    const variant = buildStubVariant(sourceAsset.id, input.variantId, {
      currentStage: 'remix_video_prompts',
      stageStatuses: {
        remix_strategy: 'approved',
        remix_design: 'approved',
        remix_keyframe_edit_prompts: 'approved',
        edited_keyframes_review: 'approved',
        remix_video_prompts: 'ready_for_review',
        remix_publish: 'not_started',
      },
    });
    return buildCreationWorkspace(sourceAsset, variant, 'approved', [
      { code: 'continuity', label: '连续性检查', passed: true },
    ]);
  }

  async exportPromptBundle(input: RemixVariantRefInput): Promise<ExportPromptBundleResult> {
    const workspace = await this.runSeedancePrompts(input);
    return {
      bundlePath: getRemixVariantPromptBundlePath(input.variantId),
      workspace,
    };
  }
}
