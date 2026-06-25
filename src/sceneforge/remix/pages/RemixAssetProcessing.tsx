import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Badge, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import type { RemixIpcContract } from '../../../../electron/sceneforge/remix/remix-ipc-types';
import { AnnotationEditor } from '../components/AnnotationEditor';
import { KeyframeGallery } from '../components/KeyframeGallery';
import { PublishToLibraryButton } from '../components/PublishToLibraryButton';
import { RemixStageNav } from '../components/RemixStageNav';
import { SegmentTable } from '../components/SegmentTable';
import { SegmentTimeline } from '../components/SegmentTimeline';
import { SourceVideoPreview } from '../components/SourceVideoPreview';
import { SourceOverviewPanel } from '../components/SourceOverviewPanel';
import { formatAssetLibraryDate, getLatestFailedJob, getProcessingStepLabel, getSourceAssetFilename } from '../lib/asset-library-view-model';
import { formatCompactPath } from '../lib/remix-display-text';
import panelStyles from '../components/RemixWorkspacePanels.module.css';
import {
  buildAssetProcessingWorkspaceState,
  getAssetLibrarySectionForStatus,
  findSourceSegmentAtTime,
  formatRemixDuration,
  getAssetProcessingStepStatuses,
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

const EMPTY_STEP_STATUSES: ReturnType<typeof getAssetProcessingStepStatuses> = {
  'source-import': 'not_started',
  segmentation: 'not_started',
  keyframes: 'not_started',
  understanding: 'not_started',
  annotate: 'not_started',
  'publish-source': 'not_started',
};

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
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<RemixProcessingJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewCurrentTimeMs, setPreviewCurrentTimeMs] = useState(0);
  const [previewSeekMs, setPreviewSeekMs] = useState<number | null>(null);
  const [exitGuardMode, setExitGuardMode] = useState<ExitGuardMode | null>(null);

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
  const activePreviewSegment = asset ? findSourceSegmentAtTime(asset, previewCurrentTimeMs) : null;
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
  }, [asset?.id]);

  async function runAction(
    actionId: string,
    stepId: RemixProcessingJob['stepId'] | null,
    runner: () => Promise<RemixAssetProcessingSnapshot>,
    runningMessage?: string,
  ) {
    setPendingActionId(actionId);
    setErrorMessage(null);
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
    try {
      const nextSnapshot = await runner();
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
        setTags(nextSnapshot.sourceAsset.tags);
        setAnnotationNote(nextSnapshot.sourceAsset.annotationNote ?? '');
        setDraftTag('');
        setActiveJob(nextSnapshot.activeProcessingJob ?? getLatestFailedJob(nextSnapshot.processingJobs) ?? null);
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

  async function reloadSnapshot() {
    if (!projectDir) {
      return null;
    }
    const nextSnapshot = await resolveClient().getSourceAsset({ projectDir, sourceAssetId });
    setSnapshot(nextSnapshot);
    setTags(nextSnapshot.sourceAsset.tags);
    setAnnotationNote(nextSnapshot.sourceAsset.annotationNote ?? '');
    setActiveJob(nextSnapshot.activeProcessingJob ?? getLatestFailedJob(nextSnapshot.processingJobs) ?? null);
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
        () => resolveClient().runSourceKeyframes({ projectDir: projectDir!, sourceAssetId }),
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
        className={shellStyles.shell}
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
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>导入原片与元数据登记</h2>
            <p className={panelStyles.panelDescription}>
              当前阶段只负责把视频、字幕和基础元数据登记成可追踪的源素材。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses['source-import'])}</div>
        </div>
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
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>真实镜头切片</h2>
            <p className={panelStyles.panelDescription}>
              先保护原始镜头边界和表演完整性，再决定哪里需要合并或拆分。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses.segmentation)}</div>
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(pendingActionId)}
            onClick={() => {
              void runAction(
                'segmentation',
                'remix_segmentation',
                () =>
                resolveClient().runSourceSegmentation({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
                '正在执行真实镜头切片',
              );
            }}
          >
            {pendingActionId === 'segmentation' ? '处理中…' : '运行切片'}
          </Button>
        </div>
        <SegmentTimeline
          asset={asset}
          activeSegmentId={activePreviewSegment?.id ?? null}
          currentTimeMs={previewCurrentTimeMs}
          onSeek={syncPreviewTo}
          onSelectSegment={(segmentId) => {
            const segment = asset.segments.find((item) => item.id === segmentId);
            if (!segment) {
              return;
            }
            syncPreviewTo(segment.timeRange.startMs);
          }}
        />
        <SegmentTable
          asset={asset}
          activeSegmentId={activePreviewSegment?.id ?? null}
          onSelectSegment={(segmentId) => {
            const segment = asset.segments.find((item) => item.id === segmentId);
            if (!segment) {
              return;
            }
            syncPreviewTo(segment.timeRange.startMs);
          }}
        />
      </section>
    ),
    keyframes: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-keyframes">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>关键帧提取</h2>
            <p className={panelStyles.panelDescription}>
              每段至少沉淀可引用的首帧、尾帧和必要的中间帧。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses.keyframes)}</div>
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(pendingActionId)}
            onClick={() => {
              void runAction(
                'keyframes',
                'remix_keyframes',
                () =>
                resolveClient().runSourceKeyframes({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
                '正在提取关键帧',
              );
            }}
          >
            {pendingActionId === 'keyframes' ? '提取中…' : '提取关键帧'}
          </Button>
        </div>
        <KeyframeGallery asset={asset} />
      </section>
    ),
    understanding: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-understanding">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>原片理解</h2>
            <p className={panelStyles.panelDescription}>
              把剧情、动作、镜头和梗点整理成可供二创复用的文本材料。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses.understanding)}</div>
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(pendingActionId)}
            onClick={() => {
              void runAction(
                'understanding',
                'remix_understanding',
                () =>
                resolveClient().runSourceUnderstanding({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
                '正在生成原片理解',
              );
            }}
          >
            {pendingActionId === 'understanding' ? '生成中…' : '生成原片理解'}
          </Button>
        </div>
        <SourceOverviewPanel asset={asset} />
      </section>
    ),
    annotate: (
      <section className={panelStyles.panelCard} data-testid="remix-processing-step-annotate">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>人工标注</h2>
            <p className={panelStyles.panelDescription}>
              这里记录必须保留的动作、停顿和替换点，为后续二创创作打底。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses.annotate)}</div>
        </div>
        <AnnotationEditor
          tags={tags}
          draftTag={draftTag}
          note={annotationNote}
          onDraftTagChange={setDraftTag}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onNoteChange={setAnnotationNote}
        />
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
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>保存入库</h2>
            <p className={panelStyles.panelDescription}>
              只有前置步骤和人工标注都完成，这份素材才能进入资产库。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses['publish-source'])}</div>
        </div>
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
      className={shellStyles.shell}
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

      <main className={shellStyles.panel}>
        <div className={shellStyles.panelContent}>
          <section className={[panelStyles.heroPanel, panelStyles.heroPanelCompact].join(" ")}>
            <div className={panelStyles.heroCopy}>
              <div className={panelStyles.heroEyebrow}>素材处理工作台</div>
              <h1 className={panelStyles.heroTitle}>{asset.title}</h1>
              <p className={panelStyles.heroDescription}>
                {workspaceState
                  ? `${workspaceState.assetStatus === 'published_to_library' ? '已入库' : workspaceState.assetStatus === 'failed' ? '失败待恢复' : '未入库'} · 当前步骤：`
                  : '当前步骤：'}
                <strong>{REMIX_ASSET_PROCESSING_NAV_ITEMS.find((item) => item.id === activeStepId)?.title ?? "处理"}</strong> · {getStageStatusLabel(stepStatuses[activeStepId])}
              </p>
              {workspaceState ? (
                <p className={panelStyles.heroDescription}>
                  已完成 {workspaceState.completedSteps}/{workspaceState.totalSteps}
                  {workspaceState.blockingReason ? ` · 阻塞：${workspaceState.blockingReason}` : ''}
                </p>
              ) : null}
              {errorMessage ? <p className={panelStyles.heroDescription} data-testid="remix-processing-error">{errorMessage}</p> : null}
              <div className={panelStyles.copyRow}>
                <Button
                  variant="outline"
                  onClick={handleBackIntent}
                  data-testid="remix-processing-back"
                >
                  返回资产库
                </Button>
                <Badge variant={canPublish ? 'success' : 'warning'}>
                  {canPublish ? '可入库' : hasUnsavedAnnotationChanges ? '待保存' : '待补齐'}
                </Badge>
                {isLoading ? <span className={panelStyles.chip}>同步中…</span> : null}
              </div>
            </div>

            <div className={panelStyles.heroMetaGrid}>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>源文件</div>
                <div className={panelStyles.heroMetaValue} title={asset.sourceVideoPath}>{formatCompactPath(asset.sourceVideoPath)}</div>
              </div>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>画面规格</div>
                <div className={panelStyles.heroMetaValue}>{asset.videoMetadata.width} × {asset.videoMetadata.height}</div>
              </div>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>时长 / 切片</div>
                <div className={panelStyles.heroMetaValue}>
                  {formatRemixDuration(asset.videoMetadata.durationMs)} · {asset.segments.length} 段
                </div>
              </div>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>最近更新</div>
                <div className={panelStyles.heroMetaValue}>
                  {formatAssetLibraryDate(asset.updatedAt)}
                </div>
              </div>
            </div>
          </section>


          <section className={panelStyles.panelCardDense} data-testid="remix-processing-current-task">
            <div className={panelStyles.panelTitle}>
              {REMIX_ASSET_PROCESSING_NAV_ITEMS.find((item) => item.id === activeStepId)?.title ?? '当前任务'}
            </div>
            <div className={panelStyles.panelDescription}>{currentTaskMessage}</div>
          </section>

          <section className={panelStyles.workspaceGrid}>
            <SourceVideoPreview
              asset={asset}
              activeSegment={activePreviewSegment}
              currentTimeMs={previewCurrentTimeMs}
              seekToMs={previewSeekMs}
              onTimeUpdate={(timeMs) => {
                setPreviewCurrentTimeMs(timeMs);
              }}
            />

            {stepPanels[activeStepId]}
          </section>
        </div>
      </main>

      <aside className={shellStyles.panel}>
        <div className={shellStyles.panelContent}>
          <PanelHeader
            eyebrow="状态摘要"
            title="处理摘要"
            description="只保留当前步骤需要盯的状态和下一步，不在这里复读整页内容。"
            meta={<Badge variant={canPublish ? 'success' : 'warning'}>{canPublish ? '可发布' : '待补齐'}</Badge>}
          />
          <div className={shellStyles.summaryList} data-testid="remix-processing-inspector">
            {inspectorRows.map((row) => (
              <div key={row.label} className={shellStyles.summaryRow}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>

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
