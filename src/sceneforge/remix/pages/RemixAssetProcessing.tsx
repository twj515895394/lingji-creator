import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Badge, Button, Checkbox, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Select } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import type { RemixIpcContract } from '../../../../electron/sceneforge/remix/remix-ipc-types';
import type { RemixAsrEngine } from '../../../../electron/sceneforge/remix/remix-asr-types';
import { AnnotationEditor } from '../components/AnnotationEditor';
import { getAISettingsIssue } from '../../../lib/ai-settings';
import { KeyframeGallery } from '../components/KeyframeGallery';
import { PublishToLibraryButton } from '../components/PublishToLibraryButton';
import { RemixStageNav } from '../components/RemixStageNav';
import { SegmentTable } from '../components/SegmentTable';
import { SegmentTimeline } from '../components/SegmentTimeline';
import { SegmentClipActionsPanel } from '../components/SegmentClipActionsPanel';
import { SourceVideoPreview } from '../components/SourceVideoPreview';
import { UnderstandingWorkbenchPanel } from '../components/UnderstandingWorkbenchPanel';
import type { RemixUnderstandingWorkbenchSnapshot } from '../../../../electron/sceneforge/remix/remix-understanding-workbench';
import { formatAssetLibraryDate, getLatestFailedJob, getProcessingStepLabel, getSourceAssetFilename } from '../lib/asset-library-view-model';
import { formatCompactPath } from '../lib/remix-display-text';
import panelStyles from '../components/RemixWorkspacePanels.module.css';
import {
  buildAssetProcessingWorkspaceState,
  buildSegmentationDiagnosticsSummary,
  formatSegmentConfidence,
  getAssetLibrarySectionForStatus,
  findSourceSegmentAtTime,
  formatRemixDuration,
  getAssetProcessingStepStatuses,
  getSegmentLowestConfidence,
  getSegmentReviewStatusLabel,
  getSegmentationModeLabel,
  getStageStatusLabel,
  isAssetPublishReady,
  type AssetProcessingStepId,
} from '../lib/remix-workspace-view-model';
import { REMIX_ASSET_PROCESSING_NAV_ITEMS } from '../lib/remix-stage-nav';
import { getRemixApiClient } from '../services/remix-api-client';
import {
  REMIX_ROUTE_PATTERNS,
  type RemixAssetLibrarySection,
  type RemixAssetProcessingSnapshot,
  type RemixProcessingJob,
  type SourceSegment,
} from '../types';
import shellStyles from './RemixWorkspaceShell.module.css';

type ExitGuardMode = 'unsaved' | 'running' | 'incomplete' | 'failed';

interface ExitGuardAction {
  id: string;
  label: string;
  variant: 'ghost' | 'outline' | 'primary' | 'destructive';
  onSelect: () => void | Promise<void>;
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function hasSavedAnnotation(asset: RemixAssetProcessingSnapshot['sourceAsset']): boolean {
  return (
    (asset.tags?.length ?? 0) > 0 ||
    Boolean(asset.annotationNote?.trim()) ||
    Boolean(asset.lastAnnotatedAt?.trim())
  );
}

interface RemixAssetProcessingProps {
  projectDir?: string | null;
  apiClient?: RemixIpcContract;
  sourceAssetId: string;
  onBackToLibrary?: (section?: RemixAssetLibrarySection) => void;
  initialStepId?: AssetProcessingStepId;
  initialAnnotationNote?: string;
}

function buildProcessingChecklist(
  canPublish: boolean,
  note: string,
  tagCount: number,
  statuses: ReturnType<typeof getAssetProcessingStepStatuses>,
) {
  return [
    {
      id: 'import',
      label: '原片已登记',
      passed: statuses['source-import'] === 'approved',
      note: '视频主文件与基础元数据已经登记。',
    },
    {
      id: 'segments',
      label: '真实镜头切片已确认',
      passed: statuses.segmentation === 'approved',
      note: '镜头边界和长短镜头策略已经落定。',
    },
    {
      id: 'keyframes',
      label: '关键帧已抽取',
      passed: statuses.keyframes === 'approved',
      note: '至少形成 first / middle / last 的可引用快照。',
    },
    {
      id: 'understanding',
      label: '原片理解已整理',
      passed: statuses.understanding === 'approved',
      note: '素材摘要与分段分析已经整理成可扫读内容。',
    },
    {
      id: 'annotate',
      label: '人工标注已补齐',
      passed: canPublish,
      note: `当前 ${tagCount} 个标签，备注${note.trim() ? '已填写' : '未填写'}。`,
    },
  ];
}

function buildInspectorRows(
  stepId: AssetProcessingStepId,
  assetId: string,
  assetTitle: string,
  sourceFilename: string,
  tagCount: number,
  note: string,
  canPublish: boolean,
  statuses: ReturnType<typeof getAssetProcessingStepStatuses>,
) {
  switch (stepId) {
    case 'segmentation':
      return [
        { label: '当前步骤', value: '真实镜头切片' },
        { label: '当前素材', value: assetTitle },
        { label: '切片状态', value: getStageStatusLabel(statuses.segmentation) },
        { label: '下一步', value: '逐段核对边界后进入关键帧提取' },
      ];
    case 'keyframes':
      return [
        { label: '当前步骤', value: '关键帧提取' },
        { label: '源文件', value: sourceFilename },
        { label: '关键帧状态', value: getStageStatusLabel(statuses.keyframes) },
        { label: '下一步', value: '确认首帧/尾帧后进入原片理解' },
      ];
    case 'understanding':
      return [
        { label: '当前步骤', value: '原片理解' },
        { label: '当前素材', value: assetTitle },
        { label: '理解状态', value: getStageStatusLabel(statuses.understanding) },
        { label: '下一步', value: '补人工标注，明确保留点与替换点' },
      ];
    case 'annotate':
      return [
        { label: '当前步骤', value: '人工标注' },
        { label: '人工标签', value: `${tagCount} 个` },
        { label: '人工备注', value: note.trim() ? '已填写' : '待填写' },
        { label: '下一步', value: canPublish ? '可以进入保存入库' : '先保存标注再进入入库筛选' },
      ];
    case 'publish-source':
      return [
        { label: '当前步骤', value: '保存入库' },
        { label: '素材编号', value: assetId },
        { label: '发布状态', value: getStageStatusLabel(statuses['publish-source']) },
        { label: '前置阶段', value: canPublish ? '已满足' : '未满足' },
      ];
    case 'source-import':
    default:
      return [
        { label: '当前步骤', value: '导入原片' },
        { label: '源文件', value: sourceFilename },
        { label: '导入状态', value: getStageStatusLabel(statuses['source-import']) },
        { label: '下一步', value: '进入真实镜头切片' },
      ];
  }
}

function getWorkspaceStatusLabel(status: RemixAssetProcessingSnapshot['sourceAsset']['status'] | null | undefined) {
  switch (status) {
    case 'published_to_library':
      return '已入库';
    case 'failed':
      return '失败待恢复';
    case 'ready_for_review':
      return '待确认';
    case 'processing':
      return '处理中';
    case 'draft':
    default:
      return '未入库';
  }
}

const EMPTY_STEP_STATUSES: ReturnType<typeof getAssetProcessingStepStatuses> = {
  'source-import': 'not_started',
  segmentation: 'not_started',
  keyframes: 'not_started',
  understanding: 'not_started',
  annotate: 'not_started',
  'publish-source': 'not_started',
};

const STAGE_DESCRIPTIONS: Record<AssetProcessingStepId, string> = {
  'source-import': '当前阶段只负责把视频、字幕和基础元数据登记成可追踪的源素材。',
  segmentation: '先保护原始镜头边界和表演完整性，再决定哪里需要合并或拆分。',
  keyframes: '点击「提取关键帧」将自动为视频中的所有镜头段一键提取首帧、中帧与尾帧，无需逐个片段处理。',
  understanding: '把剧情、动作、镜头和梗点整理成可供二创复用的文本材料。',
  annotate: '这里记录必须保留的动作、停顿和替换点，为后续二创创作打底。',
  'publish-source': '只有前置步骤和人工标注都完成，这份素材才能进入资产库。',
};

const ASR_ENGINE_OPTIONS: Array<{ value: RemixAsrEngine; label: string }> = [
  { value: 'auto', label: '自动（SenseVoice 优先）' },
  { value: 'funasr_sensevoice_gguf', label: 'SenseVoice' },
  { value: 'local_whisper_cpp', label: 'Whisper' },
];

export function RemixAssetProcessing({
  projectDir = null,
  apiClient,
  sourceAssetId,
  onBackToLibrary,
  initialStepId = 'segmentation',
  initialAnnotationNote = '保留人物逼近时的压迫节奏，不要在长停顿处提前切镜。',
}: RemixAssetProcessingProps) {
  const resolveClient = () => apiClient ?? getRemixApiClient();
  const [snapshot, setSnapshot] = useState<RemixAssetProcessingSnapshot | null>(null);
  const [activeStepId, setActiveStepId] = useState<AssetProcessingStepId>(initialStepId);
  const [tags, setTags] = useState<string[]>(snapshot?.sourceAsset.tags ?? []);
  const [draftTag, setDraftTag] = useState('');
  const [annotationNote, setAnnotationNote] = useState(snapshot?.sourceAsset.annotationNote ?? '');
  const [understandingWorkbench, setUnderstandingWorkbench] = useState<RemixUnderstandingWorkbenchSnapshot | null>(null);
  const [understandingLoading, setUnderstandingLoading] = useState(false);
  const [copiedUnderstandingSegmentId, setCopiedUnderstandingSegmentId] = useState<string | null>(null);
  const [rerunUnderstandingSegmentId, setRerunUnderstandingSegmentId] = useState<string | null>(null);
  const [understandingRerunDialog, setUnderstandingRerunDialog] = useState<{
    segmentId: string;
    hint: string;
  } | null>(null);
  const [rerunTranscriptSegmentId, setRerunTranscriptSegmentId] = useState<string | null>(null);
  const [annotationPrefillApplied, setAnnotationPrefillApplied] = useState(false);
  const [aiSettingsIssue, setAiSettingsIssue] = useState<string | null>(null);
  const [preferredAsrEngine, setPreferredAsrEngine] = useState<RemixAsrEngine>('auto');

  useEffect(() => {
    if (activeStepId !== 'understanding') {
      return;
    }
    const checkAiSettings = async () => {
      try {
        const globalSettings = await window.electronAPI.loadGlobalSettings();
        const settings = typeof globalSettings === 'string' ? JSON.parse(globalSettings) : globalSettings;
        const issue = getAISettingsIssue(settings?.aiSettings ?? null);
        setAiSettingsIssue(issue);
      } catch (err) {
        setAiSettingsIssue('无法加载全局 AI 模型配置');
      }
    };
    void checkAiSettings();
  }, [activeStepId]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<RemixProcessingJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewCurrentTimeMs, setPreviewCurrentTimeMs] = useState(0);
  const [previewSeekMs, setPreviewSeekMs] = useState<number | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const lowerScrollableSectionRef = useRef<HTMLElement | null>(null);
  const [exitGuardMode, setExitGuardMode] = useState<ExitGuardMode | null>(null);
  const [segmentationMode, setSegmentationMode] = useState<'fast' | 'accurate'>('fast');
  const [preserveManualEdits, setPreserveManualEdits] = useState(true);
  const [granularity, setGranularity] = useState<'fine' | 'balanced' | 'coarse'>('balanced');
  const [minDurationForMiddleFrameSec, setMinDurationForMiddleFrameSec] = useState<number>(8);
  const [upperHeight, setUpperHeight] = useState(260);
  const [isDragging, setIsDragging] = useState(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState(42);
  const [isDraggingWidth, setIsDraggingWidth] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector(`.${panelStyles.mainWorkspaceContainer}`);
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // 计算鼠标相对容器顶部的 Y 轴距离（排除工作台顶栏的偏移）
      const newHeight = e.clientY - rect.top - 44;
      setUpperHeight(Math.max(200, Math.min(newHeight, 450)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isDraggingWidth) return;

    const handleMouseMove = (e: MouseEvent) => {
      const section = document.querySelector(`.${panelStyles.upperStickySection}`);
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // 计算鼠标相对于 upperStickySection 左侧的百分比
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      // 限制在 20% 到 80% 之间，防止过窄或过宽
      setLeftWidthPercent(Math.max(20, Math.min(newPercent, 80)));
    };

    const handleMouseUp = () => {
      setIsDraggingWidth(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWidth]);

  useEffect(() => {
    async function loadSnapshot() {
      if (!projectDir) {
        setSnapshot(null);
        setTags([]);
        setErrorMessage('请先打开项目后再处理 Remix 资产。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const nextSnapshot = await resolveClient().getSourceAsset({ projectDir, sourceAssetId });
        setSnapshot(nextSnapshot);
        setTags(nextSnapshot.sourceAsset.tags);
        setAnnotationNote(nextSnapshot.sourceAsset.annotationNote ?? '');
        setActiveJob(nextSnapshot.activeProcessingJob ?? null);
        setSegmentationMode(nextSnapshot.sourceAsset.segmentationMode ?? 'fast');
        setPreserveManualEdits(nextSnapshot.sourceAsset.manualSegmentationOverride?.preserveOnRerun ?? true);
      } catch (error) {
        setSnapshot(null);
        setTags([]);
        setErrorMessage(error instanceof Error ? error.message : '加载资产详情失败。');
      } finally {
        setIsLoading(false);
      }
    }

    void loadSnapshot();
  }, [apiClient, projectDir, sourceAssetId, initialAnnotationNote]);

  const asset = snapshot?.sourceAsset ?? null;
  const annotationReady = tags.length > 0 && annotationNote.trim().length > 0;
  const savedTags = normalizeTags(asset?.tags ?? []);
  const draftTags = normalizeTags(tags);
  const hasUnsavedAnnotationChanges =
    JSON.stringify(savedTags) !== JSON.stringify(draftTags) ||
    (asset?.annotationNote ?? '') !== annotationNote;
  const stepStatuses = snapshot
    ? getAssetProcessingStepStatuses(snapshot, hasUnsavedAnnotationChanges)
    : EMPTY_STEP_STATUSES;
  const activePreviewSegment = asset
    ? (
        selectedSegmentId
          ? asset.segments.find((segment) => segment.id === selectedSegmentId) ?? null
          : findSourceSegmentAtTime(asset, previewCurrentTimeMs)
      )
    : null;
  const workspaceState = snapshot
    ? buildAssetProcessingWorkspaceState(snapshot, {
        activeStepId,
        hasUnsavedAnnotationChanges,
        activeJobOverride: activeJob,
      })
    : null;

  useEffect(() => {
    setPreviewCurrentTimeMs(0);
    setPreviewSeekMs(0);
    setSelectedSegmentId(asset?.segments[0]?.id ?? null);
  }, [asset?.id]);

  useEffect(() => {
    if (!asset) {
      return;
    }
    const segmentAtTime = findSourceSegmentAtTime(asset, previewCurrentTimeMs);
    if (segmentAtTime && segmentAtTime.id !== selectedSegmentId) {
      setSelectedSegmentId(segmentAtTime.id);
    }
  }, [asset, previewCurrentTimeMs, selectedSegmentId]);

  useEffect(() => {
    setAnnotationPrefillApplied(false);
    setUnderstandingWorkbench(null);
    if (!projectDir || !asset) {
      return;
    }
    void refreshUnderstandingWorkbench(asset);
  }, [apiClient, projectDir, asset?.id]);

  useEffect(() => {
    if (!understandingWorkbench?.annotationPrefill || annotationPrefillApplied) {
      return;
    }
    if (!asset || hasSavedAnnotation(asset)) {
      return;
    }
    setTags(understandingWorkbench.annotationPrefill.suggestedTags);
    setAnnotationNote(understandingWorkbench.annotationPrefill.suggestedNote);
    setAnnotationPrefillApplied(true);
  }, [annotationPrefillApplied, asset, understandingWorkbench]);

  async function runAction(
    actionId: string,
    stepId: RemixProcessingJob['stepId'] | null,
    runner: () => Promise<RemixAssetProcessingSnapshot>,
    runningMessage?: string,
  ) {
    setPendingActionId(actionId);
    setErrorMessage(null);
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (stepId) {
      setActiveJob({
        id: `${actionId}-local`,
        sourceAssetId,
        stepId,
        status: 'running',
        message: runningMessage ?? `${getProcessingStepLabel(stepId)}处理中`,
        startedAt: new Date().toISOString(),
        finishedAt: null,
      });
    }
    if (stepId === 'remix_understanding' && projectDir) {
      pollTimer = setInterval(() => {
        void (async () => {
          try {
            const polled = await resolveClient().getSourceAsset({ projectDir, sourceAssetId });
            const serverJob =
              polled.activeProcessingJob ??
              polled.processingJobs?.find((job) => job.status === 'running') ??
              null;
            if (serverJob && (serverJob.understandingProgress || serverJob.message)) {
              setActiveJob(serverJob);
            }
          } catch {
            // polling is best-effort while IPC job runs
          }
        })();
      }, 1500);
    }
    try {
      const nextSnapshot = await runner();
      if (nextSnapshot) {
        applySnapshot(nextSnapshot);
        if (actionId === 'understanding' || actionId.startsWith('retry-understanding')) {
          await refreshUnderstandingWorkbench(nextSnapshot.sourceAsset);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '执行失败。');
      if (stepId) {
        setActiveJob({
          id: `${actionId}-failed-local`,
          sourceAssetId,
          stepId,
          status: 'failed',
          message: `${getProcessingStepLabel(stepId)}失败`,
          error: error instanceof Error ? error.message : '执行失败。',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        });
      }
    } finally {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      setPendingActionId(null);
    }
  }

  function addTag() {
    const nextTag = draftTag.trim();
    if (!nextTag || tags.includes(nextTag)) {
      return;
    }
    setTags((current) => [...current, nextTag]);
    setDraftTag('');
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  function syncPreviewTo(timeMs: number) {
    setPreviewSeekMs(timeMs);
    setPreviewCurrentTimeMs(timeMs);
  }

  function focusSegmentPreview(segmentId: string) {
    if (!asset) {
      return;
    }
    const segment = asset.segments.find((item) => item.id === segmentId);
    if (!segment) {
      return;
    }
    setSelectedSegmentId(segment.id);
    syncPreviewTo(segment.timeRange.startMs);
  }

  async function reloadSnapshot() {
    if (!projectDir) {
      return null;
    }
    const nextSnapshot = await resolveClient().getSourceAsset({ projectDir, sourceAssetId });
    applySnapshot(nextSnapshot);
    return nextSnapshot;
  }

  async function saveAnnotationDraft() {
    if (!projectDir) {
      return;
    }
    await runAction(
      'save-annotation',
      null,
      () =>
        resolveClient().updateSourceAssetMetadata({
          projectDir,
          sourceAssetId,
          tags,
          annotationNote,
          annotationSource: 'workspace_manual',
        }),
    );
  }


  function applySnapshot(nextSnapshot: RemixAssetProcessingSnapshot) {
    setSnapshot(nextSnapshot);
    setTags(nextSnapshot.sourceAsset.tags);
    setAnnotationNote(nextSnapshot.sourceAsset.annotationNote ?? '');
    setDraftTag('');
    setActiveJob(nextSnapshot.activeProcessingJob ?? getLatestFailedJob(nextSnapshot.processingJobs) ?? null);
    setSegmentationMode(nextSnapshot.sourceAsset.segmentationMode ?? 'fast');
    setPreserveManualEdits(nextSnapshot.sourceAsset.manualSegmentationOverride?.preserveOnRerun ?? true);
    if (!hasSavedAnnotation(nextSnapshot.sourceAsset)) {
      setAnnotationPrefillApplied(false);
    }
  }

  async function runWithPreservedWorkbenchScroll<T>(runner: () => Promise<T>) {
    const container = lowerScrollableSectionRef.current;
    const previousScrollTop = container?.scrollTop ?? 0;
    const result = await runner();
    requestAnimationFrame(() => {
      if (!container) {
        return;
      }
      container.scrollTop = previousScrollTop;
    });
    return result;
  }

  async function refreshUnderstandingWorkbench(nextAsset = asset) {
    if (!projectDir || !nextAsset) {
      setUnderstandingWorkbench(null);
      return;
    }
    setUnderstandingLoading(true);
    try {
      const workbench = await resolveClient().getSourceUnderstandingWorkbench({
        projectDir,
        sourceAssetId: nextAsset.id,
      });
      setUnderstandingWorkbench(workbench);
    } catch {
      setUnderstandingWorkbench(null);
    } finally {
      setUnderstandingLoading(false);
    }
  }

  async function handleCopyUnderstandingPrompt(segmentId: string, text: string) {
    if (!text.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUnderstandingSegmentId(segmentId);
      window.setTimeout(() => setCopiedUnderstandingSegmentId((current) => (current === segmentId ? null : current)), 1800);
    } catch {
      setErrorMessage('复制 video prompt 失败，请手动复制。');
    }
  }

  async function handleRerunSegmentUnderstanding(segmentId: string, understandingRerunHint?: string | null) {
    if (!projectDir || !asset) {
      return;
    }
    setRerunUnderstandingSegmentId(segmentId);
    try {
      await runWithPreservedWorkbenchScroll(async () => {
        const nextSnapshot = await resolveClient().rerunSegmentUnderstanding({
          projectDir,
          sourceAssetId: asset.id,
          segmentId,
          understandingRerunHint: understandingRerunHint?.trim() || null,
        });
        applySnapshot(nextSnapshot);
        await refreshUnderstandingWorkbench(nextSnapshot.sourceAsset);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '单段理解重跑失败');
    } finally {
      setRerunUnderstandingSegmentId(null);
    }
  }

  async function handleRerunAllSegmentTranscripts() {
    if (!projectDir) {
      return;
    }
    await runAction(
      'transcript',
      'remix_transcript',
      () =>
        resolveClient().runSourceTranscript({
          projectDir,
          sourceAssetId,
          preferredAsrEngine,
        }),
      '正在重跑全部片段台词',
    );
    await refreshUnderstandingWorkbench();
  }

  async function handleRerunSegmentTranscript(segmentId: string) {
    if (!projectDir || !asset) {
      return;
    }
    setRerunTranscriptSegmentId(segmentId);
    try {
      await runWithPreservedWorkbenchScroll(async () => {
        const nextSnapshot = await resolveClient().rerunSegmentTranscript({
          projectDir,
          sourceAssetId: asset.id,
          segmentId,
          preferredAsrEngine,
        });
        applySnapshot(nextSnapshot);
        await refreshUnderstandingWorkbench(nextSnapshot.sourceAsset);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '单段台词重跑失败');
    } finally {
      setRerunTranscriptSegmentId(null);
    }
  }

  async function handleRerunOriginalStoryRollup() {
    if (!projectDir || !asset) {
      return;
    }
    await runAction(
      'understanding-rollup',
      'remix_understanding',
      async () => {
        const result = await resolveClient().rerunOriginalStoryRollup({ projectDir, sourceAssetId: asset.id });
        void refreshUnderstandingWorkbench(result.sourceAsset);
        return result;
      },
      '正在重跑全片故事串联',
    );
  }

  async function handleRerunStaleSegmentUnderstandings() {
    if (!projectDir || !asset) {
      return;
    }
    await runAction(
      'understanding-rerun-stale',
      'remix_understanding',
      async () => {
        const result = await resolveClient().rerunStaleSegmentUnderstandings({ projectDir, sourceAssetId: asset.id });
        void refreshUnderstandingWorkbench(result.sourceAsset);
        return result;
      },
      '正在重跑过期原片理解',
    );
  }

  async function handleUpdateTranscriptCorrection(
    segmentId: string,
    correctedText: string,
    markConfirmed?: boolean,
  ) {
    if (!projectDir || !asset) {
      return;
    }
    try {
      const nextWorkbench = await resolveClient().updateSegmentTranscriptCorrection({
        projectDir,
        sourceAssetId: asset.id,
        segmentId,
        correctedText,
        markConfirmed,
      });
      setUnderstandingWorkbench(nextWorkbench);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存台词失败');
    }
  }

  async function handleConfirmAllTranscripts() {
    if (!projectDir || !asset) {
      return;
    }
    await runAction(
      'confirm-all-transcripts',
      null,
      async () => {
        const nextWorkbench = await resolveClient().confirmAllSegmentTranscripts({
          projectDir,
          sourceAssetId: asset.id,
        });
        setUnderstandingWorkbench(nextWorkbench);
        
        // 拉取最新物理状态的 snapshot，确保前端数据跟后端完全同步，消除状态延迟
        const nextSnapshot = await resolveClient().getSourceAsset({
          projectDir,
          sourceAssetId: asset.id,
        });
        return nextSnapshot;
      },
      '正在确认所有片段台词',
    );
  }

  function reindexSegments(segments: SourceSegment[]): SourceSegment[] {
    return segments.map((segment, index) => ({
      ...segment,
      id: `segment-${String(index + 1).padStart(3, '0')}`,
      index: index + 1,
      title:
        segment.reviewStatus === 'manual_adjusted' || segment.reviewStatus === 'approved'
          ? `片段 ${String(index + 1).padStart(2, '0')} · 人工校准`
          : segment.title,
      sourceClipPath: `sceneforge/remix/source-assets/${sourceAssetId}/source_segments/segment-${String(index + 1).padStart(3, '0')}/source_clip.mp4`,
    }));
  }

  async function applyManualSegmentUpdate(
    segments: SourceSegment[],
    reason: 'manual_adjust' | 'merge' | 'split',
  ) {
    if (!projectDir) {
      return;
    }
    await runAction(
      `segments-${reason}`,
      null,
      () =>
        resolveClient().updateSourceSegments({
          projectDir,
          sourceAssetId,
          segments: reindexSegments(segments),
          reason,
          preserveOnRerun: preserveManualEdits,
        }),
    );
  }

  async function rerunSegmentation() {
    if (!projectDir) {
      return;
    }
    const minShotDurationMs =
      granularity === 'fine'
        ? 1000
        : granularity === 'coarse'
          ? 3000
          : undefined;

    await runAction(
      'segmentation',
      'remix_segmentation',
      () =>
        resolveClient().runSourceSegmentation({
          projectDir,
          sourceAssetId,
          mode: segmentationMode,
          preserveManualEdits,
          minShotDurationMs,
        }),
      `正在执行 ${getSegmentationModeLabel(segmentationMode)} 切片`,
    );
  }

  async function mergeActiveSegmentWithNext() {
    if (!asset || !activePreviewSegment) {
      return;
    }
    const activeIndex = asset.segments.findIndex((segment) => segment.id === activePreviewSegment.id);
    if (activeIndex < 0 || activeIndex >= asset.segments.length - 1) {
      return;
    }
    const current = asset.segments[activeIndex]!;
    const next = asset.segments[activeIndex + 1]!;
    const mergedSegment: SourceSegment = {
      ...current,
      timeRange: {
        startMs: current.timeRange.startMs,
        endMs: next.timeRange.endMs,
        durationMs: next.timeRange.endMs - current.timeRange.startMs,
      },
      boundaryType: 'merged_short_shots',
      reviewStatus: 'manual_adjusted',
      boundary: {
        startConfidence: current.boundary?.startConfidence ?? 1,
        endConfidence: next.boundary?.endConfidence ?? 1,
        startSources: Array.from(new Set([...(current.boundary?.startSources ?? ['manual']), 'manual_override'])),
        endSources: Array.from(new Set([...(next.boundary?.endSources ?? ['manual']), 'manual_override'])),
        boundaryType: 'manual',
      },
      keyframes: [],
      semantic: {
        visualSummary: `人工合并 ${current.title} 与 ${next.title} 后形成的新镜头段。`,
        shotType: '人工合并段',
        motion: '建议回看合并后的节奏连贯性',
        mergeSuggestion: null,
      },
    };

    const nextSegments = [...asset.segments];
    nextSegments.splice(activeIndex, 2, mergedSegment);
    await applyManualSegmentUpdate(nextSegments, 'merge');
  }

  async function splitSegmentAtPlayhead() {
    if (!asset || !activePreviewSegment) {
      return;
    }
    const startMs = activePreviewSegment.timeRange.startMs;
    const endMs = activePreviewSegment.timeRange.endMs;
    const durationMs = activePreviewSegment.timeRange.durationMs;

    let splitMs = previewCurrentTimeMs;
    if (previewCurrentTimeMs <= startMs + 1000 || previewCurrentTimeMs >= endMs - 1000) {
      splitMs = Math.round(startMs + durationMs / 2);
    } else {
      splitMs = Math.max(startMs + 600, Math.min(previewCurrentTimeMs, endMs - 600));
    }

    if (splitMs <= startMs || splitMs >= endMs) {
      return;
    }
    const first: SourceSegment = {
      ...activePreviewSegment,
      timeRange: {
        startMs: activePreviewSegment.timeRange.startMs,
        endMs: splitMs,
        durationMs: splitMs - activePreviewSegment.timeRange.startMs,
      },
      boundaryType: 'split_long_shot',
      reviewStatus: 'manual_adjusted',
      boundary: {
        ...(activePreviewSegment.boundary ?? {
          startConfidence: 1,
          endConfidence: 1,
          startSources: ['manual_override'],
          endSources: ['manual_override'],
          boundaryType: 'manual',
        }),
        endConfidence: 1,
        endSources: ['manual_override'],
        boundaryType: 'manual',
      },
      keyframes: [],
      semantic: {
        visualSummary: '人工切开后的前半段。',
        shotType: '人工拆分段',
        motion: '优先确认切点是否落在动作转换处',
        mergeSuggestion: null,
      },
    };
    const second: SourceSegment = {
      ...activePreviewSegment,
      timeRange: {
        startMs: splitMs,
        endMs: activePreviewSegment.timeRange.endMs,
        durationMs: activePreviewSegment.timeRange.endMs - splitMs,
      },
      boundaryType: 'split_long_shot',
      reviewStatus: 'manual_adjusted',
      boundary: {
        ...(activePreviewSegment.boundary ?? {
          startConfidence: 1,
          endConfidence: 1,
          startSources: ['manual_override'],
          endSources: ['manual_override'],
          boundaryType: 'manual',
        }),
        startConfidence: 1,
        startSources: ['manual_override'],
        boundaryType: 'manual',
      },
      keyframes: [],
      semantic: {
        visualSummary: '人工切开后的后半段。',
        shotType: '人工拆分段',
        motion: '回看后半段是否需要重新抽关键帧',
        mergeSuggestion: null,
      },
    };
    const activeIndex = asset.segments.findIndex((segment) => segment.id === activePreviewSegment.id);
    const nextSegments = [...asset.segments];
    nextSegments.splice(activeIndex, 1, first, second);
    await applyManualSegmentUpdate(nextSegments, 'split');
  }

  async function approveActiveSegment() {
    if (!asset || !activePreviewSegment) {
      return;
    }
    const nextSegments = asset.segments.map((segment) =>
      segment.id === activePreviewSegment.id
        ? {
            ...segment,
            reviewStatus: 'approved' as const,
            semantic: {
              ...segment.semantic,
              mergeSuggestion: null,
            },
          }
        : segment,
    );
    await applyManualSegmentUpdate(nextSegments, 'manual_adjust');
  }

  async function handleAddMiddleKeyframe(segmentId: string) {
    if (!projectDir) {
      return;
    }
    await runAction(
      `add-middle-frame-${segmentId}`,
      null,
      () =>
        resolveClient().addSegmentMiddleKeyframe({
          projectDir,
          sourceAssetId,
          segmentId,
        }),
      '正在手动提取中间帧',
    );
  }

  async function handleDeleteMiddleKeyframe(segmentId: string) {
    if (!projectDir) {
      return;
    }
    await runAction(
      `delete-middle-frame-${segmentId}`,
      null,
      () =>
        resolveClient().deleteSegmentMiddleKeyframe({
          projectDir,
          sourceAssetId,
          segmentId,
        }),
      '正在删除中间帧',
    );
  }

  function handleBackIntent() {
    if (!asset) {
      return;
    }
    if (hasUnsavedAnnotationChanges) {
      setExitGuardMode('unsaved');
      return;
    }
    if (workspaceState?.activeJob?.status === 'running') {
      setExitGuardMode('running');
      return;
    }
    if (asset.status === 'failed') {
      setExitGuardMode('failed');
      return;
    }
    if (asset.status !== 'published_to_library') {
      setExitGuardMode('incomplete');
      return;
    }
    onBackToLibrary?.(workspaceState?.returnSection ?? getAssetLibrarySectionForStatus(asset.status));
  }

  async function rerunLatestFailedStep() {
    const failedJob = snapshot ? getLatestFailedJob(snapshot.processingJobs) : null;
    if (!failedJob) {
      return;
    }
    if (failedJob.stepId === 'remix_understanding') {
      await runAction(
        'retry-understanding',
        'remix_understanding',
        () => resolveClient().runSourceUnderstanding({ projectDir: projectDir!, sourceAssetId }),
        '正在重跑原片理解',
      );
      return;
    }
    if (failedJob.stepId === 'remix_keyframes') {
      await runAction(
        'retry-keyframes',
        'remix_keyframes',
        () => resolveClient().runSourceKeyframes({ projectDir: projectDir!, sourceAssetId, minDurationForMiddleFrameSec }),
        '正在重跑关键帧提取',
      );
      return;
    }
    await runAction(
      'retry-segmentation',
      'remix_segmentation',
      () => resolveClient().runSourceSegmentation({ projectDir: projectDir!, sourceAssetId }),
      '正在重跑真实镜头切片',
    );
  }

  if (!asset || !projectDir) {
    return (
      <div
        className={[shellStyles.shell, shellStyles.twoColumnShell].join(' ')}
        data-testid="remix-asset-processing-page"
        data-remix-route={REMIX_ROUTE_PATTERNS.assetProcessing}
      >
        <main className={shellStyles.panel}>
          <div className={shellStyles.panelContent}>
            <section className={[panelStyles.heroPanel, panelStyles.heroPanelCompact].join(" ")}>
              <div className={panelStyles.heroCopy}>
                <h1 className={panelStyles.heroTitle}>{isLoading ? '正在加载资产…' : '暂时无法打开这份资产'}</h1>
                <p className={panelStyles.heroDescription}>{errorMessage ?? '请稍后重试。'}</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const canPublish = isAssetPublishReady(stepStatuses) && !hasUnsavedAnnotationChanges;
  const publishChecklist = buildProcessingChecklist(
    canPublish,
    annotationNote,
    tags.length,
    stepStatuses,
  );
  const sourceFilename = getSourceAssetFilename(asset);
  const inspectorRows = buildInspectorRows(
    activeStepId,
    asset.id,
    asset.title,
    sourceFilename,
    tags.length,
    annotationNote,
    canPublish,
    stepStatuses,
  );

  const navStatuses = Object.fromEntries(
    Object.entries(stepStatuses).map(([key, value]) => [key, getStageStatusLabel(value)]),
  );
  const latestFailedJob = snapshot ? getLatestFailedJob(snapshot.processingJobs) : null;
  const latestSucceededJob =
    snapshot?.processingJobs?.find((job) => job.status === 'succeeded') ?? null;
  const exitGuardTitle =
    exitGuardMode === 'unsaved'
      ? '当前人工标注尚未保存'
      : exitGuardMode === 'running'
        ? '当前任务仍在运行'
        : exitGuardMode === 'failed'
          ? '当前步骤执行失败'
          : '这份素材还没有保存入库';
  const exitGuardDescription =
    exitGuardMode === 'unsaved'
      ? '你可以先保存人工标注再返回，也可以放弃这次改动并回到处理中队列。'
      : exitGuardMode === 'running'
        ? `${workspaceState?.activeJob?.message ?? '系统正在执行当前步骤。'} 当前任务会继续在后台运行。`
        : exitGuardMode === 'failed'
          ? latestFailedJob?.error ?? '请先查看失败原因，再决定返回异常队列还是立即重跑。'
          : `当前素材处于${asset.status === 'ready_for_review' ? '待确认' : '处理中'}状态，离开后会回到${workspaceState?.returnSection === 'failed' ? '异常队列' : '处理中队列'}。`;
  const exitGuardActions: ExitGuardAction[] =
    exitGuardMode === 'unsaved'
      ? [
          {
            id: 'save-and-return',
            label: '保存并返回',
            variant: 'primary',
            onSelect: async () => {
              await saveAnnotationDraft();
              setExitGuardMode(null);
              onBackToLibrary?.(workspaceState?.returnSection ?? getAssetLibrarySectionForStatus(asset.status));
            },
          },
          {
            id: 'discard-and-return',
            label: '不保存返回',
            variant: 'outline',
            onSelect: () => {
              setTags(savedTags);
              setAnnotationNote(asset.annotationNote ?? '');
              setDraftTag('');
              setExitGuardMode(null);
              onBackToLibrary?.(workspaceState?.returnSection ?? getAssetLibrarySectionForStatus(asset.status));
            },
          },
        ]
      : exitGuardMode === 'running'
        ? [
            {
              id: 'stay',
              label: '继续等待',
              variant: 'primary',
              onSelect: () => {
                setExitGuardMode(null);
              },
            },
            {
              id: 'return-while-running',
              label: '保留草稿并返回',
              variant: 'outline',
              onSelect: () => {
                setExitGuardMode(null);
                onBackToLibrary?.(workspaceState?.returnSection ?? getAssetLibrarySectionForStatus(asset.status));
              },
            },
          ]
        : exitGuardMode === 'failed'
          ? [
              {
                id: 'retry-failed',
                label: '重跑失败步骤',
                variant: 'primary',
                onSelect: async () => {
                  setExitGuardMode(null);
                  await rerunLatestFailedStep();
                },
              },
              {
                id: 'return-failed-queue',
                label: '返回异常队列',
                variant: 'outline',
                onSelect: () => {
                  setExitGuardMode(null);
                  onBackToLibrary?.('failed');
                },
              },
            ]
          : [
              {
                id: 'return-processing',
                label: '保存为处理中草稿并返回',
                variant: 'primary',
                onSelect: () => {
                  setExitGuardMode(null);
                  onBackToLibrary?.(workspaceState?.returnSection ?? getAssetLibrarySectionForStatus(asset.status));
                },
              },
              {
                id: 'stay-in-workspace',
                label: '继续处理',
                variant: 'outline',
                onSelect: () => {
                  setExitGuardMode(null);
                },
              },
            ];
  const currentTaskMessage =
    workspaceState?.activeJob?.status === 'running'
      ? workspaceState.activeJob.message ?? '系统正在执行当前步骤，请稍候。'
      : latestFailedJob
        ? `${getProcessingStepLabel(latestFailedJob.stepId)}失败：${latestFailedJob.error ?? '请先恢复后再继续。'}`
        : latestSucceededJob
          ? `最近完成：${getProcessingStepLabel(latestSucceededJob.stepId)}。${latestSucceededJob.message ?? '可以进入下一步。'}`
          : stepStatuses[activeStepId] === 'approved'
            ? '本步骤已完成，可从左侧进入下一步。'
            : '完成本步骤主操作后，再进入后续切片、关键帧或入库流程。';

  const stepPanels: Record<AssetProcessingStepId, ReactElement> = {
    'source-import': (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-source-import">

        <div className={panelStyles.fieldStack}>
          <div className={panelStyles.configCard}>
            <div className={panelStyles.configTitle}>源文件</div>
            <div className={panelStyles.configBody} title={asset.sourceVideoPath}>{formatCompactPath(asset.sourceVideoPath, 48)}</div>
          </div>
          <div className={panelStyles.configCard}>
            <div className={panelStyles.configTitle}>转写与字幕</div>
            <div className={panelStyles.configBody}>
              {asset.transcriptPath ?? '暂无 transcript'} · {asset.srtPath ?? '暂无 SRT'}
            </div>
          </div>
        </div>
      </section>
    ),
    segmentation: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-segmentation">

        <div className={panelStyles.copyRow}>
          <div className={panelStyles.modeToggleGroup}>
            <button
              type="button"
              className={[
                panelStyles.modeToggleItem,
                segmentationMode === 'fast' ? panelStyles.modeToggleItemActive : '',
              ].join(' ')}
              onClick={() => setSegmentationMode('fast')}
              disabled={Boolean(pendingActionId)}
              title="使用快速模型进行粗粒度场景检测，生成较长、较连贯的镜头段"
            >
              快速模式
            </button>
            <button
              type="button"
              className={[
                panelStyles.modeToggleItem,
                segmentationMode === 'accurate' ? panelStyles.modeToggleItemActive : '',
              ].join(' ')}
              onClick={() => setSegmentationMode('accurate')}
              disabled={Boolean(pendingActionId)}
              title="使用高精模型进行帧级场景转换检测，能捕捉更细微的剪辑点"
            >
              高精模式
            </button>
          </div>

          <div className={panelStyles.granularityGroup} title="控制镜头段的最小切分长度，数值越大，切出的片段越长、越少">
            <span className={panelStyles.granularityLabel}>最小镜头长度：</span>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as any)}
              className={panelStyles.customSelect}
              disabled={Boolean(pendingActionId)}
            >
              <option value="fine">精细 (最少 1.0s)</option>
              <option value="balanced">均衡 (默认)</option>
              <option value="coarse">较粗 (最少 3.0s)</option>
            </select>
          </div>

          <Button
            variant="primary"
            disabled={Boolean(pendingActionId)}
            onClick={() => {
              void rerunSegmentation();
            }}
            title="基于所选模式重新分析视频，这会重置或重新计算镜头边界"
          >
            {pendingActionId === 'segmentation' ? '处理中…' : '运行切片'}
          </Button>

          <span style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center' }}>
            <Checkbox
              label="重跑时保留人工校准"
              checked={preserveManualEdits}
              onChange={setPreserveManualEdits}
              disabled={Boolean(pendingActionId)}
              size="sm"
              title="开启后，手动合并或拆分的段在重跑切片时不会被重置"
            />
          </span>
        </div>
        <div className={panelStyles.copyRow}>
          <span className={panelStyles.copyFeedback}>
            {buildSegmentationDiagnosticsSummary(asset.segmentationDiagnostics)}
          </span>
        </div>
        {activePreviewSegment ? (
          <div className={panelStyles.copyRow}>
            <Button
              variant="outline"
              disabled={Boolean(pendingActionId)}
              onClick={() => { void mergeActiveSegmentWithNext(); }}
              title="将当前选中的镜头段与其后方紧邻的镜头段合并为一个大段"
            >
              合并当前段与下一段
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(pendingActionId)}
              onClick={() => { void splitSegmentAtPlayhead(); }}
              title="在当前视频预览所播放的时间刻度处，将当前镜头段拆分为二"
            >
              在当前播放点拆分
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(pendingActionId)}
              onClick={() => { void approveActiveSegment(); }}
              title="手动锁定并标记当前镜头段的起止边界为已核对状态"
            >
              确认当前边界
            </Button>
            <span className={panelStyles.copyFeedback}>
              当前段 {formatSegmentConfidence(getSegmentLowestConfidence(activePreviewSegment))} · {getSegmentReviewStatusLabel(activePreviewSegment.reviewStatus)}
            </span>
          </div>
        ) : null}
        <SegmentClipActionsPanel
          projectDir={projectDir!}
          sourceAssetId={sourceAssetId}
          activeSegmentId={activePreviewSegment?.id ?? null}
          disabled={Boolean(pendingActionId)}
          onRefresh={() => { void reloadSnapshot(); }}
        />
        <SegmentTimeline
          asset={asset}
          activeSegmentId={activePreviewSegment?.id ?? null}
          currentTimeMs={previewCurrentTimeMs}
          onSeek={(timeMs) => syncPreviewTo(timeMs)}
          onSelectSegment={(segmentId) => focusSegmentPreview(segmentId)}
        />
        <SegmentTable
          asset={asset}
          activeSegmentId={activePreviewSegment?.id ?? null}
          onSelectSegment={(segmentId) => focusSegmentPreview(segmentId)}
        />
      </section>
    ),
    keyframes: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-keyframes">

        <div className={panelStyles.copyRow} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>中间帧提取阈值:</span>
            <input
              type="number"
              min={1}
              max={60}
              value={minDurationForMiddleFrameSec}
              onChange={(e) => setMinDurationForMiddleFrameSec(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '60px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '13px',
              }}
            />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>秒 (时长低于该值仅提取首尾帧)</span>
          </div>
          <Button
            variant="primary"
            disabled={Boolean(pendingActionId)}
            onClick={() => {
              void runAction(
                'keyframes',
                'remix_keyframes',
                () =>
                  resolveClient().runSourceKeyframes({
                    projectDir: projectDir,
                    sourceAssetId,
                    minDurationForMiddleFrameSec,
                  }),
                '正在提取关键帧',
              );
            }}
            title="一键开始为所有镜头段分析并生成关键帧图片"
          >
            {pendingActionId === 'keyframes' ? '提取中…' : '提取关键帧'}
          </Button>
        </div>
        <KeyframeGallery
          asset={asset}
          projectDir={projectDir}
          activeSegmentId={activePreviewSegment?.id ?? null}
          onAddMiddleFrame={handleAddMiddleKeyframe}
          onDeleteMiddleFrame={handleDeleteMiddleKeyframe}
          onSelectSegment={(segmentId) => focusSegmentPreview(segmentId)}
          disabled={Boolean(pendingActionId)}
        />
      </section>
    ),
    understanding: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-understanding">

        {workspaceState?.activeJob?.understandingProgress ? (
          <p className={panelStyles.copyFeedback} data-testid="remix-understanding-job-progress">
            {workspaceState.activeJob.understandingProgress.message ?? '正在生成原片理解…'}
            {workspaceState.activeJob.understandingProgress.phase === 'understanding'
              ? `（${workspaceState.activeJob.understandingProgress.completed}/${workspaceState.activeJob.understandingProgress.total}）`
              : ''}
          </p>
        ) : null}

        {aiSettingsIssue ? (
          <div
            className={panelStyles.warningBar}
            style={{
              padding: '12px',
              border: '1px solid var(--color-warning-border, #e0a800)',
              background: 'rgba(224, 168, 0, 0.1)',
              borderRadius: '4px',
              marginBottom: '16px',
              color: 'var(--color-warning-text, #e0a800)',
              fontSize: '13px',
            }}
          >
            未配置 AI 模型，无法生成原片理解。请先到设置中配置 AI 模型。({aiSettingsIssue})
          </div>
        ) : null}

        <div className={panelStyles.copyRow} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>ASR 引擎</span>
            <div data-testid="remix-understanding-asr-select">
              <Select
                value={preferredAsrEngine}
                options={ASR_ENGINE_OPTIONS}
                onChange={(event) => setPreferredAsrEngine(event.target.value as RemixAsrEngine)}
                controlClassName={panelStyles.remixSelectSkin}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
              `自动` 会优先使用 SenseVoice；`Whisper` 仍保留精准 SRT。
            </span>
          </div>
          <Button
            variant="outline"
            disabled={Boolean(pendingActionId)}
            onClick={() => {
              void handleRerunAllSegmentTranscripts();
            }}
          >
            {pendingActionId === 'transcript' ? '重跑中…' : '重跑全部台词'}
          </Button>
          <Button
            variant="accent"
            disabled={Boolean(pendingActionId) || Boolean(aiSettingsIssue)}
            onClick={() => {
              void runAction(
                'understanding',
                'remix_understanding',
                () =>
                resolveClient().runSourceUnderstanding({
                  projectDir: projectDir,
                  sourceAssetId,
                  preferredAsrEngine,
                }),
                '正在生成原片理解',
              );
            }}
          >
            {pendingActionId === 'understanding' ? '生成中…' : '生成原片理解'}
          </Button>
          {understandingWorkbench && (
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
              已完成段数：<strong>{understandingWorkbench.segments.filter(s => !s.isPlaceholder).length}/{understandingWorkbench.segments.length}</strong>
            </span>
          )}
          {understandingWorkbench &&
            understandingWorkbench.segments.length > 0 && (
              <Button
                variant="outline"
                disabled={Boolean(pendingActionId)}
                onClick={handleConfirmAllTranscripts}
                style={{ color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.3)', marginLeft: '12px' }}
              >
                ✓ 一键确认所有片段台词
              </Button>
            )}
        </div>
        <UnderstandingWorkbenchPanel
          workbench={understandingWorkbench}
          loading={understandingLoading}
          copiedSegmentId={copiedUnderstandingSegmentId}
          pendingSegmentId={rerunUnderstandingSegmentId}
          pendingTranscriptSegmentId={rerunTranscriptSegmentId}
          activeSegmentId={activePreviewSegment?.id ?? null}
          disabled={Boolean(pendingActionId)}
          onCopyPrompt={(segmentId, prompt) => {
            void handleCopyUnderstandingPrompt(segmentId, prompt);
          }}
          onSelectSegment={(segmentId) => focusSegmentPreview(segmentId)}
          onRerunSegmentTranscript={(segmentId) => {
            void handleRerunSegmentTranscript(segmentId);
          }}
          onRerunSegment={(segmentId) => {
            setUnderstandingRerunDialog({ segmentId, hint: '' });
          }}
          onRerunRollup={handleRerunOriginalStoryRollup}
          onRerunStaleSegments={handleRerunStaleSegmentUnderstandings}
          onUpdateTranscript={handleUpdateTranscriptCorrection}
        />
      </section>
    ),
    annotate: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-annotate">

        <AnnotationEditor
          prefillHint={understandingWorkbench?.annotationPrefill ? "已根据片段理解预填保留/替换建议，保存前请按真实观感修正。" : null}
          tags={tags}
          draftTag={draftTag}
          note={annotationNote}
          onDraftTagChange={setDraftTag}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onNoteChange={setAnnotationNote}
        />
        {workspaceState?.activeJob?.understandingProgress ? (
          <p className={panelStyles.copyFeedback} data-testid="remix-understanding-job-progress">
            {workspaceState.activeJob.understandingProgress.message ?? '正在生成原片理解…'}
            {workspaceState.activeJob.understandingProgress.phase === 'understanding'
              ? `（${workspaceState.activeJob.understandingProgress.completed}/${workspaceState.activeJob.understandingProgress.total}）`
              : ''}
          </p>
        ) : null}
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={!annotationReady || !hasUnsavedAnnotationChanges || Boolean(pendingActionId)}
            onClick={() => {
              void saveAnnotationDraft();
            }}
          >
            {pendingActionId === 'save-annotation' ? '保存中…' : '保存人工标注'}
          </Button>
          <span className={panelStyles.copyFeedback}>
            {hasUnsavedAnnotationChanges
              ? '当前标注有未保存改动，保存后才会进入真实入库筛选。'
              : `最近保存：${asset.lastAnnotatedAt ? asset.lastAnnotatedAt.slice(0, 16).replace('T', ' ') : '尚未保存'}`}
          </span>
        </div>
      </section>
    ),
    'publish-source': (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-publish-source">

        <PublishToLibraryButton
          items={publishChecklist}
          disabled={!canPublish || Boolean(pendingActionId)}
          onPublish={() => {
              void runAction(
                'publish-source',
                null,
                () =>
                resolveClient().publishSourceAssetToLibrary({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
              );
          }}
          isPublishing={pendingActionId === 'publish-source'}
        />
      </section>
    ),
  };

  return (
    <div
      className={[shellStyles.shell, shellStyles.twoColumnShell].join(' ')}
      data-testid="remix-asset-processing-page"
      data-remix-route={REMIX_ROUTE_PATTERNS.assetProcessing}
    >
      <section className={[shellStyles.panel, shellStyles.rail].join(' ')}>
        <div className={shellStyles.panelContent}>
          <RemixStageNav
            scope="asset-processing"
            activeItemId={activeStepId}
            stageStatuses={navStatuses}
            onSelectItem={(itemId) => setActiveStepId(itemId as AssetProcessingStepId)}
          />
        </div>
      </section>

      <main className={[shellStyles.panel, panelStyles.workbenchLayout].join(' ')}>
        <div className={panelStyles.mainWorkspaceContainer}>
          <header className={panelStyles.workbenchHeader} style={{ padding: '12px 16px 8px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: 0 }}>
            <div className={panelStyles.headerTitleBlock}>
              <span className={panelStyles.headerEyebrow}>素材处理工作台</span>
              <span className={panelStyles.headerDivider}>/</span>
              <h1 className={panelStyles.headerTitle} title={asset.title} style={{ fontSize: '15px' }}>
                {asset.title}
              </h1>
              <Badge variant={canPublish ? 'success' : 'warning'}>
                {canPublish ? '可入库' : hasUnsavedAnnotationChanges ? '待保存' : '待补齐'}
              </Badge>
              {isLoading ? <span className={panelStyles.statusChip}>同步中…</span> : null}
            </div>

            <div className={panelStyles.headerMetaBlock}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackIntent}
                data-testid="remix-processing-back"
              >
                返回资产库
              </Button>
            </div>
          </header>

          {errorMessage && (
            <div className={panelStyles.errorMessageBanner} data-testid="remix-processing-error" style={{ margin: '8px 16px 0 16px' }}>
              {errorMessage}
            </div>
          )}

          {/* 上半部分 (置顶固定，高度与宽度均可通过拖拽动态调整) */}
          <section
            className={panelStyles.upperStickySection}
            style={{
              height: `${upperHeight}px`,
              gridTemplateColumns: `${leftWidthPercent}% 6px 1fr`,
              gap: '0px',
            }}
          >
            {/* 左侧：视频播放组件 */}
            <div className={panelStyles.playerColumn} style={{ marginRight: '8px' }}>
              <SourceVideoPreview
                asset={asset}
                activeSegment={activePreviewSegment}
                currentTimeMs={previewCurrentTimeMs}
                seekToMs={previewSeekMs}
                onTimeUpdate={(timeMs) => {
                  setPreviewCurrentTimeMs(timeMs);
                }}
                variant="compact"
              />
            </div>

            {/* 左右拖拽条 */}
            <div
              className={[
                panelStyles.widthResizerLine,
                isDraggingWidth ? panelStyles.widthResizerLineActive : '',
              ].join(' ')}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingWidth(true);
              }}
            />

            {/* 右侧：当前步骤与片段信息 */}
            <div className={panelStyles.stageMetaColumn} style={{ marginLeft: '8px' }}>
              {/* 当前步骤说明卡片 */}
              <div className={panelStyles.stageMetaCard}>
                <div className={panelStyles.stageTitleRow}>
                  <h3>{REMIX_ASSET_PROCESSING_NAV_ITEMS.find((item) => item.id === activeStepId)?.title}</h3>
                  <span className={panelStyles.stageChip}>{getStageStatusLabel(stepStatuses[activeStepId])}</span>
                </div>
                <p className={panelStyles.stageDescText}>
                  {STAGE_DESCRIPTIONS[activeStepId]}
                </p>
                <div className={panelStyles.stageTaskMessage}>{currentTaskMessage}</div>
              </div>

              {/* 选中片段详情卡片 */}
              {activePreviewSegment ? (
                <div className={panelStyles.activeSegmentStickyCard}>
                  <div className={panelStyles.segmentLabel}>当前播放片段</div>
                  <div className={panelStyles.segmentTitle}>{activePreviewSegment.title}</div>
                  {activePreviewSegment.semantic?.visualSummary && (
                    <p className={panelStyles.segmentSummaryText}>
                      {activePreviewSegment.semantic.visualSummary}
                    </p>
                  )}
                  <div className={panelStyles.segmentTimeRange}>
                    <span>起: {formatRemixDuration(activePreviewSegment.timeRange.startMs)}</span>
                    <span>止: {formatRemixDuration(activePreviewSegment.timeRange.endMs)}</span>
                    <span>时长: {formatRemixDuration(activePreviewSegment.timeRange.durationMs)}</span>
                  </div>
                </div>
              ) : (
                <div className={panelStyles.videoMetadataCard}>
                  <div className={panelStyles.segmentLabel}>视频元数据</div>
                  <div className={panelStyles.metaGrid}>
                    <div>分辨率: <strong>{asset.videoMetadata.width}×{asset.videoMetadata.height}</strong></div>
                    <div>帧率: <strong>{asset.videoMetadata.fps ?? 25}fps</strong></div>
                    <div>总长: <strong>{formatRemixDuration(asset.videoMetadata.durationMs)}</strong></div>
                    <div>分段数: <strong>{asset.segments.length}段</strong></div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 拖拽高度比例调整栏 */}
          <div
            className={[
              panelStyles.resizerLine,
              isDragging ? panelStyles.resizerLineActive : '',
            ].join(' ')}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
          />

          {/* 下半部分 (60% 高度, 独立滚动操作区) */}
          <section ref={lowerScrollableSectionRef} className={panelStyles.lowerScrollableSection}>
            {stepPanels[activeStepId]}

            <details className={shellStyles.technicalDetails} style={{ marginTop: '24px' }}>
              <summary className={shellStyles.technicalSummary}>技术信息</summary>
              <div className={shellStyles.summaryList} style={{ marginTop: '8px' }}>
                <div className={shellStyles.summaryRow} title={asset.sourceVideoPath}>
                  <span className={shellStyles.summaryKey}>源文件</span>
                  <strong className={shellStyles.summaryValue}>{formatCompactPath(asset.sourceVideoPath, 48)}</strong>
                </div>
                <div className={shellStyles.summaryRow} title={asset.id}>
                  <span className={shellStyles.summaryKey}>素材编号</span>
                  <strong className={shellStyles.summaryValue}>{asset.id}</strong>
                </div>
              </div>
            </details>
          </section>
        </div>
      </main>

      <Dialog
        open={understandingRerunDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUnderstandingRerunDialog(null);
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>重跑本段理解</DialogTitle>
            <DialogDescription>
              仅重跑该段的 LLM / 多模态结构化理解，不会重跑 ASR 或台词识别。可填写补充建议（可为空）。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>用户补充建议（可选）</span>
              <textarea
                value={understandingRerunDialog?.hint ?? ''}
                onChange={(event) => {
                  const segmentId = understandingRerunDialog?.segmentId;
                  if (!segmentId) {
                    return;
                  }
                  setUnderstandingRerunDialog({ segmentId, hint: event.target.value });
                }}
                rows={4}
                placeholder="例如：本段重点强调人物情绪，镜头保持与上一段相同的冷色调。"
                style={{
                  width: '100%',
                  resize: 'vertical',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  color: 'inherit',
                  padding: '8px 10px',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnderstandingRerunDialog(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={!understandingRerunDialog || Boolean(pendingActionId)}
              onClick={() => {
                const dialog = understandingRerunDialog;
                if (!dialog) {
                  return;
                }
                setUnderstandingRerunDialog(null);
                void handleRerunSegmentUnderstanding(dialog.segmentId, dialog.hint);
              }}
            >
              开始重跑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exitGuardMode !== null} onOpenChange={(open) => {
        if (!open) {
          setExitGuardMode(null);
        }
      }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{exitGuardTitle}</DialogTitle>
            <DialogDescription>{exitGuardDescription}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className={shellStyles.summaryList}>
              <div className={shellStyles.summaryRow}>
                <span>返回目标</span>
                <strong>{workspaceState?.returnSection === 'published' ? '已入库资产' : workspaceState?.returnSection === 'failed' ? '异常队列' : '处理中队列'}</strong>
              </div>
              {latestFailedJob ? (
                <div className={shellStyles.summaryRow}>
                  <span>失败步骤</span>
                  <strong>{getProcessingStepLabel(latestFailedJob.stepId)}</strong>
                </div>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExitGuardMode(null)}>
              取消
            </Button>
            {exitGuardActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                onClick={() => {
                  void action.onSelect();
                }}
              >
                {action.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
