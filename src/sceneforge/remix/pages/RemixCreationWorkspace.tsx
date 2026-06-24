import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Badge, Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import type { RemixIpcContract } from '../../../../electron/sceneforge/remix/remix-ipc-types';
import { DesignPreview } from '../components/DesignPreview';
import { EditedKeyframeStepPanel } from '../components/EditedKeyframeStepPanel';
import { KeyframePromptList } from '../components/KeyframePromptList';
import { PublishChecklist } from '../components/PublishChecklist';
import { RemixStageNav } from '../components/RemixStageNav';
import { RetentionMatrixEditor } from '../components/RetentionMatrixEditor';
import { CreationReferencePreview } from '../components/CreationReferencePreview';
import { SeedanceStepPanel } from '../components/SeedanceStepPanel';
import { StrategyPreview } from '../components/StrategyPreview';
import { VariantConfigPanel } from '../components/VariantConfigPanel';
import panelStyles from '../components/RemixWorkspacePanels.module.css';
import { copyPlainTextToClipboard } from '../../lib/scene-copy';
import {
  buildCreationInspectorSummary,
  buildCreationPublishChecklist,
  buildDesignSections,
  buildKeyframePromptDisplays,
  buildSeedanceDisplayItems,
  buildSegmentStrategies,
  formatRemixDuration,
  getCreationStepStatuses,
  getCreationWorkspaceSnapshot,
  getKeyframeRoleLabel,
  getSelectedEditedKeyframe,
  getSelectedPromptDisplay,
  getSelectedSeedancePrompt,
  getStageStatusLabel,
  getReferenceStrengthLabel,
  getGenerationModeLabel,
  isPromptBundleReady,
  type CreationStepId,
} from '../lib/remix-workspace-view-model';
import { DEFAULT_REMIX_PROJECT_DIR } from '../mock/mock-data';
import { remixApiClient, resolveRemixApiClientMode } from '../services/remix-api-client';
import {
  REMIX_ROUTE_PATTERNS,
  type RemixCreationWorkspaceSnapshot,
  type RemixGenerationMode,
  type RemixReferenceStrength,
  type RetentionMatrix,
} from '../types';
import shellStyles from './RemixWorkspaceShell.module.css';

const EMPTY_CREATION_STEP_STATUSES: ReturnType<typeof getCreationStepStatuses> = {
  'select-asset': 'not_started',
  'create-variant': 'not_started',
  strategy: 'not_started',
  design: 'not_started',
  'keyframe-prompts': 'not_started',
  'edited-keyframes': 'not_started',
  'seedance-prompts': 'not_started',
  'publish-bundle': 'not_started',
};

interface RemixCreationWorkspaceProps {
  projectDir?: string | null;
  apiClient?: RemixIpcContract;
  variantId: string;
  onBackToLibrary?: () => void;
  initialStepId?: CreationStepId;
  initialSelectedPromptId?: string | null;
  initialSelectedEditedKeyframeId?: string | null;
}

export function RemixCreationWorkspace({
  projectDir = null,
  apiClient,
  variantId,
  onBackToLibrary,
  initialStepId = 'create-variant',
  initialSelectedPromptId = null,
  initialSelectedEditedKeyframeId = null,
}: RemixCreationWorkspaceProps) {
  const client = apiClient ?? remixApiClient;
  const useMockSnapshot = !apiClient && resolveRemixApiClientMode() === 'mock';
  const effectiveProjectDir = projectDir ?? DEFAULT_REMIX_PROJECT_DIR;
  const [baseSnapshot, setBaseSnapshot] = useState<RemixCreationWorkspaceSnapshot | null>(() =>
    useMockSnapshot ? getCreationWorkspaceSnapshot(variantId) : null,
  );
  const [activeStepId, setActiveStepId] = useState<CreationStepId>(initialStepId);
  const [variantName, setVariantName] = useState('');
  const [variantConcept, setVariantConcept] = useState('');
  const [referenceStrength, setReferenceStrength] = useState<RemixReferenceStrength>('strong');
  const [defaultGenerationMode, setDefaultGenerationMode] = useState<RemixGenerationMode>('keyframes_plus_source_clip');
  const [retentionMatrix, setRetentionMatrix] = useState<RetentionMatrix>({
    plotStructure: 'keep',
    characterRelationship: 'replace_identity',
    dialogueMeaning: 'rewrite',
    dialogueRhythm: 'keep',
    performanceAction: 'keep',
    cameraComposition: 'soft_keep',
    sceneEnvironment: 'replace',
    visualStyle: 'new_style',
    memeMechanism: 'enhance',
  });
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialSelectedPromptId);
  const [selectedEditedKeyframeId, setSelectedEditedKeyframeId] = useState<string | null>(initialSelectedEditedKeyframeId);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!useMockSnapshot);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  async function exportBundle(mode: 'zip' | 'directory') {
    const defaultPath =
      mode === 'zip' ? `${variantName || variantId}-prompt-bundle.zip` : `${variantName || variantId}-prompt-bundle`;
    const electronApi =
      typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : null;
    const outputPath =
      mode === 'zip'
        ? await electronApi?.selectRemixBundlePath?.(defaultPath)
        : await electronApi?.selectRemixBundleDirectory?.(defaultPath);
    if (electronApi && !outputPath) {
      return;
    }
    await runAction('export-bundle', async () => {
      const result = await client.exportPromptBundle({
        projectDir: effectiveProjectDir,
        variantId,
        outputPath: outputPath ?? null,
      });
      setLastExportPath(result.bundlePath);
      return result.workspace;
    });
  }

  useEffect(() => {
    async function loadWorkspace() {
      if (useMockSnapshot) {
        const snapshot = getCreationWorkspaceSnapshot(variantId);
        setBaseSnapshot(snapshot);
        setIsLoading(false);
        setErrorMessage(null);
        return;
      }

      if (!projectDir) {
        setBaseSnapshot(null);
        setIsLoading(false);
        setErrorMessage('请先打开项目后再进入 Remix Creation Workspace。');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        setBaseSnapshot(
          await client.getCreationWorkspace({
            projectDir,
            variantId,
          }),
        );
      } catch (error) {
        setBaseSnapshot(null);
        setErrorMessage(error instanceof Error ? error.message : '加载二创工作区失败。');
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, [client, projectDir, useMockSnapshot, variantId]);

  useEffect(() => {
    if (!baseSnapshot) {
      return;
    }

    setVariantName(baseSnapshot.variant.name);
    setVariantConcept(baseSnapshot.variant.concept);
    setReferenceStrength(baseSnapshot.variant.referenceStrength);
    setDefaultGenerationMode(baseSnapshot.variant.defaultGenerationMode);
    setRetentionMatrix(baseSnapshot.variant.retentionMatrix);
    setSelectedPromptId((current) =>
      current && (
        baseSnapshot.keyframeEditPrompts.some((prompt) => prompt.id === current) ||
        baseSnapshot.seedancePrompts.some((prompt) => prompt.id === current)
      )
        ? current
        : initialSelectedPromptId ??
          baseSnapshot.keyframeEditPrompts[0]?.id ??
          baseSnapshot.seedancePrompts[0]?.id ??
          null,
    );
    setSelectedEditedKeyframeId((current) =>
      current && baseSnapshot.editedKeyframes.some((frame) => frame.id === current)
        ? current
        : initialSelectedEditedKeyframeId ?? baseSnapshot.editedKeyframes[0]?.id ?? null,
    );
  }, [baseSnapshot, initialSelectedEditedKeyframeId, initialSelectedPromptId]);

  const snapshot = useMemo(
    () =>
      baseSnapshot
        ? {
            ...baseSnapshot,
            variant: {
              ...baseSnapshot.variant,
              name: variantName,
              concept: variantConcept,
              referenceStrength,
              defaultGenerationMode,
              retentionMatrix,
            },
          }
        : null,
    [
      baseSnapshot,
      defaultGenerationMode,
      referenceStrength,
      retentionMatrix,
      variantConcept,
      variantName,
    ],
  );

  const keyframePromptItems = useMemo(
    () => (snapshot ? buildKeyframePromptDisplays(snapshot) : []),
    [snapshot],
  );
  const strategyItems = useMemo(() => (snapshot ? buildSegmentStrategies(snapshot) : []), [snapshot]);
  const designSections = useMemo(() => (snapshot ? buildDesignSections(snapshot) : []), [snapshot]);
  const publishChecklist = useMemo(
    () => (snapshot ? buildCreationPublishChecklist(snapshot) : []),
    [snapshot],
  );
  const canExportBundle = isPromptBundleReady(publishChecklist);
  const stepStatuses = snapshot
    ? getCreationStepStatuses(snapshot, canExportBundle)
    : EMPTY_CREATION_STEP_STATUSES;
  const navStatuses = Object.fromEntries(
    Object.entries(stepStatuses).map(([key, value]) => [key, getStageStatusLabel(value)]),
  );
  const selectedPromptDisplay = getSelectedPromptDisplay(keyframePromptItems, selectedPromptId);
  const selectedEditedKeyframe = snapshot
    ? getSelectedEditedKeyframe(snapshot, selectedEditedKeyframeId)
    : null;
  const selectedSeedancePrompt = snapshot
    ? getSelectedSeedancePrompt(snapshot, selectedPromptId)
    : null;
  const seedanceItems = snapshot ? buildSeedanceDisplayItems(snapshot) : [];
  const selectedTargetPrompt = snapshot
    ? snapshot.keyframeEditPrompts.find((prompt) => prompt.id === selectedPromptId) ??
      snapshot.keyframeEditPrompts[0] ??
      null
    : null;
  const approvedEditedKeyframeCount = snapshot
    ? snapshot.keyframeEditPrompts.filter((prompt) =>
        snapshot.editedKeyframes.some(
          (frame) =>
            frame.segmentId === prompt.segmentId &&
            frame.frameRole === prompt.frameRole &&
            frame.status === 'approved',
        ),
      ).length
    : 0;
  const requiredEditedKeyframeCount = snapshot?.keyframeEditPrompts.length ?? 0;
  const canGenerateSeedance = requiredEditedKeyframeCount > 0 &&
    approvedEditedKeyframeCount === requiredEditedKeyframeCount;
  const seedanceBlockedReason = canGenerateSeedance
    ? null
    : `先完成全部必需关键帧验收，当前 ${approvedEditedKeyframeCount} / ${requiredEditedKeyframeCount}`;
  const segmentReviewRows = snapshot
    ? snapshot.sourceAssetDetails?.segments.map((segment) => {
        const required = snapshot.keyframeEditPrompts.filter((prompt) => prompt.segmentId === segment.id).length;
        const approved = snapshot.keyframeEditPrompts.filter((prompt) =>
          prompt.segmentId === segment.id &&
          snapshot.editedKeyframes.some(
            (frame) =>
              frame.segmentId === prompt.segmentId &&
              frame.frameRole === prompt.frameRole &&
              frame.status === 'approved',
          ),
        ).length;
        return {
          id: segment.id,
          title: segment.title,
          progress: `${approved}/${required}`,
        };
      }) ?? []
    : [];
  const inspectorRows = snapshot
    ? buildCreationInspectorSummary(
        activeStepId,
        snapshot,
        selectedPromptId,
        selectedEditedKeyframeId,
        stepStatuses,
      )
    : [];

  async function handleCopy(text: string, itemId: string) {
    try {
      await copyPlainTextToClipboard(text);
      setCopiedItemId(itemId);
    } catch {
      setCopiedItemId(null);
    }
  }

  async function runAction(
    actionId: string,
    runner: () => Promise<RemixCreationWorkspaceSnapshot>,
  ) {
    setActiveAction(actionId);
    setErrorMessage(null);
    try {
      setBaseSnapshot(await runner());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '执行失败。');
    } finally {
      setActiveAction(null);
    }
  }

  function buildSeedanceMarkdown(promptId: string): string | null {
    const prompt = snapshot?.seedancePrompts.find((entry) => entry.id === promptId);
    if (!prompt) {
      return null;
    }

    return [
      `# Seedance Prompt · ${prompt.segmentId}`,
      '',
      `- 生成模式：${prompt.generationMode}`,
      `- 平台：${prompt.targetPlatform}`,
      '',
      `- Visual：${prompt.structuredFields.visual}`,
      `- Motion：${prompt.structuredFields.motion}`,
      `- Camera：${prompt.structuredFields.camera}`,
      `- Performance：${prompt.structuredFields.performance}`,
      `- Dialogue：${prompt.structuredFields.dialogue}`,
      `- Voice：${prompt.structuredFields.voice}`,
      `- Sound Effects：${prompt.structuredFields.soundEffects}`,
      `- Ambient Audio：${prompt.structuredFields.ambientAudio}`,
      `- Negative：${prompt.structuredFields.negative}`,
      '',
      prompt.copyablePrompt,
    ].join('\n');
  }

  async function handleRegisterEditedKeyframe(localEditedFramePath: string) {
    if (!snapshot || !selectedTargetPrompt) {
      return;
    }

    const sourceFrame = snapshot.sourceAssetDetails?.segments
      .find((segment) => segment.id === selectedTargetPrompt.segmentId)
      ?.keyframes.find((frame) => frame.id === selectedTargetPrompt.sourceKeyframeId);
    if (!sourceFrame) {
      setErrorMessage('未找到当前关键帧对应的原始参考图。');
      return;
    }

    await runAction('upload-edited-keyframe', async () => {
      const nextSnapshot = await client.registerEditedKeyframe({
        projectDir: effectiveProjectDir,
        variantId,
        segmentId: selectedTargetPrompt.segmentId,
        frameRole: selectedTargetPrompt.frameRole,
        sourceFramePath: sourceFrame.imagePath,
        promptPath: selectedTargetPrompt.promptPath,
        editedFramePath: localEditedFramePath,
      });
      const nextEditedFrame = nextSnapshot.editedKeyframes.find(
        (frame) =>
          frame.segmentId === selectedTargetPrompt.segmentId &&
          frame.frameRole === selectedTargetPrompt.frameRole,
      );
      setSelectedEditedKeyframeId(nextEditedFrame?.id ?? null);
      return nextSnapshot;
    });
  }

  function handleEditedKeyframeStatus(status: 'approved' | 'needs_revision' | 'rejected') {
    if (!selectedEditedKeyframe) {
      return;
    }
    void runAction(`${status}-edited-keyframe`, () =>
      client.updateEditedKeyframeStatus({
        projectDir: effectiveProjectDir,
        variantId,
        editedKeyframeId: selectedEditedKeyframe.id,
        status,
      }),
    );
  }

  if (!snapshot) {
    return (
      <div
        className={shellStyles.shell}
        data-testid="remix-creation-workspace-page"
        data-remix-route={REMIX_ROUTE_PATTERNS.creationWorkspace}
      >
        <main className={shellStyles.panel}>
          <div className={shellStyles.panelContent}>
            <section className={[panelStyles.heroPanel, panelStyles.heroPanelCompact].join(" ")}>
              <div className={panelStyles.heroCopy}>
                <h1 className={panelStyles.heroTitle}>{isLoading ? '正在加载二创版本（Variant）…' : '暂时无法打开当前工作区'}</h1>
                <p className={panelStyles.heroDescription}>{errorMessage ?? '请稍后重试。'}</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const stepPanels: Record<CreationStepId, ReactElement> = {
    'select-asset': (
      <section className={panelStyles.panelCard} data-testid="remix-creation-step-select-asset">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>选择资产</h2>
            <p className={panelStyles.panelDescription}>
              当前二创版本绑定已入库源资产，不会回到原片处理工作台。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses['select-asset'])}</div>
        </div>
        <div className={panelStyles.configCard}>
          <div className={panelStyles.configTitle}>{snapshot.sourceAsset.title}</div>
          <div className={panelStyles.configBody}>
            {formatRemixDuration(snapshot.sourceAsset.durationMs)} ·{' '}
            {snapshot.sourceAsset.segmentCount} 段 / {snapshot.sourceAsset.keyframeCount} 张关键帧
          </div>
          <div className={panelStyles.inlineStats}>
            <span className={panelStyles.inlineStat}>已有 {snapshot.sourceAsset.variantCount} 个二创版本（Variant）</span>
            <span className={panelStyles.inlineStat}>最近更新 {snapshot.sourceAsset.updatedAt.slice(0, 10)}</span>
          </div>
        </div>
      </section>
    ),
    'create-variant': (
      <section className={panelStyles.panelCard} data-testid="remix-creation-step-create-variant">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>创建二创版本与保留矩阵</h2>
            <p className={panelStyles.panelDescription}>
              在本步完成名称、概念、引用强度与九维保留矩阵配置。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses['create-variant'])}</div>
        </div>
        <VariantConfigPanel
          sourceAsset={snapshot.sourceAsset}
          name={variantName}
          concept={variantConcept}
          referenceStrength={referenceStrength}
          defaultGenerationMode={defaultGenerationMode}
          onNameChange={setVariantName}
          onConceptChange={setVariantConcept}
          onReferenceStrengthChange={setReferenceStrength}
          onGenerationModeChange={setDefaultGenerationMode}
        />
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('save-config', () =>
                client.updateVariantConfig({
                  projectDir: effectiveProjectDir,
                  variantId,
                  name: variantName,
                  concept: variantConcept,
                  referenceStrength,
                  retentionMatrix,
                  defaultGenerationMode,
                }),
              );
            }}
          >
            {activeAction === 'save-config' ? '保存中…' : '保存二创版本配置'}
          </Button>
        </div>
        <RetentionMatrixEditor
          retentionMatrix={retentionMatrix}
          onChange={setRetentionMatrix}
        />
      </section>
    ),
    strategy: (
      <section className={panelStyles.panelCard} data-testid="remix-creation-step-strategy">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>改编策略</h2>
            <p className={panelStyles.panelDescription}>
              先明确每段保留什么、改什么、风险是什么，再进入视觉设计。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses.strategy)}</div>
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('strategy', () =>
                client.runRemixStrategy({
                  projectDir: effectiveProjectDir,
                  variantId,
                }),
              );
            }}
          >
            {activeAction === 'strategy' ? '生成中…' : '生成改编策略'}
          </Button>
        </div>
        <StrategyPreview items={strategyItems} />
      </section>
    ),
    design: (
      <section className={panelStyles.panelCard} data-testid="remix-creation-step-design">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>画面设计</h2>
            <p className={panelStyles.panelDescription}>
              全局角色、空间、风格和连续性规则在这里收敛，避免后续逐段漂移。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses.design)}</div>
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('design', () =>
                client.runRemixDesign({
                  projectDir: effectiveProjectDir,
                  variantId,
                }),
              );
            }}
          >
            {activeAction === 'design' ? '生成中…' : '生成 画面设计'}
          </Button>
        </div>
        <DesignPreview sections={designSections} />
      </section>
    ),
    'keyframe-prompts': (
      <section className={panelStyles.panelCard} data-testid="remix-creation-step-keyframe-prompts">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>关键帧改图提示词</h2>
            <p className={panelStyles.panelDescription}>
              每条提示词都可直接复制使用；选中后右侧摘要会同步切换。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses['keyframe-prompts'])}</div>
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={Boolean(activeAction)}
            onClick={() => {
              void runAction('keyframe-prompts', () =>
                client.runKeyframeEditPrompts({
                  projectDir: effectiveProjectDir,
                  variantId,
                }),
              );
            }}
          >
            {activeAction === 'keyframe-prompts' ? '生成中…' : '生成改图 Prompt'}
          </Button>
        </div>
        <KeyframePromptList
          items={keyframePromptItems}
          selectedPromptId={selectedPromptId}
          copiedPromptId={copiedItemId}
          onSelectPrompt={setSelectedPromptId}
          onCopyPrompt={(promptId) => {
            const item = keyframePromptItems.find((entry) => entry.id === promptId);
            if (item) {
              void handleCopy(item.body, promptId);
            }
          }}
        />
      </section>
    ),
    'edited-keyframes': (
      <EditedKeyframeStepPanel
        statusLabel={getStageStatusLabel(stepStatuses['edited-keyframes'])}
        promptOptions={snapshot.keyframeEditPrompts}
        selectedPromptId={selectedPromptId}
        selectedTargetPrompt={selectedTargetPrompt}
        selectedEditedKeyframe={selectedEditedKeyframe}
        selectedEditedKeyframeId={selectedEditedKeyframeId}
        editedKeyframes={snapshot.editedKeyframes}
        approvedEditedKeyframeCount={approvedEditedKeyframeCount}
        requiredEditedKeyframeCount={requiredEditedKeyframeCount}
        segmentReviewRows={segmentReviewRows}
        activeAction={activeAction}
        onSelectPrompt={setSelectedPromptId}
        onSelectEditedKeyframe={setSelectedEditedKeyframeId}
        onUploadFromPath={handleRegisterEditedKeyframe}
        onApprove={() => handleEditedKeyframeStatus('approved')}
        onNeedsRevision={() => handleEditedKeyframeStatus('needs_revision')}
        onReject={() => handleEditedKeyframeStatus('rejected')}
      />
    ),
    'seedance-prompts': (
      <SeedanceStepPanel
        statusLabel={getStageStatusLabel(stepStatuses['seedance-prompts'])}
        canGenerateSeedance={canGenerateSeedance}
        blockedReason={seedanceBlockedReason}
        activeAction={activeAction}
        items={seedanceItems}
        selectedPrompt={selectedSeedancePrompt}
        selectedPromptId={selectedPromptId}
        copiedPromptId={copiedItemId}
        onGenerate={() => {
          void runAction('seedance-prompts', () =>
            client.runSeedancePrompts({
              projectDir: effectiveProjectDir,
              variantId,
            }),
          );
        }}
        onSelectPrompt={setSelectedPromptId}
        onCopyMarkdownPrompt={(promptId) => {
          const markdown = buildSeedanceMarkdown(promptId);
          if (markdown) {
            void handleCopy(markdown, promptId);
          }
        }}
        onCopyPlainPrompt={(promptId) => {
          const prompt = snapshot.seedancePrompts.find((entry) => entry.id === promptId);
          if (prompt) {
            void handleCopy(prompt.copyablePrompt, promptId);
          }
        }}
      />
    ),
    'publish-bundle': (
      <section className={panelStyles.panelCard} data-testid="remix-creation-step-publish-bundle">
        <div className={panelStyles.panelHeaderRow}>
          <div className={panelStyles.panelTitleBlock}>
            <h2 className={panelStyles.panelTitle}>发布清单</h2>
            <p className={panelStyles.panelDescription}>
              导出前只看闭环状态，不把无关创作细节再次重复一遍。
            </p>
          </div>
          <div className={panelStyles.chip}>{getStageStatusLabel(stepStatuses['publish-bundle'])}</div>
        </div>
        <PublishChecklist
          items={publishChecklist}
          canExport={canExportBundle}
          isExporting={activeAction === 'export-bundle'}
          onExportZip={() => {
            void exportBundle('zip');
          }}
          onExportDirectory={() => {
            void exportBundle('directory');
          }}
        />
        {lastExportPath ? (
          <div className={panelStyles.copyFeedback}>已导出到：{lastExportPath}</div>
        ) : null}
      </section>
    ),
  };

  return (
    <div
      className={shellStyles.shell}
      data-testid="remix-creation-workspace-page"
      data-remix-route={REMIX_ROUTE_PATTERNS.creationWorkspace}
    >
      <section className={[shellStyles.panel, shellStyles.rail].join(' ')}>
        <div className={shellStyles.panelContent}>
          <RemixStageNav
            scope="creation"
            activeItemId={activeStepId}
            stageStatuses={navStatuses}
            onSelectItem={(itemId) => setActiveStepId(itemId as CreationStepId)}
          />
        </div>
      </section>

      <main className={shellStyles.panel}>
        <div className={shellStyles.panelContent}>
          <section className={[panelStyles.heroPanel, panelStyles.heroPanelCompact].join(" ")}>
            <div className={panelStyles.heroCopy}>
              <div className={panelStyles.heroEyebrow}>二创创作工作台</div>
              <h1 className={panelStyles.heroTitle}>{variantName}</h1>
              <p className={panelStyles.heroDescription}>
                当前处于 <strong>{getStageStatusLabel(stepStatuses[activeStepId])}</strong> 阶段。基于已入库源资产「{snapshot.sourceAsset.title}」做策略、设计、改图与视频提示词，不回写原片处理流程。
              </p>
              {errorMessage ? (
                <p className={panelStyles.heroDescription} data-testid="remix-creation-error">
                  {errorMessage}
                </p>
              ) : null}
              <div className={panelStyles.copyRow}>
                <Button variant="outline" onClick={onBackToLibrary} data-testid="remix-creation-back">
                  返回资产库
                </Button>
                <Badge variant={canExportBundle ? 'success' : 'warning'}>
                  {canExportBundle ? '可导出' : '待补齐'}
                </Badge>
                {isLoading ? <span className={panelStyles.chip}>同步中…</span> : null}
              </div>
            </div>

            <div className={panelStyles.heroMetaGrid}>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>引用强度</div>
                <div className={panelStyles.heroMetaValue}>{getReferenceStrengthLabel(referenceStrength)}</div>
              </div>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>生成模式</div>
                <div className={panelStyles.heroMetaValue}>{getGenerationModeLabel(defaultGenerationMode)}</div>
              </div>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>改后关键帧</div>
                <div className={panelStyles.heroMetaValue}>{snapshot.editedKeyframes.length}</div>
              </div>
              <div className={panelStyles.heroMetaCard}>
                <div className={panelStyles.heroMetaLabel}>视频提示词</div>
                <div className={panelStyles.heroMetaValue}>{snapshot.seedancePrompts.length}</div>
              </div>
            </div>
          </section>

          <section className={panelStyles.workspaceGrid}>
            <CreationReferencePreview snapshot={snapshot} />

            {stepPanels[activeStepId]}
          </section>
        </div>
      </main>

      <aside className={shellStyles.panel}>
        <div className={shellStyles.panelContent}>
          <PanelHeader
            eyebrow="状态摘要"
            title="创作摘要"
            description="这栏跟着当前步骤走，只保留真正帮助判断的摘要和选中项。"
            meta={<Badge variant={canExportBundle ? 'success' : 'info'}>{canExportBundle ? '可导出' : '进行中'}</Badge>}
          />
          <div className={shellStyles.summaryList} data-testid="remix-creation-inspector">
            {inspectorRows.map((row) => (
              <div key={row.label} className={shellStyles.summaryRow}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
          {activeStepId === 'keyframe-prompts' && selectedPromptDisplay ? (
            <section className={panelStyles.panelCardDense}>
              <div className={panelStyles.panelTitle}>当前改图提示词预览</div>
              <div className={panelStyles.promptText}>{selectedPromptDisplay.body}</div>
            </section>
          ) : null}
          {activeStepId === 'edited-keyframes' && selectedEditedKeyframe ? (
            <section className={panelStyles.panelCardDense}>
              <div className={panelStyles.panelTitle}>当前验收项</div>
              <div className={panelStyles.qualityList}>
                {selectedEditedKeyframe.qualityChecks.map((check) => (
                  <div key={check.code} className={panelStyles.qualityItem}>
                    <span>{check.label}</span>
                    <strong>{check.passed ? '通过' : '未通过'}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {(activeStepId === 'seedance-prompts' || activeStepId === 'publish-bundle') &&
          selectedSeedancePrompt ? (
            <section className={panelStyles.panelCardDense}>
              <div className={panelStyles.panelTitle}>当前 Seedance 摘要</div>
              <div className={panelStyles.promptText}>{selectedSeedancePrompt.copyablePrompt}</div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
