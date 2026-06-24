import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Badge, Button } from '../../../ui';
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
import { formatAssetLibraryDate, getSourceAssetFilename } from '../lib/asset-library-view-model';
import { formatCompactPath } from '../lib/remix-display-text';
import panelStyles from '../components/RemixWorkspacePanels.module.css';
import {
  findSourceSegmentAtTime,
  formatRemixDuration,
  getAssetProcessingStepStatuses,
  getStageStatusLabel,
  isAssetPublishReady,
  type AssetProcessingStepId,
} from '../lib/remix-workspace-view-model';
import { REMIX_ASSET_PROCESSING_NAV_ITEMS } from '../lib/remix-stage-nav';
import { getRemixApiClient } from '../services/remix-api-client';
import { REMIX_ROUTE_PATTERNS, type RemixAssetProcessingSnapshot } from '../types';
import shellStyles from './RemixWorkspaceShell.module.css';

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

interface RemixAssetProcessingProps {
  projectDir?: string | null;
  apiClient?: RemixIpcContract;
  sourceAssetId: string;
  onBackToLibrary?: () => void;
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
  const [annotationNote, setAnnotationNote] = useState(snapshot?.sourceAsset.annotationNote ?? initialAnnotationNote);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewCurrentTimeMs, setPreviewCurrentTimeMs] = useState(0);
  const [previewSeekMs, setPreviewSeekMs] = useState<number | null>(null);

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
        setAnnotationNote(nextSnapshot.sourceAsset.annotationNote ?? initialAnnotationNote);
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

  useEffect(() => {
    setPreviewCurrentTimeMs(0);
    setPreviewSeekMs(0);
  }, [asset?.id]);

  async function runAction(
    actionId: string,
    runner: () => Promise<RemixAssetProcessingSnapshot>,
  ) {
    setActiveAction(actionId);
    setErrorMessage(null);
    try {
      const nextSnapshot = await runner();
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
        setTags(nextSnapshot.sourceAsset.tags);
        setAnnotationNote(nextSnapshot.sourceAsset.annotationNote ?? '');
        setDraftTag('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '执行失败。');
    } finally {
      setActiveAction(null);
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
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('segmentation', () =>
                resolveClient().runSourceSegmentation({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
              );
            }}
          >
            {activeAction === 'segmentation' ? '处理中…' : '运行切片'}
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
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('keyframes', () =>
                resolveClient().runSourceKeyframes({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
              );
            }}
          >
            {activeAction === 'keyframes' ? '提取中…' : '提取关键帧'}
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
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('understanding', () =>
                resolveClient().runSourceUnderstanding({
                  projectDir: projectDir,
                  sourceAssetId,
                }),
              );
            }}
          >
            {activeAction === 'understanding' ? '生成中…' : '生成原片理解'}
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
            disabled={!annotationReady || !hasUnsavedAnnotationChanges || Boolean(activeAction)}
            onClick={() => {
              void runAction('save-annotation', () =>
                resolveClient().updateSourceAssetMetadata({
                  projectDir: projectDir,
                  sourceAssetId,
                  tags,
                  annotationNote,
                  annotationSource: 'workspace_manual',
                }),
              );
            }}
          >
            {activeAction === 'save-annotation' ? '保存中…' : '保存人工标注'}
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
          disabled={!canPublish || Boolean(activeAction)}
          onPublish={() => {
            void runAction('publish-source', () =>
              resolveClient().publishSourceAssetToLibrary({
                projectDir: projectDir,
                sourceAssetId,
              }),
            );
          }}
          isPublishing={activeAction === 'publish-source'}
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
                当前步骤：<strong>{REMIX_ASSET_PROCESSING_NAV_ITEMS.find((item) => item.id === activeStepId)?.title ?? "处理"}</strong> · {getStageStatusLabel(stepStatuses[activeStepId])}
              </p>
              {errorMessage ? <p className={panelStyles.heroDescription} data-testid="remix-processing-error">{errorMessage}</p> : null}
              <div className={panelStyles.copyRow}>
                <Button variant="outline" onClick={onBackToLibrary} data-testid="remix-processing-back">
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
            <div className={panelStyles.panelDescription}>
              {activeAction
                ? '系统正在执行当前步骤，请稍候。'
                : stepStatuses[activeStepId] === 'approved'
                  ? '本步骤已完成，可从左侧进入下一步。'
                  : '完成本步骤主操作后，再进入后续切片、关键帧或入库流程。'}
            </div>
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
    </div>
  );
}
