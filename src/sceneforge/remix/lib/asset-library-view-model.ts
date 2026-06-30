import type {
  RemixAssetProcessingStageId,
  RemixCreationStageId,
  RemixProcessingJob,
  RemixProcessingJobStepId,
  SourceAsset,
} from '../types';

export const REMIX_SOURCE_STATUS_LABELS = {
  draft: '未处理',
  processing: '处理中',
  ready_for_review: '待确认',
  published_to_library: '已入库',
  failed: '解析失败',
} as const;

export const REMIX_SOURCE_STATUS_BADGE_VARIANTS = {
  draft: 'outline',
  processing: 'warning',
  ready_for_review: 'info',
  published_to_library: 'success',
  failed: 'destructive',
} as const;

const CREATION_STAGE_LABELS: Partial<Record<RemixCreationStageId, string>> = {
  remix_strategy: '改编策略',
  remix_design: '画面设计',
  remix_keyframe_edit_prompts: '关键帧提示词',
  edited_keyframes_review: '关键帧验收',
  remix_video_prompts: '视频提示词',
  remix_publish: '发布清单',
};

export function formatAssetLibraryDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatAssetLibraryDate(date: string): string {
  return date.slice(0, 10);
}

export function getSourceAssetFilename(asset: SourceAsset): string {
  const normalizedPath = asset.sourceVideoPath.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').pop();
  return filename && filename.trim() ? filename : asset.id;
}

export function getSourceAssetPrimaryAction(asset: SourceAsset): {
  label: string;
  emphasis: 'outline' | 'accent';
} | null {
  if (
    asset.status === 'draft' ||
    asset.status === 'processing' ||
    asset.status === 'ready_for_review' ||
    asset.status === 'failed'
  ) {
    return {
      label: asset.status === 'failed' ? '重新处理' : '继续处理',
      emphasis: 'outline',
    };
  }

  if (asset.status === 'published_to_library') {
    return {
      label: '创建二创',
      emphasis: 'accent',
    };
  }

  return null;
}

export function getSourceAssetMarkingSummaryLine(asset: SourceAsset): string {
  const tagCount = asset.tags?.length ?? 0;
  if (tagCount === 0) {
    return '尚未保存资产标签，需先完成资产标记。';
  }
  const notePart = asset.annotationNote?.trim()
    ? '资产备注已填写'
    : '资产备注未填写（可选）';
  return `已保存 ${tagCount} 个资产标签 · ${notePart}`;
}

export function getSourceAssetNextStep(asset: SourceAsset): string {
  switch (asset.status) {
    case 'draft':
      return '下一步：补齐切片、关键帧和原片理解。';
    case 'processing':
      return '下一步：继续完成切片、关键帧与资产标记。';
    case 'ready_for_review':
      return '下一步：完成资产标记后再保存入库。';
    case 'published_to_library':
      return '下一步：基于这份资产发起二创版本。';
    case 'failed':
      return '下一步：回到处理页检查失败原因并重跑。';
    default:
      return '下一步：继续推进当前素材处理。';
  }
}

const PROCESSING_STEP_LABELS: Record<RemixAssetProcessingStageId, string> = {
  remix_source_import: '导入原片',
  remix_segmentation: '真实镜头切片',
  remix_keyframes: '关键帧提取',
  remix_understanding: '原片理解',
};

const PROCESSING_JOB_STEP_LABELS: Partial<Record<RemixProcessingJobStepId, string>> = {
  remix_audio_extraction: '音频抽取',
  remix_transcript: '台词识别',
};

export function getProcessingStepLabel(
  stepId: RemixAssetProcessingStageId | RemixProcessingJobStepId,
): string {
  return (
    PROCESSING_STEP_LABELS[stepId as RemixAssetProcessingStageId] ??
    PROCESSING_JOB_STEP_LABELS[stepId as RemixProcessingJobStepId] ??
    stepId
  );
}

export function getLatestFailedJob(jobs: RemixProcessingJob[] = []): RemixProcessingJob | null {
  return jobs.find((job) => job.status === 'failed') ?? null;
}

export function getVariantGateReason(asset: SourceAsset): string | null {
  if (asset.status === 'published_to_library') {
    return null;
  }
  if (asset.status === 'failed') {
    return '这份素材当前在异常队列，先恢复失败步骤后才能创建二创。';
  }
  return '这份素材还没有保存入库，请先完成资产标记并保存入库后才能创建二创。';
}

export function getSourceAssetKeyframeCount(asset: SourceAsset): number {
  return asset.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0);
}

export function getSourceAssetKeyframeIssueCount(asset: SourceAsset): number {
  return asset.mediaValidation?.keyframes.invalidCount ?? 0;
}

export function getVariantStageLabel(stageId?: RemixCreationStageId | null): string {
  if (!stageId) {
    return '草稿';
  }

  return CREATION_STAGE_LABELS[stageId] ?? stageId;
}
