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
  RunSourceSegmentationInput,
  RunSourceAssetStageInput,
  UpdateSourceSegmentsInput,
  UpdateSourceAssetMetadataInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
  RenameVariantInput,
  SegmentKeyframeActionInput,
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

/** 可变会话快照：update / publish 等同一会话内读写一致（演示与测试用） */
const processingSnapshotSession = new Map<string, RemixAssetProcessingSnapshot>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findSourceAsset(sourceAssetId: string): SourceAsset {
  return clone(
    MOCK_SOURCE_ASSETS.find((sourceAsset) => sourceAsset.id === sourceAssetId) ?? MOCK_SOURCE_ASSETS[1],
  );
}

function getMutableProcessingSnapshot(sourceAssetId: string): RemixAssetProcessingSnapshot {
  const cached = processingSnapshotSession.get(sourceAssetId);
  if (cached) {
    return cached;
  }
  const base = clone(
    MOCK_ASSET_PROCESSING_SNAPSHOTS[sourceAssetId] ?? MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
  );
  processingSnapshotSession.set(sourceAssetId, base);
  return base;
}

function findProcessingSnapshot(sourceAssetId: string): RemixAssetProcessingSnapshot {
  return clone(getMutableProcessingSnapshot(sourceAssetId));
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


function buildMockUnderstandingWorkbench(
  asset: SourceAsset,
): import('../../../../electron/sceneforge/remix/remix-understanding-workbench').RemixUnderstandingWorkbenchSnapshot {
  const segments = asset.segments.map((segment) => ({
    segmentId: segment.id,
    segmentIndex: segment.index,
    title: segment.title,
    timeRangeLabel: '00:00 - 00:10',
    thumbnailPath: segment.keyframes[0]?.imagePath ?? null,
    transcript: {
      asrText: 'Whisper 原始文本',
      correctedText: '',
      effectiveText: 'Whisper 原始文本',
      correctionStatus: 'raw' as const,
      source: 'aligned_from_source_transcript',
      engine: 'local_whisper_cpp',
      timestampLevel: 'sentence',
      warnings: [],
    },
    visual: {
      sceneSummary: '微暗的室内环境，窗外隐约有光线射入',
      mainAction: '缓慢抬头',
      characters: ['角色A'],
      environmentDetails: '微暗的室内环境',
      props: ['桌子'],
      lighting: '侧面自然光照',
      colorTone: '冷色调',
    },
    camera: {
      shotSize: '中近景',
      movement: '固定镜头',
    },
    story: {
      plotFunction: '推进情绪',
    },
    remix: {
      keepElements: ['压迫节奏'],
      replaceableElements: ['角色身份'],
      rewriteIdeas: ['将角色身份替换为赛博朋克风格'],
      riskNotes: [],
    },
    videoPrompt: {
      version: 2 as const,
      fullChinesePrompt: `固定镜头，${segment.title} 缓慢抬头。人物主体神态严肃，胶片质感。`,
      dimensions: [
        { key: 'subject', label: '👤 人物主体', text: `${segment.title}中的主角，服装整洁，神态严肃` },
        { key: 'scene', label: '🏠 空间场景', text: '微暗的室内环境，窗外隐约有光线射入' },
        { key: 'action', label: '🏃 动作流程', text: '缓慢抬头，视线转向镜头前' },
        { key: 'camera', label: '🎥 镜头语言', text: '中近景，平视固定镜头' },
      ],
      negativePrompt: '避免画面闪烁，避免变形，避免卡通动漫风格',
    },
    frameVision: {
      available: true,
      segmentVisualSummary: '画面中一个人在微暗的室内低着头，随后慢慢抬起，表情冰冷。',
      warnings: [],
    },
    quality: {
      confidence: 0.86,
      needsHumanReview: false,
      warnings: [],
    },
    isStale: false,
    staleReasons: [],
    understandingPath: segment.analysisJsonPath ?? '',
    isPlaceholder: false,
  }));

  const hasSavedAnnotation = (asset.tags?.length ?? 0) > 0;

  return {
    ready: true,
    version: 2 as const,
    isPlaceholder: false,
    isStale: false,
    staleSegmentIds: [],
    staleReasons: [],
    rollupFallbackUsed: false,
    errors: [],
    overview: {
      logline: '这是在阴暗室内展开的心理博弈。',
      storySummaryShort: '两方角色各怀鬼胎，在一间阴暗狭小的房间中对峙。',
      storyContent: '全片围绕对峙与情绪升温展开。双方通过简短的台词和眼神交锋，使房间内的压迫感达到顶点。',
      eventChain: ['角色对峙开场', '台词交锋升温', '情绪爆发结束'],
      characterMap: [
        { nameOrRole: '角色A', description: '神态严肃的中年男子', relation: '对峙方' },
      ],
      mainConflict: '眼神与语言交锋中的心理防线突破。',
      emotionCurve: '紧张 → 压迫',
      visualStyle: '冷调、暗室、高对比胶片感',
      dialogueStyle: '冰冷、断片式、充满悬疑',
      remixDirections: [
        { title: '身份替换', idea: '将角色A替换为科幻人工智能', suitableStyle: '赛博朋克' },
        { title: '节奏增强', idea: '加快剪辑速度，强化心跳环境音' },
      ],
      warnings: [],
    },
    segments,
    annotationPrefill: hasSavedAnnotation
      ? null
      : {
          suggestedTags: ['压迫节奏', '角色身份'],
          suggestedNote: '【AI 预填，请按真实观感修正】\n片段 01：保留 压迫节奏；可替换 角色身份。',
        },
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
    const snapshot = getMutableProcessingSnapshot(input.sourceAssetId);
    snapshot.sourceAsset.tags = clone(input.tags ?? snapshot.sourceAsset.tags);
    snapshot.sourceAsset.annotationNote =
      input.annotationNote !== undefined
        ? input.annotationNote?.trim() || null
        : snapshot.sourceAsset.annotationNote ?? null;
    snapshot.sourceAsset.lastAnnotatedAt = NOW;
    snapshot.sourceAsset.annotatedBy = input.annotatedBy ?? 'Remix Editor';
    snapshot.sourceAsset.annotationSource = input.annotationSource ?? 'workspace_manual';
    snapshot.sourceAsset.updatedAt = NOW;
    return clone(snapshot);
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
    snapshot.sourceAsset.segmentationMode = (input as RunSourceSegmentationInput).mode ?? 'fast';
    snapshot.sourceAsset.segmentationDiagnostics = {
      mode: snapshot.sourceAsset.segmentationMode,
      detector: snapshot.sourceAsset.segmentationMode === 'accurate' ? 'hybrid' : 'adaptive',
      inputProfile: {
        durationMs: snapshot.sourceAsset.videoMetadata.durationMs,
        fps: snapshot.sourceAsset.videoMetadata.fps ?? 25,
        analysisFps: snapshot.sourceAsset.segmentationMode === 'accurate' ? 12 : 8,
        width: snapshot.sourceAsset.videoMetadata.width,
        height: snapshot.sourceAsset.videoMetadata.height,
        frameCount: 96,
      },
      lowConfidenceSegmentIds: [],
      notes: ['Mock segmentation diagnostics'],
      usedFallback: snapshot.sourceAsset.segmentationMode === 'accurate',
      preserveManualEdits: (input as RunSourceSegmentationInput).preserveManualEdits ?? true,
      generatedAt: NOW,
    };
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

  async runSourceAudio(input: RunSourceAssetStageInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_segmentation', 'approved');
    return snapshot;
  },

  async runSourceTranscript(input: RunSourceAssetStageInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_segmentation', 'approved');
    return snapshot;
  },

  async addSegmentMiddleKeyframe(input: SegmentKeyframeActionInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    const segment = snapshot.sourceAsset.segments.find((s) => s.id === input.segmentId);
    if (segment && !segment.keyframes.some((kf) => kf.frameRole === 'middle')) {
      segment.keyframes.splice(1, 0, {
        id: `${input.sourceAssetId}-${input.segmentId}-middle`,
        sourceAssetId: input.sourceAssetId,
        segmentId: input.segmentId,
        frameRole: 'middle',
        timestampMs: Math.round(segment.timeRange.startMs + (segment.timeRange.endMs - segment.timeRange.startMs) / 2),
        imagePath: `sceneforge/remix/source-assets/${input.sourceAssetId}/source_segments/${input.segmentId}/middle_frame.png`,
      });
    }
    return snapshot;
  },

  async deleteSegmentMiddleKeyframe(input: SegmentKeyframeActionInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    const segment = snapshot.sourceAsset.segments.find((s) => s.id === input.segmentId);
    if (segment) {
      segment.keyframes = segment.keyframes.filter((kf) => kf.frameRole !== 'middle');
    }
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

  async rerunSegmentUnderstanding(input: SegmentKeyframeActionInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_understanding', 'approved');
    return snapshot;
  },

  async rerunSegmentTranscript(input: SegmentKeyframeActionInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_understanding', 'approved');
    return snapshot;
  },

  async runSegmentFrameVision(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
  }): Promise<import('../../../../electron/sceneforge/remix/remix-frame-vision-service').RemixSegmentFrameVisionDocument> {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    const segment = snapshot.sourceAsset.segments.find((s) => s.id === input.segmentId);
    const targetRoles = ['first', 'middle', 'last'];
    const targetFrames = segment ? segment.keyframes.filter((f) => targetRoles.includes(f.frameRole)) : [];

    return {
      schema: 'sceneforge-remix-segment-frame-vision',
      version: 1,
      sourceAssetId: input.sourceAssetId,
      segmentId: input.segmentId,
      generatedAt: new Date().toISOString(),
      inputHash: 'mock-vision-input-hash',
      provider: 'mock-provider',
      model: 'mock-model',
      frames: targetFrames.map((f) => ({
        frameId: f.id,
        frameRole: f.frameRole,
        timestampMs: f.timestampMs,
        imagePath: f.imagePath,
        imageHash: 'mock-image-hash',
        caption: `（Mock 视觉分析）${f.frameRole}帧的主体动作。`,
        onScreenSubtitles: [],
        visibleCharacters: ['主角'],
        visibleActions: ['移动', '抬头'],
        environment: 'Mock 场景空间',
        props: ['服装'],
        lighting: '自然光照',
        composition: '主体居中',
        confidence: 0.9,
        warnings: [],
      })),
      segmentVisualSummary: `【first帧】（Mock 视觉分析）首帧的主体动作；【middle帧】（Mock 视觉分析）中帧的主体动作`,
      onScreenSubtitles: [],
      quality: {
        needsHumanReview: false,
        warnings: [],
      },
    };
  },

  async rerunOriginalStoryRollup(input: RemixSourceAssetRefInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_understanding', 'approved');
    return snapshot;
  },

  async exportUnderstandingReport(input: {
    projectDir: string;
    sourceAssetId: string;
    format?: 'markdown';
  }) {
    return {
      reportPath: `${input.projectDir}/original_understanding_v2.md`,
    };
  },

  async getSourceUnderstandingWorkbench(input: RemixSourceAssetRefInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    return buildMockUnderstandingWorkbench(snapshot.sourceAsset);
  },

  async validateUnderstandingFreshness(input: RemixSourceAssetRefInput) {
    return {
      sourceAssetId: input.sourceAssetId,
      isStale: false,
      staleSegmentIds: [],
      staleReasons: [],
      segmentReports: [],
      checkedAt: new Date().toISOString(),
    };
  },

  async rerunStaleSegmentUnderstandings(input: RemixSourceAssetRefInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    setProcessingStage(snapshot, 'remix_understanding', 'approved');
    return snapshot;
  },

  async getSegmentTranscriptCorrection(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
  }) {
    return {
      schema: 'sceneforge-remix-segment-transcript-correction' as const,
      version: 1,
      sourceAssetId: input.sourceAssetId,
      segmentId: input.segmentId,
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputRefs: {
        sourceTranscriptPath: null,
        segmentTranscriptPath: null,
      },
      transcript: {
        asrText: 'Whisper 原始文本',
        correctedText: '',
        effectiveText: 'Whisper 原始文本',
        correctionStatus: 'raw' as const,
        language: 'zh-CN' as const,
        notes: [],
      },
      dialogueLines: [],
      quality: {
        needsHumanReview: false,
        warnings: [],
      },
    };
  },

  async updateSegmentTranscriptCorrection(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
    correctedText: string;
    markConfirmed?: boolean;
  }) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    const workbench = buildMockUnderstandingWorkbench(snapshot.sourceAsset);
    const segment = workbench.segments.find((s) => s.segmentId === input.segmentId);
    if (segment) {
      segment.transcript.correctedText = input.correctedText;
      segment.transcript.correctionStatus = input.markConfirmed ? 'confirmed' : 'edited';
      segment.transcript.effectiveText = input.correctedText;
      segment.isStale = true;
    }
    workbench.isStale = true;
    workbench.staleSegmentIds.push(input.segmentId);
    return workbench;
  },

  async updateSegmentPositiveVideoPrompt(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
    positiveText: string;
    negativeText?: string | null;
  }) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    const workbench = buildMockUnderstandingWorkbench(snapshot.sourceAsset);
    const segment = workbench.segments.find((s) => s.segmentId === input.segmentId);
    if (segment) {
      segment.videoPrompt.fullChinesePrompt = input.positiveText.trim();
      if (input.negativeText != null) {
        segment.videoPrompt.negativePrompt = input.negativeText.trim();
      }
    }
    return workbench;
  },

  async confirmAllSegmentTranscripts(input: {
    projectDir: string;
    sourceAssetId: string;
  }) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    const workbench = buildMockUnderstandingWorkbench(snapshot.sourceAsset);
    for (const segment of workbench.segments) {
      segment.transcript.correctionStatus = 'confirmed';
    }
    setProcessingStage(snapshot, 'remix_understanding', 'approved');
    return snapshot;
  },

  async updateSourceSegments(input: UpdateSourceSegmentsInput) {
    const snapshot = findProcessingSnapshot(input.sourceAssetId);
    snapshot.sourceAsset.segments = clone(input.segments);
    snapshot.sourceAsset.manualSegmentationOverride = {
      updatedAt: NOW,
      reason: input.reason,
      preserveOnRerun: input.preserveOnRerun ?? true,
      segments: clone(input.segments),
    };
    return snapshot;
  },

  async getSegmentationDiagnostics(input: RemixSourceAssetRefInput) {
    return findProcessingSnapshot(input.sourceAssetId).sourceAsset.segmentationDiagnostics ?? null;
  },

  async validateSourceAssetMedia(input: RemixSourceAssetRefInput) {
    return clone(findProcessingSnapshot(input.sourceAssetId).sourceAsset.mediaValidation ?? {
      sourceVideo: {
        path: null,
        exists: false,
        readable: false,
        error: '缺少源视频路径',
      },
      keyframes: {
        totalCount: 0,
        validCount: 0,
        invalidCount: 0,
        items: [],
      },
      thumbnail: {
        source: 'fallback',
        status: 'failed',
        error: '缺少可用缩略图。',
      },
      validatedAt: NOW,
    });
  },

  async searchPublishedSourceAssets(input: { projectDir: string; query?: string | null; limit?: number }) {
    const query = input.query?.trim();
    const assets = Array.from(processingSnapshotSession.values())
      .map((snapshot: RemixAssetProcessingSnapshot) => snapshot.sourceAsset)
      .filter((asset: SourceAsset) => asset.status === 'published_to_library')
      .filter((asset: SourceAsset) => !query || asset.title.includes(query) || asset.tags.some((tag: string) => tag.includes(query)))
      .slice(0, input.limit ?? 20)
      .map((asset: SourceAsset) => ({
        id: asset.id,
        title: asset.title,
        status: asset.status,
        durationMs: asset.videoMetadata.durationMs,
        segmentCount: asset.segments.length,
        keyframeCount: asset.segments.reduce((sum: number, segment) => sum + segment.keyframes.length, 0),
        variantCount: asset.variantCount,
        updatedAt: asset.updatedAt,
        tags: [...asset.tags],
        annotationNote: asset.annotationNote ?? null,
        publishedAt: asset.updatedAt,
        thumbnailPath: asset.segments[0]?.keyframes[0]?.imagePath ?? null,
        logline: 'Mock Logline',
        storySummaryShort: 'Mock Summary',
        mainConflict: 'Mock Conflict',
        visualStyle: 'Mock Visual',
        dialogueStyle: 'Mock Dialogue',
      }));
    return { sourceAssets: assets };
  },

  async rebuildPublishedSourceAssetLibrary(input: { projectDir: string; sourceAssetIds?: string[] | null }) {
    const candidates = input.sourceAssetIds?.length
      ? input.sourceAssetIds
      : Array.from(processingSnapshotSession.values()).map((snapshot: RemixAssetProcessingSnapshot) => snapshot.sourceAsset.id);
    return {
      rebuiltAssetIds: candidates.filter((id: string) => getMutableProcessingSnapshot(id).sourceAsset.status === 'published_to_library'),
      skippedAssetIds: candidates.filter((id: string) => getMutableProcessingSnapshot(id).sourceAsset.status !== 'published_to_library'),
    };
  },

  async publishSourceAssetToLibrary(input: RemixSourceAssetRefInput) {
    const snapshot = getMutableProcessingSnapshot(input.sourceAssetId);
    if ((snapshot.sourceAsset.tags ?? []).length === 0) {
      throw new Error('请先保存至少一个资产标签。');
    }
    snapshot.sourceAsset.status = 'published_to_library';
    snapshot.sourceAsset.updatedAt = NOW;
    return clone(snapshot);
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
