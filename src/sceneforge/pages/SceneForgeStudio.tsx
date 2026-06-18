import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SceneApprovalPolicy, SceneArtifactCopyBlock, SceneArtifactDisplayModel, SceneStageId } from '../../types/sceneforge';
import type { SceneArtifact, SceneProjectState, SceneValidationResult } from '../../lib/electron-api';
import { Alert } from '../../ui';
import { StageRunPanel } from '../components/stage-run/StageRunPanel';
import { SceneExportWorkspace } from '../components/workspace/SceneExportWorkspace';
import { SceneAdaptationDirectionPanel } from '../components/workspace/SceneAdaptationDirectionPanel';
import { SceneGateConfirmPanel } from '../components/workspace/SceneGateConfirmPanel';
import { SceneSupportPlaceholderWorkspace } from '../components/workspace/SceneSupportPlaceholderWorkspace';
import {
  ScenePrepSupportWorkspace,
  isPrepSupportSubmitStage,
} from '../components/workspace/ScenePrepSupportWorkspace';
import { SceneCoreMvpPlaceholder } from '../components/workspace/SceneCoreMvpPlaceholder';
import { getPrepSupportConfig } from '../lib/scene-prep-support-stages';
import { SceneIntakeBriefForm } from '../components/workspace/SceneIntakeBriefForm';
import { SceneGateBriefForm } from '../components/workspace/SceneGateBriefForm';
import { buildScenePipelineGroups, getSceneStageDefinitionLite } from '../lib/scene-pipeline-ui';
import { getRecommendedStartStage, stagesCompletedForNav } from '../lib/scene-entry-path';
import {
  parseAdaptationDirectionsFromMarkdown,
  parseAdaptationSelectionFromArtifact,
  parseGateHITLFromArtifacts,
} from '../lib/scene-hitl-markdown';
import { getStageReadiness, getWorkspaceTemplateForStage, readinessLabel } from '../lib/scene-stage-capabilities';
import { copyPlainTextToClipboard } from '../lib/scene-copy';
import { ResizeHandle } from '../../components/ResizeHandle';
import { InspectorSection } from '../../ui/patterns/InspectorSection';
import { getNextPipelineStage } from '../lib/scene-stage-nav';
import { SceneStageFlowActions } from '../components/workspace/SceneStageFlowActions';
import { useSceneForgeStudioLayout } from '../hooks/useSceneForgeStudioLayout';
import { SceneForgeStudioHeader } from '../components/studio/SceneForgeStudioHeader';
import { SceneForgeStudioPipelineSidebar } from '../components/studio/SceneForgeStudioPipelineSidebar';
import { SceneForgeStudioInspector, type SceneInspectorTab } from '../components/studio/SceneForgeStudioInspector';
import type { SceneCopyFeedback } from '../components/artifacts/ArtifactCopyPanel';
import styles from './SceneForgeStudio.module.css';

const CORE_STUDIO_STAGES = new Set<SceneStageId>(['design', 'storyboard', 'video_prompts']);
const SUPPORT_SUBMIT_STAGES = new Set<SceneStageId>([
  'source_intake',
  'topic_gate',
  'reference',
  'story',
  'assets',
  'script',
  'performance',
  'audio',
]);
const CORE_EXPECTED_COUNTS: Partial<Record<SceneStageId, number>> = {
  design: 5,
  storyboard: 4,
  video_prompts: 2,
};

const policyOptions: Array<{ value: SceneApprovalPolicy; label: string; description: string }> = [
  { value: 'required', label: 'Required', description: '必审' },
  { value: 'optional', label: 'Optional', description: '可选审批' },
  { value: 'auto_if_valid', label: 'Auto if valid', description: '校验通过自动推进' },
  { value: 'skip', label: 'Skip', description: '跳过审批' },
];

const riskyPolicies: SceneApprovalPolicy[] = ['auto_if_valid', 'skip'];


function isCoreFinalArtifact(artifact: SceneArtifact): boolean {
  return (
    artifact.kind === 'final' &&
    artifact.coreAsset &&
    (artifact.stage === 'design' || artifact.stage === 'storyboard' || artifact.stage === 'video_prompts')
  );
}

function coreFinalArtifactsForStage(artifacts: SceneArtifact[], stage: SceneStageId): SceneArtifact[] {
  return artifacts.filter((a) => a.stage === stage && isCoreFinalArtifact(a));
}

function preferredCoreArtifactId(artifacts: SceneArtifact[], stage: SceneStageId): string | null {
  const cores = coreFinalArtifactsForStage(artifacts, stage);
  if (cores.length === 0) return null;
  const pack =
    cores.find((a) => a.id.endsWith('.design_prompts')) ??
    cores.find((a) => a.id.endsWith('.storyboard_prompt_pack')) ??
    cores.find((a) => a.id.endsWith('.video_prompt_pack_cn')) ??
    cores[0];
  return pack.id;
}

interface SceneForgeStudioProps {
  projectDir?: string | null;
}

export function SceneForgeStudio({ projectDir = null }: SceneForgeStudioProps) {
  const [selectedStage, setSelectedStage] = useState<SceneStageId>('topic_gate');
  const [selectedTab, setSelectedTab] = useState<SceneInspectorTab>('Preview');
  const [projectState, setProjectState] = useState<SceneProjectState | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string>('');
  const [displayModel, setDisplayModel] = useState<SceneArtifactDisplayModel | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<SceneCopyFeedback>(null);
  const [validation, setValidation] = useState<SceneValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flowBusy, setFlowBusy] = useState<'validate' | 'continue' | null>(null);
  const [sourceMaterialMarkdown, setSourceMaterialMarkdown] = useState('');
  const [topicBriefMarkdown, setTopicBriefMarkdown] = useState('');
  const [gateConfirmationsMarkdown, setGateConfirmationsMarkdown] = useState('');
  const [adaptationSelectionMarkdown, setAdaptationSelectionMarkdown] = useState('');
  const [prepSupportMarkdown, setPrepSupportMarkdown] = useState('');

  const selectedStageMeta = useMemo(() => {
    const lite = getSceneStageDefinitionLite(selectedStage);
    return {
      id: lite.id,
      title: lite.titleZh,
      subtitle: lite.displayName,
      expectedCoreCount: CORE_EXPECTED_COUNTS[selectedStage] ?? 0,
    };
  }, [selectedStage]);

  const pipelineGroups = useMemo(() => {
    const statuses: Partial<Record<SceneStageId, import('../../types/sceneforge').SceneStageStatus>> = {};
    if (projectState?.state.stages) {
      for (const [id, runtime] of Object.entries(projectState.state.stages)) {
        if (runtime?.status) {
          statuses[id as SceneStageId] = runtime.status;
        }
      }
    }
    return buildScenePipelineGroups(statuses);
  }, [projectState?.state.stages]);

  const entryStageSynced = useRef(false);

  useEffect(() => {
    if (!projectState?.entryPath || entryStageSynced.current) {
      return;
    }
    entryStageSynced.current = true;
    setSelectedStage(getRecommendedStartStage(projectState.entryPath));
  }, [projectState?.entryPath]);
  const selectedArtifact = useMemo<SceneArtifact | null>(() => {
    return projectState?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null;
  }, [projectState?.artifacts, selectedArtifactId]);
  const currentPolicy =
    projectState?.approvalPolicies[selectedStage] ??
    getSceneStageDefinitionLite(selectedStage).defaultApprovalPolicy;
  const stageState = projectState?.state.stages[selectedStage];
  const stageStatus = stageState?.status;

  const canContinueStage = useMemo(() => {
    if (!stageStatus || validation?.status === 'failed') return false;
    return (
      stageStatus === 'waiting_approval' ||
      stageStatus === 'validated' ||
      stageStatus === 'approved' ||
      stageStatus === 'completed' ||
      stageStatus === 'skipped'
    );
  }, [stageStatus, validation?.status]);

  const refreshProjectState = useCallback(async () => {
    if (!projectDir || typeof window === 'undefined' || !window.electronAPI?.sceneGetProjectState) {
      return;
    }
    try {
      setErrorMessage(null);
      setProjectState(await window.electronAPI.sceneGetProjectState(projectDir));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '读取 SceneForge 项目状态失败。');
    }
  }, [projectDir]);

  useEffect(() => {
    void refreshProjectState();
  }, [refreshProjectState]);

  useEffect(() => {
    if (!projectDir || !projectState?.artifacts.length) {
      setSourceMaterialMarkdown('');
      setTopicBriefMarkdown('');
      setGateConfirmationsMarkdown('');
      setAdaptationSelectionMarkdown('');
      setPrepSupportMarkdown('');
      return;
    }
    const load = async (id: string, setter: (v: string) => void) => {
      if (!projectState.artifacts.some((a) => a.id === id)) {
        setter('');
        return;
      }
      try {
        const { content } = await window.electronAPI.sceneReadArtifact(projectDir, id);
        setter(content);
      } catch {
        setter('');
      }
    };
    void load('source_intake.source_material', setSourceMaterialMarkdown);
    void load('topic_gate.topic_brief', setTopicBriefMarkdown);
    void load('topic_gate.gate_confirmations', setGateConfirmationsMarkdown);
    void load('source_intake.adaptation_selection', setAdaptationSelectionMarkdown);
  }, [projectDir, projectState?.artifacts]);

  useEffect(() => {
    if (!projectDir || !isPrepSupportSubmitStage(selectedStage)) {
      setPrepSupportMarkdown('');
      return;
    }
    const config = getPrepSupportConfig(selectedStage);
    if (!config) {
      setPrepSupportMarkdown('');
      return;
    }
    const artifactId = `${selectedStage}.${config.artifactKey}`;
    if (!projectState?.artifacts.some((a) => a.id === artifactId)) {
      setPrepSupportMarkdown('');
      return;
    }
    void window.electronAPI
      .sceneReadArtifact(projectDir, artifactId)
      .then((result) => setPrepSupportMarkdown(result.content))
      .catch(() => setPrepSupportMarkdown(''));
  }, [projectDir, projectState?.artifacts, selectedStage]);

  const completedStages = useMemo(() => {
    const statuses: Partial<Record<SceneStageId, import('../../types/sceneforge').SceneStageStatus>> = {};
    if (projectState?.state.stages) {
      for (const [id, runtime] of Object.entries(projectState.state.stages)) {
        if (runtime?.status) statuses[id as SceneStageId] = runtime.status;
      }
    }
    return stagesCompletedForNav(statuses);
  }, [projectState?.state.stages]);

  const gateNavContext = useMemo(
    () => ({
      topicBrief: topicBriefMarkdown,
      gateConfirmations: gateConfirmationsMarkdown || null,
    }),
    [gateConfirmationsMarkdown, topicBriefMarkdown],
  );

  const intakeAdaptation = useMemo(() => {
    const directions = parseAdaptationDirectionsFromMarkdown(sourceMaterialMarkdown);
    return parseAdaptationSelectionFromArtifact(adaptationSelectionMarkdown, directions);
  }, [adaptationSelectionMarkdown, sourceMaterialMarkdown]);

  const gateHitl = useMemo(
    () => parseGateHITLFromArtifacts(topicBriefMarkdown, gateConfirmationsMarkdown || null),
    [gateConfirmationsMarkdown, topicBriefMarkdown],
  );

  const entryPath = projectState?.entryPath ?? 'topic_gate';

  const validatePassedForStage =
    stageState?.status === 'validated' ||
    stageState?.status === 'waiting_approval' ||
    stageState?.status === 'approved' ||
    stageState?.status === 'completed' ||
    validation?.status === 'passed';

  const gateReadyToValidate =
    selectedStage !== 'topic_gate' ||
    (gateHitl.styleConfirmed && gateHitl.decision !== 'drop');

  const gateValidateHint =
    selectedStage === 'topic_gate' && !gateHitl.styleConfirmed
      ? '请先完成上方「确认风格并继续」。'
      : selectedStage === 'topic_gate' && gateHitl.decision === 'drop'
        ? '已放弃选题，无法继续校验推进。'
        : undefined;

  const intakeReadyToValidate =
    selectedStage !== 'source_intake' ||
    intakeAdaptation.directions.length === 0 ||
    intakeAdaptation.status === 'selected';

  const intakeValidateHint =
    selectedStage === 'source_intake' &&
    intakeAdaptation.directions.length > 0 &&
    intakeAdaptation.status !== 'selected'
      ? '请先确认改编方向。'
      : undefined;

  const flowCanValidate = gateReadyToValidate && intakeReadyToValidate;
  const flowValidateHint = gateValidateHint ?? intakeValidateHint;
  const flowCanContinue =
    selectedStage === 'topic_gate' && gateHitl.decision === 'drop'
      ? false
      : canContinueStage;

  const handleValidate = async () => {
    if (!projectDir || !flowCanValidate || validatePassedForStage) return;
    setFlowBusy('validate');
    try {
      const result = await window.electronAPI.sceneValidateStage(projectDir, selectedStage);
      setValidation(result);
      await refreshProjectState();
    } finally {
      setFlowBusy(null);
    }
  };

  const handleContinueStage = async () => {
    if (!projectDir || !flowCanContinue) return;
    const stageAtApprove = selectedStage;
    const statusNow = projectState?.state.stages[stageAtApprove]?.status;

    if (statusNow === 'approved' || statusNow === 'completed' || statusNow === 'skipped') {
      const next = getNextPipelineStage(stageAtApprove);
      if (next) {
        setSelectedStage(next);
        setValidation(null);
        setCopyFeedback(null);
        const nextId = preferredCoreArtifactId(projectState?.artifacts ?? [], next);
        if (nextId) {
          setSelectedArtifactId(nextId);
          setSelectedTab('Preview');
        } else {
          setSelectedArtifactId(null);
        }
      }
      return;
    }

    setFlowBusy('continue');
    try {
      await window.electronAPI.sceneApproveStage(projectDir, stageAtApprove);
      await refreshProjectState();
      const next = getNextPipelineStage(stageAtApprove);
      if (next) {
        setSelectedStage(next);
        setValidation(null);
        setCopyFeedback(null);
        const artifacts = projectState?.artifacts ?? [];
        const nextId = preferredCoreArtifactId(artifacts, next);
        if (nextId) {
          setSelectedArtifactId(nextId);
          setSelectedTab('Preview');
        } else {
          setSelectedArtifactId(null);
        }
      }
    } finally {
      setFlowBusy(null);
    }
  };

  useEffect(() => {
    if (!projectDir || !selectedArtifactId || typeof window === 'undefined') {
      setArtifactContent('');
      setDisplayModel(null);
      return;
    }
    void window.electronAPI.sceneReadArtifact(projectDir, selectedArtifactId)
      .then((result) => {
        setArtifactContent(result.content);
        setDisplayModel(result.displayModel);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : '读取产物失败。');
        setArtifactContent('');
        setDisplayModel(null);
      });
  }, [projectDir, selectedArtifactId]);

  const selectStage = (stageId: SceneStageId) => {
    setSelectedStage(stageId);
    setCopyFeedback(null);
    const artifacts = projectState?.artifacts ?? [];
    const nextId = preferredCoreArtifactId(artifacts, stageId);
    if (nextId) {
      setSelectedArtifactId(nextId);
      setSelectedTab('Preview');
    } else {
      setSelectedArtifactId(null);
    }
  };

  const selectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setCopyFeedback(null);
  };

  const handleCopyBlock = async (block: SceneArtifactCopyBlock) => {
    try {
      await copyPlainTextToClipboard(block.text);
      setCopyFeedback({ blockId: block.id, status: 'success' });
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback({ blockId: block.id, status: 'error' });
    }
  };

  const handleCopyRaw = async () => {
    const id = selectedArtifactId ?? 'raw';
    try {
      await copyPlainTextToClipboard(artifactContent);
      setCopyFeedback({ blockId: id, status: 'success' });
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback({ blockId: id, status: 'error' });
    }
  };

  const handlePolicyChange = async (nextPolicy: SceneApprovalPolicy) => {
    if (!projectDir || !window.electronAPI?.sceneSetApprovalPolicy) {
      return;
    }
    if (
      riskyPolicies.includes(nextPolicy) &&
      !window.confirm('核心阶段改为自动推进或跳过审批，会增加下游返工风险。确认继续吗？')
    ) {
      return;
    }
    await window.electronAPI.sceneSetApprovalPolicy(projectDir, selectedStage, nextPolicy);
    await refreshProjectState();
  };

  const stageArtifacts = projectState?.artifacts.filter((artifact) => artifact.stage === selectedStage) ?? [];
  const stageCoreFinals = coreFinalArtifactsForStage(projectState?.artifacts ?? [], selectedStage);

  const workspaceTemplate = getWorkspaceTemplateForStage(selectedStage);

  const layout = useSceneForgeStudioLayout();

  const previewText =
    displayModel?.summary ||
    (displayModel?.copyBlocks.find((b) => b.target === 'full')?.text.slice(0, 400) ?? '') ||
    artifactContent ||
    '暂无预览内容';

  return (
    <main className={styles.page}>
      <SceneForgeStudioHeader />

      <section
        className={styles.shell}
        aria-label="SceneForge Studio 工作台"
        style={{ gridTemplateColumns: layout.shellGridColumns }}
      >
        <SceneForgeStudioPipelineSidebar
          pipelineGroups={pipelineGroups}
          selectedStage={selectedStage}
          entryPath={entryPath}
          completedStages={completedStages}
          gateNavContext={gateNavContext}
          onSelectStage={selectStage}
        />

        <ResizeHandle
          axis="x"
          direction="grow"
          value={layout.sidebarWidth}
          min={layout.sidebarMin}
          max={layout.sidebarMax}
          onChange={layout.setSidebarWidth}
          ariaLabel="调整流程侧栏宽度"
          thickness={layout.handleThickness}
        />

        <section className={styles.workspace} aria-label="当前阶段工作区">
          <div className={styles.panelHeader}>
            <span>当前阶段工作区</span>
          </div>
          <div className={styles.workspaceBody}>
            <header className={styles.stageHero}>
              <h2 className={styles.stageHeroTitle}>{selectedStageMeta.title}</h2>
              <p className={styles.stageHeroLead}>
                {CORE_STUDIO_STAGES.has(selectedStage)
                  ? '受控提交、校验与审批；下游仅读取已审批产物。'
                  : SUPPORT_SUBMIT_STAGES.has(selectedStage)
                    ? '填写并保存后写入本地产物库，再校验与审批。'
                    : workspaceTemplate === 'export'
                      ? '导出已通过校验的核心产物清单。'
                      : workspaceTemplate === 'support'
                        ? '由 Agent / MCP 推进本阶段。'
                        : '等待专用工作区或 Agent 推进。'}
              </p>
            </header>

            {CORE_STUDIO_STAGES.has(selectedStage) ? (
              <InspectorSection title="阶段概览" className={styles.workspaceSection}>
                <div className={styles.summaryGrid}>
                  <div>
                    <span className={styles.summaryLabel}>阶段 ID</span>
                    <strong className={styles.summaryValue}>{selectedStage}</strong>
                  </div>
                  <div>
                    <span className={styles.summaryLabel}>就绪</span>
                    <strong className={styles.summaryValue}>{readinessLabel(getStageReadiness(selectedStage))}</strong>
                  </div>
                  <div>
                    <span className={styles.summaryLabel}>核心产物</span>
                    <strong className={styles.summaryValue}>
                      {stageCoreFinals.length} / {selectedStageMeta.expectedCoreCount}
                    </strong>
                  </div>
                </div>
              </InspectorSection>
            ) : null}

            {CORE_STUDIO_STAGES.has(selectedStage) && stageCoreFinals.length > 0 ? (
              <InspectorSection title="核心产物概览" className={styles.workspaceSection}>
                <div className={styles.coreChipRow}>
                  {stageCoreFinals.map((artifact) => (
                    <button
                      key={artifact.id}
                      type="button"
                      className={
                        artifact.id === selectedArtifactId ? styles.coreChipActive : styles.coreChip
                      }
                      data-testid="scene-core-artifact-chip"
                      onClick={() => selectArtifact(artifact.id)}
                    >
                      {artifact.title}
                    </button>
                  ))}
                </div>
                {displayModel && selectedArtifact && selectedArtifact.stage === selectedStage ? (
                  <ul className={styles.copyBlockSummary}>
                    {displayModel.copyBlocks
                      .filter((b) => b.target !== 'full' && b.text.trim())
                      .slice(0, 6)
                      .map((block) => (
                        <li key={block.id}>
                          <span>{block.label}</span>
                          <button
                            type="button"
                            className={styles.miniCopy}
                            data-testid="scene-workspace-copy"
                            onClick={() => void handleCopyBlock(block)}
                          >
                            复制
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </InspectorSection>
            ) : CORE_STUDIO_STAGES.has(selectedStage) ? (
              <p className={styles.emptyCopy}>提交并校验通过后，核心 final 产物会出现在这里。</p>
            ) : SUPPORT_SUBMIT_STAGES.has(selectedStage) ? null : workspaceTemplate === 'support' ? null : workspaceTemplate === 'export' ? (
              <p className={styles.emptyCopy}>导出阶段见下方「导出核心产物包」。</p>
            ) : (
              <p className={styles.emptyCopy}>
                「{selectedStageMeta.title}」请使用 Agent 工具推进，或等待专用工作区。
              </p>
            )}

            {selectedStage === 'source_intake' ? (
              <>
                <SceneIntakeBriefForm
                  projectDir={projectDir}
                  initialMarkdown={sourceMaterialMarkdown}
                  onSubmitted={() => void refreshProjectState()}
                  onError={(message) => setErrorMessage(message)}
                />
                {intakeAdaptation.directions.length > 0 && intakeAdaptation.status !== 'selected' ? (
                  <SceneAdaptationDirectionPanel
                    projectDir={projectDir}
                    directions={intakeAdaptation.directions}
                    selectedId={intakeAdaptation.selectedId}
                    onConfirmed={() => void refreshProjectState()}
                    onError={(message) => setErrorMessage(message)}
                  />
                ) : null}
              </>
            ) : null}

            {selectedStage === 'topic_gate' ? (
              <>
                <InspectorSection title="选题简报" className={styles.workspaceSection}>
                  <SceneGateBriefForm
                    projectDir={projectDir}
                    initialMarkdown={topicBriefMarkdown}
                    onSubmitted={() => void refreshProjectState()}
                    onError={(message) => setErrorMessage(message)}
                  />
                </InspectorSection>
                <InspectorSection title="风格与决策" className={styles.workspaceSection}>
                  <SceneGateConfirmPanel
                    projectDir={projectDir}
                    gateState={gateHitl}
                    topicBriefMarkdown={topicBriefMarkdown}
                    onSubmitted={() => void refreshProjectState()}
                    onError={(message) => setErrorMessage(message)}
                  />
                </InspectorSection>
              </>
            ) : null}

            {isPrepSupportSubmitStage(selectedStage) ? (
              <ScenePrepSupportWorkspace
                projectDir={projectDir}
                stage={selectedStage}
                stageTitle={selectedStageMeta.title}
                initialContent={prepSupportMarkdown}
                onSubmitted={() => void refreshProjectState()}
                onError={(message) => setErrorMessage(message)}
              />
            ) : null}

            {workspaceTemplate === 'support' && !isPrepSupportSubmitStage(selectedStage) ? (
              <SceneSupportPlaceholderWorkspace stage={selectedStage} stageTitle={selectedStageMeta.title} />
            ) : null}

            {workspaceTemplate === 'export' ? (
              <SceneExportWorkspace
                projectDir={projectDir}
                onError={(message) => setErrorMessage(message)}
              />
            ) : null}

            {SUPPORT_SUBMIT_STAGES.has(selectedStage) ? (
              <SceneStageFlowActions
                canValidate={flowCanValidate}
                validateDisabledReason={flowValidateHint}
                validatePassed={validatePassedForStage}
                validateFailed={validation?.status === 'failed'}
                canContinue={flowCanContinue}
                continueDisabledReason={
                  !validatePassedForStage
                    ? '请先通过 Validate。'
                    : !flowCanContinue
                      ? '校验通过后方可 Continue。'
                      : undefined
                }
                onValidate={() => void handleValidate()}
                onContinue={() => void handleContinueStage()}
                validateBusy={flowBusy === 'validate'}
                continueBusy={flowBusy === 'continue'}
              />
            ) : null}

            {CORE_STUDIO_STAGES.has(selectedStage) ? (
              <>
            <section className={styles.policyPanel} aria-label="审批策略">
              <div>
                <h3>审批策略</h3>
                <p>Approval Policy</p>
              </div>
              <select
                value={currentPolicy}
                onChange={(event) => void handlePolicyChange(event.target.value as SceneApprovalPolicy)}
              >
                {policyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.description} · {option.label}
                  </option>
                ))}
              </select>
            </section>

            {(currentPolicy === 'auto_if_valid' || currentPolicy === 'skip') && (
              <Alert
                variant="warning"
                title="高风险审批策略"
                description="核心阶段正在使用自动推进或跳过审批，请确认下游返工成本。"
              />
            )}

            {validation?.status === 'failed' && (
              <Alert
                variant="error"
                title="校验未通过"
                description={validation.errors[0]?.message ?? '阶段校验未通过。'}
              />
            )}

            <StageRunPanel
              projectDir={projectDir}
              stage={selectedStage}
              stageTitle={selectedStageMeta.title}
              onRunError={(message) => setErrorMessage(message)}
              onSubmitted={() => void refreshProjectState()}
            />

            {CORE_STUDIO_STAGES.has(selectedStage) ? (
              <SceneCoreMvpPlaceholder
                projectDir={projectDir}
                stage={selectedStage}
                onSubmitted={() => void refreshProjectState()}
                onError={(message) => setErrorMessage(message)}
              />
            ) : null}

            <SceneStageFlowActions
              canValidate={Boolean(projectDir)}
              validatePassed={validatePassedForStage}
              validateFailed={validation?.status === 'failed'}
              canContinue={canContinueStage}
              continueDisabledReason={!validatePassedForStage ? '请先通过 Validate。' : undefined}
              onValidate={() => void handleValidate()}
              onContinue={() => void handleContinueStage()}
              validateBusy={flowBusy === 'validate'}
              continueBusy={flowBusy === 'continue'}
            />
              </>
            ) : null}

            {errorMessage ? (
              <div className={styles.alertStack}>
                <Alert variant="error" title="操作失败" description={errorMessage} dismissible onDismiss={() => setErrorMessage(null)} />
              </div>
            ) : null}
          </div>
        </section>

        <ResizeHandle
          axis="x"
          direction="shrink"
          value={layout.inspectorWidth}
          min={layout.inspectorMin}
          max={layout.inspectorMax}
          onChange={layout.setInspectorWidth}
          ariaLabel="调整产物检查器宽度"
          thickness={layout.handleThickness}
        />

        <SceneForgeStudioInspector
          stageArtifacts={stageArtifacts}
          selectedArtifact={selectedArtifact}
          selectedArtifactId={selectedArtifactId}
          selectedTab={selectedTab}
          onSelectTab={setSelectedTab}
          onSelectArtifact={selectArtifact}
          artifactContent={artifactContent}
          displayModel={displayModel}
          previewText={previewText}
          copyFeedback={copyFeedback}
          onCopyBlock={(block) => void handleCopyBlock(block)}
          onCopyRaw={() => void handleCopyRaw()}
        />
      </section>
    </main>
  );
}