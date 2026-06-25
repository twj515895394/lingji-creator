import type {
  EditedKeyframe,
  KeyframeEditPrompt,
  RemixAssetLibrarySection,
  RemixAssetProcessingSnapshot,
  RemixCreationWorkspaceSnapshot,
  RemixEditedKeyframeStatus,
  RemixGenerationMode,
  RemixKeyframeRole,
  RemixProcessingJob,
  RemixQualityCheck,
  RemixReferenceStrength,
  RemixSegmentBoundaryType,
  RemixStageStatus,
  RetentionMatrix,
  SourceAsset,
  SourceKeyframe,
  SourceSegment,
} from '../types';
import {
  MOCK_ASSET_PROCESSING_SNAPSHOTS,
  MOCK_CREATION_WORKSPACE_SNAPSHOT,
} from '../mock/mock-data';
import { REMIX_CREATION_NAV_ITEMS } from './remix-stage-nav';

export type AssetProcessingStepId =
  | 'source-import'
  | 'segmentation'
  | 'keyframes'
  | 'understanding'
  | 'annotate'
  | 'publish-source';

export type CreationStepId =
  | 'select-asset'
  | 'create-variant'
  | 'strategy'
  | 'design'
  | 'keyframe-prompts'
  | 'edited-keyframes'
  | 'seedance-prompts'
  | 'publish-bundle';

export interface PublishChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  note: string;
}

export interface RetentionMatrixDimension {
  key: keyof RetentionMatrix;
  label: string;
  description: string;
  options: Array<{ value: RetentionMatrix[keyof RetentionMatrix]; label: string }>;
}

export interface SegmentStrategyItem {
  segmentId: string;
  title: string;
  keep: string;
  change: string;
  risk: string;
}

export interface DesignSection {
  id: string;
  title: string;
  body: string;
}

export interface PromptDisplayItem {
  id: string;
  title: string;
  body: string;
  meta: string;
}

export interface SeedanceDisplayItem {
  id: string;
  title: string;
  generationModeLabel: string;
  summary: string;
}

export interface SourceOverviewSummaryItem {
  label: string;
  value: string;
}

export interface SegmentAnalysisItem {
  id: string;
  title: string;
  timeRange: string;
  boundaryLabel: string;
  keyframeSummary: string;
  note: string;
}

const STAGE_STATUS_LABELS: Record<RemixStageStatus, string> = {
  not_started: '未开始',
  running: '进行中',
  needs_input: '待补充',
  ready_for_review: '待确认',
  approved: '已完成',
  failed: '失败',
};

const REFERENCE_STRENGTH_LABELS: Record<RemixReferenceStrength, string> = {
  light: '轻引用',
  medium: '均衡引用',
  strong: '强引用',
};

const GENERATION_MODE_LABELS: Record<RemixGenerationMode, string> = {
  keyframes_only: '仅关键帧',
  keyframes_plus_source_clip: '关键帧 + 原片片段',
};

const KEYFRAME_ROLE_LABELS: Record<RemixKeyframeRole, string> = {
  first: '首帧',
  middle: '中间帧',
  last: '尾帧',
};

const SEGMENT_BOUNDARY_LABELS: Record<RemixSegmentBoundaryType, string> = {
  source_shot: '原镜头',
  merged_short_shots: '短镜头合并',
  split_long_shot: '长镜头拆分',
  long_segment: '长段保留',
};

const EDITED_KEYFRAME_STATUS_LABELS: Record<RemixEditedKeyframeStatus, string> = {
  pending: '待生成',
  generated: '已生成',
  needs_revision: '待返修',
  approved: '已通过',
  rejected: '已拒绝',
};

export const RETENTION_MATRIX_DIMENSIONS: RetentionMatrixDimension[] = [
  {
    key: 'plotStructure',
    label: '剧情结构',
    description: '保留原始攻防节奏还是重写推进方式。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'soft_keep', label: '轻改' },
      { value: 'rewrite', label: '重写' },
    ],
  },
  {
    key: 'characterRelationship',
    label: '角色关系',
    description: '人物身份与彼此关系保留程度。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'replace_identity', label: '换身份' },
      { value: 'rebuild', label: '重建关系' },
    ],
  },
  {
    key: 'dialogueMeaning',
    label: '对白含义',
    description: '核心信息点是保留、改写还是完全新写。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'rewrite', label: '改写' },
      { value: 'new_dialogue', label: '新对白' },
    ],
  },
  {
    key: 'dialogueRhythm',
    label: '对白节奏',
    description: '停顿、轮次与句长的保留程度。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'adjust', label: '调整' },
      { value: 'redo', label: '重做' },
    ],
  },
  {
    key: 'performanceAction',
    label: '表演动作',
    description: '动作幅度、压迫感和表演夸张度。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'exaggerate', label: '强化' },
      { value: 'redo', label: '重做' },
    ],
  },
  {
    key: 'cameraComposition',
    label: '镜头构图',
    description: '构图、机位与景别延续程度。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'soft_keep', label: '轻改' },
      { value: 'redo', label: '重做' },
    ],
  },
  {
    key: 'sceneEnvironment',
    label: '场景环境',
    description: '原始场域是否继续保留。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'replace', label: '替换' },
      { value: 'abstract', label: '抽象化' },
    ],
  },
  {
    key: 'visualStyle',
    label: '视觉风格',
    description: '保留原风格还是转向新风格。',
    options: [
      { value: 'original', label: '原风格' },
      { value: 'new_style', label: '新风格' },
      { value: 'hybrid', label: '混合' },
    ],
  },
  {
    key: 'memeMechanism',
    label: '梗机制',
    description: '保留包袱机制还是换成新梗。',
    options: [
      { value: 'keep', label: '保留' },
      { value: 'enhance', label: '强化' },
      { value: 'replace_hot_meme', label: '换热梗' },
    ],
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function formatRemixDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatRemixTimestamp(timestampMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timestampMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatRemixTimeRange(segment: SourceSegment): string {
  return `${formatRemixTimestamp(segment.timeRange.startMs)} - ${formatRemixTimestamp(segment.timeRange.endMs)}`;
}

export function findSourceSegmentAtTime(
  asset: SourceAsset,
  timeMs: number,
): SourceSegment | null {
  if (!asset.segments.length) {
    return null;
  }

  const clampedTimeMs = Math.max(0, timeMs);
  return (
    asset.segments.find((segment, index) => {
      const isLast = index === asset.segments.length - 1;
      return isLast
        ? clampedTimeMs >= segment.timeRange.startMs && clampedTimeMs <= segment.timeRange.endMs
        : clampedTimeMs >= segment.timeRange.startMs && clampedTimeMs < segment.timeRange.endMs;
    }) ?? asset.segments[0]
  );
}

export function getCreationStepTitle(stepId: CreationStepId): string {
  return REMIX_CREATION_NAV_ITEMS.find((item) => item.id === stepId)?.title ?? stepId;
}

export function getStageStatusLabel(status: RemixStageStatus): string {
  return STAGE_STATUS_LABELS[status];
}

export function getReferenceStrengthLabel(value: RemixReferenceStrength): string {
  return REFERENCE_STRENGTH_LABELS[value];
}

export function getGenerationModeLabel(value: RemixGenerationMode): string {
  return GENERATION_MODE_LABELS[value];
}

export function getKeyframeRoleLabel(value: RemixKeyframeRole): string {
  return KEYFRAME_ROLE_LABELS[value];
}

export function getSegmentBoundaryLabel(value: RemixSegmentBoundaryType): string {
  return SEGMENT_BOUNDARY_LABELS[value];
}

export function getEditedKeyframeStatusLabel(value: RemixEditedKeyframeStatus): string {
  return EDITED_KEYFRAME_STATUS_LABELS[value];
}

export function getRetentionMatrixChoiceLabel<K extends keyof RetentionMatrix>(
  key: K,
  value: RetentionMatrix[K],
): string {
  const dimension = RETENTION_MATRIX_DIMENSIONS.find((item) => item.key === key);
  return (
    dimension?.options.find((option) => option.value === value)?.label ??
    String(value)
  );
}

export function getRetentionMatrixValueIndex<K extends keyof RetentionMatrix>(
  key: K,
  value: RetentionMatrix[K],
): number {
  const dimension = RETENTION_MATRIX_DIMENSIONS.find((item) => item.key === key);
  return Math.max(
    0,
    dimension?.options.findIndex((option) => option.value === value) ?? 0,
  );
}

export function getRetentionChoiceValue<K extends keyof RetentionMatrix>(
  key: K,
  index: number,
): RetentionMatrix[K] {
  const dimension = RETENTION_MATRIX_DIMENSIONS.find((item) => item.key === key);
  const clampedIndex = Math.max(0, Math.min(index, (dimension?.options.length ?? 1) - 1));
  return (dimension?.options[clampedIndex]?.value ?? dimension?.options[0]?.value) as RetentionMatrix[K];
}

export function getAssetProcessingSnapshot(sourceAssetId: string): RemixAssetProcessingSnapshot {
  return clone(
    MOCK_ASSET_PROCESSING_SNAPSHOTS[sourceAssetId] ??
      MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
  );
}

export function getCreationWorkspaceSnapshot(variantId: string): RemixCreationWorkspaceSnapshot {
  const snapshot = clone(MOCK_CREATION_WORKSPACE_SNAPSHOT);
  snapshot.variant.id = variantId;
  snapshot.keyframeEditPrompts = snapshot.keyframeEditPrompts.map((prompt) => ({
    ...prompt,
    variantId,
  }));
  snapshot.editedKeyframes = snapshot.editedKeyframes.map((frame) => ({
    ...frame,
    variantId,
  }));
  snapshot.seedancePrompts = snapshot.seedancePrompts.map((prompt) => ({
    ...prompt,
    variantId,
  }));
  return snapshot;
}

function resolveWorkspaceSourceAsset(snapshot: RemixCreationWorkspaceSnapshot): SourceAsset {
  return snapshot.sourceAssetDetails ?? getAssetProcessingSnapshot(snapshot.sourceAsset.id).sourceAsset;
}

export function flattenAssetKeyframes(asset: SourceAsset): SourceKeyframe[] {
  return asset.segments.flatMap((segment) => segment.keyframes);
}

export function buildSourceOverviewMarkdown(asset: SourceAsset): string {
  const tags = asset.tags.length > 0 ? asset.tags.join(' / ') : '未打标签';
  return [
    `# Source Overview`,
    ``,
    `- 标题：${asset.title}`,
    `- 时长：${formatRemixDuration(asset.videoMetadata.durationMs)}`,
    `- 分辨率：${asset.videoMetadata.width} × ${asset.videoMetadata.height}`,
    `- 音频：${asset.videoMetadata.hasAudio ? '保留原音轨' : '无音频'}`,
    `- 标签：${tags}`,
    ``,
    `## 处理判断`,
    `当前素材更适合先沉淀压迫感、停顿节奏和镜头边界，再决定哪些结构能被二创保留。`,
  ].join('\n');
}

export function buildSourceOverviewSummary(asset: SourceAsset): SourceOverviewSummaryItem[] {
  return [
    { label: '素材时长', value: formatRemixDuration(asset.videoMetadata.durationMs) },
    { label: '画面规格', value: `${asset.videoMetadata.width} × ${asset.videoMetadata.height}` },
    { label: '镜头分段', value: `${asset.segments.length} 段` },
    { label: '关键帧', value: `${flattenAssetKeyframes(asset).length} 张` },
    { label: '音频情况', value: asset.videoMetadata.hasAudio ? '保留原音轨' : '无音频' },
    { label: '标签', value: asset.tags.length > 0 ? asset.tags.join(' / ') : '未打标签' },
  ];
}

export function buildSourceOverviewFocus(asset: SourceAsset): string {
  const dominantBoundary = asset.segments.some((segment) => segment.boundaryType === 'split_long_shot')
    ? '优先盯长镜头拆分后的情绪断点，避免把节奏切碎。'
    : asset.segments.some((segment) => segment.boundaryType === 'merged_short_shots')
      ? '优先盯短镜头合并后的反打节奏，确认包袱点没有被抹平。'
      : '优先盯原始镜头边界和表演停顿，确认后续二创不会破坏压迫感。';
  return dominantBoundary;
}

export function buildSegmentAnalysisItems(asset: SourceAsset): SegmentAnalysisItem[] {
  return asset.segments.map((segment) => ({
    id: segment.id,
    title: `${String(segment.index).padStart(2, '0')} · ${segment.title}`,
    timeRange: `${formatRemixTimeRange(segment)} (${formatRemixDuration(segment.timeRange.durationMs)})`,
    boundaryLabel: getSegmentBoundaryLabel(segment.boundaryType),
    keyframeSummary: segment.keyframes.map((frame) => getKeyframeRoleLabel(frame.frameRole)).join(' / '),
    note: buildSegmentNote(segment),
  }));
}

export function buildSegmentAnalysisMarkdown(asset: SourceAsset): string {
  return asset.segments
    .map((segment) =>
      [
        `### ${String(segment.index).padStart(2, '0')} · ${segment.title}`,
        `- 时间范围：${formatRemixTimeRange(segment)} (${formatRemixDuration(segment.timeRange.durationMs)})`,
        `- 边界类型：${getSegmentBoundaryLabel(segment.boundaryType)}`,
        `- 关键帧：${segment.keyframes.map((frame) => getKeyframeRoleLabel(frame.frameRole)).join(' / ')}`,
        `- 备注：${buildSegmentNote(segment)}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function buildSegmentNote(segment: SourceSegment): string {
  if (segment.boundaryType === 'long_segment') {
    return '长段镜头保留情绪蓄力，避免过度碎切。';
  }
  if (segment.boundaryType === 'split_long_shot') {
    return '长镜头拆成两段，便于后续分别做动作与情绪改写。';
  }
  if (segment.boundaryType === 'merged_short_shots') {
    return '短镜头合并后保留原始反打节奏。';
  }
  return '单镜头边界清晰，可直接承接后续策略与设计。';
}

export function getAssetProcessingStepStatuses(
  snapshot: RemixAssetProcessingSnapshot,
  hasUnsavedAnnotationChanges: boolean,
): Record<AssetProcessingStepId, RemixStageStatus> {
  const understanding = snapshot.processingStageStates.remix_understanding ?? 'not_started';
  const hasSavedAnnotation =
    Array.isArray(snapshot.sourceAsset.tags) &&
    snapshot.sourceAsset.tags.length > 0 &&
    typeof snapshot.sourceAsset.annotationNote === 'string' &&
    snapshot.sourceAsset.annotationNote.trim().length > 0;
  const annotateStatus =
    understanding === 'approved'
      ? hasSavedAnnotation && !hasUnsavedAnnotationChanges
        ? 'approved'
        : 'needs_input'
      : understanding === 'failed'
        ? 'failed'
        : 'not_started';
  const publishStatus =
    snapshot.sourceAsset.status === 'published_to_library'
      ? 'approved'
      : annotateStatus === 'approved'
        ? 'ready_for_review'
        : 'not_started';

  return {
    'source-import': snapshot.processingStageStates.remix_source_import ?? 'approved',
    segmentation: snapshot.processingStageStates.remix_segmentation ?? 'not_started',
    keyframes: snapshot.processingStageStates.remix_keyframes ?? 'not_started',
    understanding,
    annotate: annotateStatus,
    'publish-source': publishStatus,
  };
}

export function getAssetLibrarySectionForStatus(
  status: RemixAssetProcessingSnapshot['sourceAsset']['status'],
): RemixAssetLibrarySection {
  if (status === 'published_to_library') {
    return 'published';
  }
  if (status === 'failed') {
    return 'failed';
  }
  return 'processing';
}

export interface AssetProcessingWorkspaceState {
  assetStatus: RemixAssetProcessingSnapshot['sourceAsset']['status'];
  activeJob: RemixProcessingJob | null;
  hasUnsavedChanges: boolean;
  returnSection: RemixAssetLibrarySection;
  blockingReason: string | null;
  completedSteps: number;
  totalSteps: number;
}

export interface AssetProcessingTaskSummary {
  assetStatus: RemixAssetProcessingSnapshot['sourceAsset']['status'];
  activeJob: RemixProcessingJob | null;
  latestFailedJob: RemixProcessingJob | null;
  blockingReason: string | null;
  completedSteps: number;
  totalSteps: number;
  returnSection: RemixAssetLibrarySection;
}

export function buildAssetProcessingTaskSummary(
  snapshot: RemixAssetProcessingSnapshot,
  hasUnsavedAnnotationChanges = false,
): AssetProcessingTaskSummary {
  const stepStatuses = getAssetProcessingStepStatuses(snapshot, hasUnsavedAnnotationChanges);
  const activeJob =
    snapshot.activeProcessingJob ??
    snapshot.processingJobs?.find((job) => job.status === 'queued' || job.status === 'running') ??
    null;
  const latestFailedJob = snapshot.processingJobs?.find((job) => job.status === 'failed') ?? null;
  const completedSteps = Object.values(stepStatuses).filter((status) => status === 'approved').length;
  const totalSteps = Object.keys(stepStatuses).length;
  const blockingReason =
    activeJob?.status === 'running'
      ? activeJob.message ?? '系统正在执行当前步骤。'
      : latestFailedJob?.error ?? null;

  return {
    assetStatus: snapshot.sourceAsset.status,
    activeJob,
    latestFailedJob,
    blockingReason,
    completedSteps,
    totalSteps,
    returnSection: getAssetLibrarySectionForStatus(snapshot.sourceAsset.status),
  };
}

export function buildAssetProcessingWorkspaceState(
  snapshot: RemixAssetProcessingSnapshot,
  options: {
    activeStepId: AssetProcessingStepId;
    hasUnsavedAnnotationChanges: boolean;
    activeJobOverride?: RemixProcessingJob | null;
  },
): AssetProcessingWorkspaceState {
  const taskSummary = buildAssetProcessingTaskSummary(snapshot, options.hasUnsavedAnnotationChanges);
  const blockingReason =
    taskSummary.activeJob?.status === 'running'
      ? taskSummary.activeJob.message ?? '系统正在执行当前步骤。'
      : options.activeStepId === 'annotate' && options.hasUnsavedAnnotationChanges
        ? '人工标注尚未保存。'
        : snapshot.sourceAsset.status === 'failed'
          ? taskSummary.latestFailedJob?.error ?? '当前素材存在失败步骤，请先恢复后再继续。'
          : null;

  return {
    assetStatus: taskSummary.assetStatus,
    activeJob: options.activeJobOverride ?? taskSummary.activeJob,
    hasUnsavedChanges: options.hasUnsavedAnnotationChanges,
    returnSection: taskSummary.returnSection,
    blockingReason,
    completedSteps: taskSummary.completedSteps,
    totalSteps: taskSummary.totalSteps,
  };
}

export function isAssetPublishReady(statuses: Record<AssetProcessingStepId, RemixStageStatus>): boolean {
  return (
    statuses['source-import'] === 'approved' &&
    statuses.segmentation === 'approved' &&
    statuses.keyframes === 'approved' &&
    statuses.understanding === 'approved' &&
    statuses.annotate === 'approved'
  );
}

export function getCreationStepStatuses(
  snapshot: RemixCreationWorkspaceSnapshot,
  checklistReady: boolean,
): Record<CreationStepId, RemixStageStatus> {
  return {
    'select-asset': 'approved',
    'create-variant': 'approved',
    strategy: snapshot.creationStageStates.remix_strategy ?? 'not_started',
    design: snapshot.creationStageStates.remix_design ?? 'not_started',
    'keyframe-prompts':
      snapshot.creationStageStates.remix_keyframe_edit_prompts ?? 'not_started',
    'edited-keyframes':
      snapshot.creationStageStates.edited_keyframes_review ?? 'not_started',
    'seedance-prompts':
      snapshot.creationStageStates.remix_video_prompts ?? 'not_started',
    'publish-bundle': checklistReady ? 'ready_for_review' : 'needs_input',
  };
}

export function buildCreationPublishChecklist(
  snapshot: RemixCreationWorkspaceSnapshot,
): PublishChecklistItem[] {
  const approvedEditedKeyframes = snapshot.keyframeEditPrompts.filter((prompt) =>
    snapshot.editedKeyframes.some(
      (frame) =>
        frame.segmentId === prompt.segmentId &&
        frame.frameRole === prompt.frameRole &&
        frame.status === 'approved',
    ),
  ).length;
  const requiredEditedKeyframes = snapshot.keyframeEditPrompts.length;
  return [
    {
      id: 'source-bound',
      label: '资产引用已锁定',
      passed: Boolean(snapshot.sourceAsset.id),
      note: `${snapshot.sourceAsset.title} 已绑定到当前二创版本（Variant）。`,
    },
    {
      id: 'variant-defined',
      label: '二创版本配置完整',
      passed: Boolean(snapshot.variant.name && snapshot.variant.concept),
      note: `${snapshot.variant.name} · ${getReferenceStrengthLabel(snapshot.variant.referenceStrength)}`,
    },
    {
      id: 'strategy-approved',
      label: '改编策略已完成',
      passed:
        (snapshot.creationStageStates.remix_strategy ?? 'not_started') === 'approved',
      note: '全局策略与逐段保留点已确认。',
    },
    {
      id: 'design-approved',
      label: '画面设计已完成',
      passed:
        (snapshot.creationStageStates.remix_design ?? 'not_started') === 'approved',
      note: '角色、场景和风格连续性已对齐。',
    },
    {
      id: 'prompt-ready',
      label: '关键帧提示词已生成',
      passed: snapshot.keyframeEditPrompts.length > 0,
      note: `${snapshot.keyframeEditPrompts.length} 条可复制提示词。`,
    },
    {
      id: 'edited-reviewed',
      label: '改后关键帧已验收',
      passed: requiredEditedKeyframes > 0 && approvedEditedKeyframes === requiredEditedKeyframes,
      note: `${approvedEditedKeyframes} / ${requiredEditedKeyframes} 张必需关键帧已通过。`,
    },
    {
      id: 'seedance-ready',
      label: 'Seedance Prompt 已整理',
      passed: snapshot.seedancePrompts.length > 0,
      note: `${snapshot.seedancePrompts.length} 段视频提示词可导出。`,
    },
  ];
}

export function isPromptBundleReady(items: PublishChecklistItem[]): boolean {
  return items.every((item) => item.passed);
}

export function buildSegmentStrategies(
  snapshot: RemixCreationWorkspaceSnapshot,
): SegmentStrategyItem[] {
  return resolveWorkspaceSourceAsset(snapshot).segments.map((segment) => ({
    segmentId: segment.id,
    title: segment.title,
    keep:
      segment.index === 1
        ? '保留原始逼近与停顿节奏。'
        : '保留原片的攻防轮次与反打结构。',
    change:
      segment.index === 1
        ? '把人物身份换成狸猫黑帮，强化压迫式对峙。'
        : '对白改写为黑帮试探，场景改为废弃高处空间。',
    risk:
      segment.boundaryType === 'long_segment'
        ? '避免镜头过长导致节奏塌陷。'
        : '注意构图不要因动物拟人化而失真。',
  }));
}

export function buildDesignSections(
  snapshot: RemixCreationWorkspaceSnapshot,
): DesignSection[] {
  return [
    {
      id: 'global-cast',
      title: '全局人物与关系',
      body: `主角群改为拟人狸猫黑帮，关系仍保留“试探 - 施压 - 回击”的轮次。`,
    },
    {
      id: 'global-space',
      title: '场景与光线',
      body: `空间保持高处风切与留白，灯光转向冷绿灰调，继续维持都市压迫感。`,
    },
    {
      id: 'global-style',
      title: '视觉风格',
      body: `采用 ${getRetentionMatrixChoiceLabel('visualStyle', snapshot.variant.retentionMatrix.visualStyle)} 策略，整体朝写实黑帮质感推进，避免赛博霓虹。`,
    },
  ];
}

export function buildKeyframePromptDisplays(
  snapshot: RemixCreationWorkspaceSnapshot,
): PromptDisplayItem[] {
  const asset = resolveWorkspaceSourceAsset(snapshot);
  return snapshot.keyframeEditPrompts.map((prompt) => {
    const segment = asset.segments.find((item) => item.id === prompt.segmentId);
    return {
      id: prompt.id,
      title: `${segment?.title ?? prompt.segmentId} · ${getKeyframeRoleLabel(prompt.frameRole)}`,
      meta: `v${prompt.promptVersion} · ${prompt.promptPath.split('/').pop() ?? 'prompt.md'}`,
      body: [
        `保留${segment?.title ?? '该段'}的构图关系与节奏停顿，把人物改成拟人狸猫黑帮。`,
        `强化风声、压迫感和中近景逼近，不要加入赛博霓虹或广告屏。`,
        `输出写实质感，继续沿用 ${getReferenceStrengthLabel(snapshot.variant.referenceStrength)} 引用。`,
      ].join('\n'),
    };
  });
}

export function buildSeedanceDisplayItems(
  snapshot: RemixCreationWorkspaceSnapshot,
): SeedanceDisplayItem[] {
  const asset = resolveWorkspaceSourceAsset(snapshot);
  return snapshot.seedancePrompts.map((prompt) => {
    const segment = asset.segments.find((item) => item.id === prompt.segmentId);
    return {
      id: prompt.id,
      title: segment?.title ?? prompt.segmentId,
      generationModeLabel: getGenerationModeLabel(prompt.generationMode),
      summary: prompt.copyablePrompt,
    };
  });
}

export function getSelectedSeedancePrompt(
  snapshot: RemixCreationWorkspaceSnapshot,
  selectedPromptId: string | null,
) {
  return (
    snapshot.seedancePrompts.find((prompt) => prompt.id === selectedPromptId) ??
    snapshot.seedancePrompts[0] ??
    null
  );
}

export function getSelectedEditedKeyframe(
  snapshot: RemixCreationWorkspaceSnapshot,
  selectedEditedKeyframeId: string | null,
) {
  return (
    snapshot.editedKeyframes.find((frame) => frame.id === selectedEditedKeyframeId) ??
    snapshot.editedKeyframes[0] ??
    null
  );
}

export function getSelectedPromptDisplay(
  items: PromptDisplayItem[],
  selectedPromptId: string | null,
) {
  return items.find((item) => item.id === selectedPromptId) ?? items[0] ?? null;
}

export function getEditedKeyframeQualitySummary(checks: RemixQualityCheck[]): string {
  if (checks.length === 0) {
    return '尚未执行质量检查';
  }
  const failed = checks.filter((check) => !check.passed);
  if (failed.length === 0) {
    return '全部检查通过';
  }
  return failed.map((item) => `${item.label}${item.note ? `：${item.note}` : ''}`).join('；');
}

export function buildCreationInspectorSummary(
  stepId: CreationStepId,
  snapshot: RemixCreationWorkspaceSnapshot,
  selectedPromptId: string | null,
  selectedEditedKeyframeId: string | null,
  stepStatuses?: Record<CreationStepId, RemixStageStatus>,
): Array<{ label: string; value: string }> {
  if (stepId === 'keyframe-prompts') {
    const prompt = getSelectedPromptDisplay(
      buildKeyframePromptDisplays(snapshot),
      selectedPromptId,
    );
    return [
      { label: '当前提示词', value: prompt?.title ?? '无' },
      { label: '引用强度', value: getReferenceStrengthLabel(snapshot.variant.referenceStrength) },
      { label: '默认生成', value: getGenerationModeLabel(snapshot.variant.defaultGenerationMode) },
    ];
  }

  if (stepId === 'edited-keyframes') {
    const frame = getSelectedEditedKeyframe(snapshot, selectedEditedKeyframeId);
    return [
      { label: '当前帧', value: frame ? `${frame.segmentId} · ${getKeyframeRoleLabel(frame.frameRole)}` : '无' },
      { label: '状态', value: frame ? getEditedKeyframeStatusLabel(frame.status) : '无' },
      { label: '质检', value: frame ? getEditedKeyframeQualitySummary(frame.qualityChecks) : '无' },
    ];
  }

  if (stepId === 'seedance-prompts' || stepId === 'publish-bundle') {
    const prompt = getSelectedSeedancePrompt(snapshot, selectedPromptId);
    return [
      { label: '当前段落', value: prompt?.segmentId ?? '无' },
      { label: '生成模式', value: prompt ? getGenerationModeLabel(prompt.generationMode) : '无' },
      { label: '音频计划', value: prompt?.audioPlanPath ? '已附带' : '未附带' },
    ];
  }

  return [
    { label: '当前步骤', value: getCreationStepTitle(stepId) },
    { label: '源资产', value: snapshot.sourceAsset.title },
    { label: '二创版本', value: snapshot.variant.name },
    {
      label: '步骤状态',
      value: stepStatuses ? getStageStatusLabel(stepStatuses[stepId]) : '—',
    },
  ];
}
