import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SceneApprovalPolicy, SceneArtifactCopyBlock, SceneArtifactDisplayModel, SceneStageId } from '../../types/sceneforge';
import type {
  SceneArtifact,
  SceneProjectState,
  SceneStageContext,
  SceneStageRunnerResult,
  SceneValidationResult,
  SubmitStageDraftResult,
} from '../../lib/electron-api';
import { Alert } from '../../ui';
import { StageRunPanel } from '../components/stage-run/StageRunPanel';
import { SceneAdaptationDirectionPanel } from '../components/workspace/SceneAdaptationDirectionPanel';
import { SceneGateConfirmPanel } from '../components/workspace/SceneGateConfirmPanel';
import { SceneGateAnalysisPanel } from '../components/workspace/SceneGateAnalysisPanel';
import { SceneSupportPlaceholderWorkspace } from '../components/workspace/SceneSupportPlaceholderWorkspace';
import { SceneTopicIntentCheckPanel } from '../components/workspace/SceneTopicIntentCheckPanel';
import {
  ScenePrepSupportWorkspace,
  isPrepSupportSubmitStage,
} from '../components/workspace/ScenePrepSupportWorkspace';
import { getPrepSupportConfig } from '../lib/scene-prep-support-stages';
import { SceneIntakeBriefForm } from '../components/workspace/SceneIntakeBriefForm';
import { SceneGateBriefForm } from '../components/workspace/SceneGateBriefForm';
import { buildScenePipelineGroups, getSceneStageDefinitionLite } from '../lib/scene-pipeline-ui';
import { getRecommendedResumeStage, stagesCompletedForNav } from '../lib/scene-entry-path';
import {
  buildTopicBriefMarkdown,
  createTopicBriefHash,
  parseTopicBriefForm,
  type TopicBriefFormValues,
} from '../lib/topic-gate-form';
import {
  parseAdaptationDirectionsFromMarkdown,
  parseAdaptationSelectionFromArtifact,
  parseGateHITLFromArtifacts,
  parseTopicIntentCheckFromMarkdown,
  parseTopicAnalysisFromMarkdown,
} from '../lib/scene-hitl-markdown';
import {
  getStageReadiness,
  getWorkspaceTemplateForStage,
  readinessLabel,
  stageUsesFlowActions,
} from '../lib/scene-stage-capabilities';
import { copyPlainTextToClipboard } from '../lib/scene-copy';
import { ResizeHandle } from '../../components/ResizeHandle';
import { InspectorSection } from '../../ui/patterns/InspectorSection';
import { getNextPipelineStage, isPipelineTerminalStage } from '../lib/scene-stage-nav';
import {
  getContinueRunCapability,
  getStageSupportedRunners,
} from '../lib/scene-continue-run';
import { shouldAutoAdvanceAfterSupportSubmit } from '../lib/scene-light-confirmation';
import { SceneStageFlowActions } from '../components/workspace/SceneStageFlowActions';
import { useSceneForgeStudioLayout } from '../hooks/useSceneForgeStudioLayout';
import { useSceneStageContinuation } from '../hooks/useSceneStageContinuation';
import { SceneForgeStudioHeader } from '../components/studio/SceneForgeStudioHeader';
import { SceneForgeStudioPipelineSidebar } from '../components/studio/SceneForgeStudioPipelineSidebar';
import { SceneForgeStudioInspector, type SceneInspectorTab } from '../components/studio/SceneForgeStudioInspector';
import { SceneStageInputsPanel } from '../components/studio/SceneStageInputsPanel';
import { SceneStyleSelectorPanel } from '../components/studio/SceneStyleSelectorPanel';
import type { SceneCopyFeedback } from '../components/artifacts/ArtifactCopyPanel';
import {
  getPreferredStageArtifactId,
  resolveStageArtifactSelection,
  shouldClearAutoSelectedStageArtifact,
} from '../lib/scene-artifact-selection';
import {
  getSceneStageRunSessionKey,
  useSceneStageRunSessionStore,
} from '../store/scene-stage-run-session';
import styles from './SceneForgeStudio.module.css';

const CORE_STUDIO_STAGES = new Set<SceneStageId>(['design', 'storyboard', 'video_prompts']);
const SUPPORT_SUBMIT_STAGES = new Set<SceneStageId>([
  'source_intake',
  'reference',
  'story',
  'assets',
  'script',
  'performance',
  'audio',
  'publish',
]);
const CORE_EXPECTED_COUNTS: Partial<Record<SceneStageId, number>> = {
  design: 5,
  storyboard: 4,
  video_prompts: 3,
};

const policyOptions: Array<{ value: SceneApprovalPolicy; label: string; description: string }> = [
  { value: 'required', label: 'Required', description: '必审' },
  { value: 'optional', label: 'Optional', description: '可选审批' },
  { value: 'auto_if_valid', label: 'Auto if valid', description: '校验通过自动推进' },
  { value: 'skip', label: 'Skip', description: '跳过审批' },
];

const riskyPolicies: SceneApprovalPolicy[] = ['auto_if_valid', 'skip'];

function getPrimaryValidationMessage(validation: SceneValidationResult | null | undefined): string {
  if (!validation) {
    return '阶段校验未通过。';
  }
  const primaryError =
    validation.errors.find((item) => item.level === 'error') ??
    validation.errors[0] ??
    null;
  return primaryError?.message ?? '阶段校验未通过。';
}

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
  const [topicIntentCheckMarkdown, setTopicIntentCheckMarkdown] = useState('');
  const [topicIntentCheckLiveMarkdown, setTopicIntentCheckLiveMarkdown] = useState('');
  const [topicAnalysisMarkdown, setTopicAnalysisMarkdown] = useState('');
  const [gateConfirmationsMarkdown, setGateConfirmationsMarkdown] = useState('');
  const [adaptationSelectionMarkdown, setAdaptationSelectionMarkdown] = useState('');
  const [prepSupportMarkdown, setPrepSupportMarkdown] = useState('');
  const [topicBriefLoaded, setTopicBriefLoaded] = useState(false);
  const [pendingStageRunResult, setPendingStageRunResult] = useState<SceneStageRunnerResult | null>(
    null,
  );
  const [stageContext, setStageContext] = useState<SceneStageContext | null>(null);
  const [autoAdvanceMessage, setAutoAdvanceMessage] = useState<string | null>(null);
  const [topicIntentDirty, setTopicIntentDirty] = useState(false);
  const [topicIntentCheckBusy, setTopicIntentCheckBusy] = useState(false);
  const [topicBriefDraft, setTopicBriefDraft] = useState<TopicBriefFormValues>({
    intent: '',
    totalDurationSec: 60,
    segmentDurationSec: 8,
  });
  const autoAdvanceTimerRef = useRef<number | null>(null);

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
    entryStageSynced.current = false;
    setTopicIntentCheckLiveMarkdown('');
  }, [projectDir]);

  useEffect(() => {
    if (!projectState?.entryPath || entryStageSynced.current) {
      return;
    }
    entryStageSynced.current = true;
    const stageStatuses: Partial<Record<SceneStageId, import('../../types/sceneforge').SceneStageStatus>> = {};
    if (projectState.state.stages) {
      for (const [id, runtime] of Object.entries(projectState.state.stages)) {
        if (runtime?.status) {
          stageStatuses[id as SceneStageId] = runtime.status;
        }
      }
    }
    setSelectedStage(
      getRecommendedResumeStage({
        entryPath: projectState.entryPath,
        currentStage: projectState.state.currentStage,
        stageStatuses,
      }),
    );
  }, [projectState?.entryPath, projectState?.state.currentStage, projectState?.state.stages]);
  const selectedArtifact = useMemo<SceneArtifact | null>(() => {
    return projectState?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null;
  }, [projectState?.artifacts, selectedArtifactId]);
  const currentPolicy =
    projectState?.approvalPolicies[selectedStage] ??
    getSceneStageDefinitionLite(selectedStage).defaultApprovalPolicy;
  const stageState = projectState?.state.stages[selectedStage];
  const stageStatus = stageState?.status;
  const selectedStageSession = useSceneStageRunSessionStore((state) => {
    if (!projectDir) return null;
    return state.sessions.get(getSceneStageRunSessionKey(projectDir, selectedStage)) ?? null;
  });
  const topicGateAnalyzing =
    selectedStage === 'topic_gate' && selectedStageSession?.status === 'running';

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

  const refreshProjectState = useCallback(async (): Promise<SceneProjectState | null> => {
    if (!projectDir || typeof window === 'undefined' || !window.electronAPI?.sceneGetProjectState) {
      return null;
    }
    try {
      setErrorMessage(null);
      const nextState = await window.electronAPI.sceneGetProjectState(projectDir);
      setProjectState(nextState);
      return nextState;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '读取 SceneForge 项目状态失败。');
      return null;
    }
  }, [projectDir]);

  useEffect(() => {
    void refreshProjectState();
  }, [refreshProjectState]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current != null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!projectDir || !projectState?.artifacts.length) {
      setSourceMaterialMarkdown('');
      setTopicBriefMarkdown('');
      setTopicIntentCheckMarkdown('');
      setTopicAnalysisMarkdown('');
      setGateConfirmationsMarkdown('');
      setAdaptationSelectionMarkdown('');
      setPrepSupportMarkdown('');
      setTopicBriefLoaded(false);
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
    setTopicBriefLoaded(false);
    void load('source_intake.source_material', setSourceMaterialMarkdown);
    void (async () => {
      if (!projectState.artifacts.some((a) => a.id === 'topic_gate.topic_brief')) {
        setTopicBriefMarkdown('');
        setTopicBriefLoaded(true);
        return;
      }
      try {
        const { content } = await window.electronAPI.sceneReadArtifact(projectDir, 'topic_gate.topic_brief');
        setTopicBriefMarkdown(content);
      } catch {
        setTopicBriefMarkdown('');
      } finally {
        setTopicBriefLoaded(true);
      }
    })();
    void load('topic_gate.intent_check', setTopicIntentCheckMarkdown);
    void load('topic_gate.topic_analysis', setTopicAnalysisMarkdown);
    void load('topic_gate.gate_confirmations', setGateConfirmationsMarkdown);
    void load('source_intake.adaptation_selection', setAdaptationSelectionMarkdown);
  }, [projectDir, projectState?.artifacts]);

  useEffect(() => {
    setTopicBriefDraft(parseTopicBriefForm(topicBriefMarkdown));
  }, [topicBriefMarkdown]);

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

  useEffect(() => {
    if (!projectDir || typeof window === 'undefined' || !window.electronAPI?.sceneGetStageContext) {
      setStageContext(null);
      return;
    }
    let cancelled = false;
    window.electronAPI
      .sceneGetStageContext(projectDir, selectedStage)
      .then((nextContext) => {
        if (!cancelled) {
          setStageContext(nextContext);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStageContext(null);
          setErrorMessage(error instanceof Error ? error.message : '读取阶段输入上下文失败。');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectDir, projectState, selectedStage]);

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
  const topicAnalysis = useMemo(
    () => parseTopicAnalysisFromMarkdown(topicAnalysisMarkdown),
    [topicAnalysisMarkdown],
  );
  const hasLoadedTopicBriefContent = topicBriefLoaded && Boolean(topicBriefMarkdown.trim());
  const visibleTopicIntentCheckMarkdown = useMemo(() => {
    if (topicIntentCheckLiveMarkdown.trim()) {
      return topicIntentCheckLiveMarkdown;
    }
    return hasLoadedTopicBriefContent ? topicIntentCheckMarkdown : '';
  }, [hasLoadedTopicBriefContent, topicIntentCheckLiveMarkdown, topicIntentCheckMarkdown]);
  const topicIntentCheck = useMemo(
    () => parseTopicIntentCheckFromMarkdown(visibleTopicIntentCheckMarkdown),
    [visibleTopicIntentCheckMarkdown],
  );
  const hasTopicIntentCheckResult =
    topicIntentCheck.status !== 'unknown' || Boolean(topicIntentCheck.summary);
  const currentTopicBriefMarkdown = useMemo(() => buildTopicBriefMarkdown(topicBriefDraft), [topicBriefDraft]);
  const currentIntentHash = useMemo(() => createTopicBriefHash(topicBriefDraft), [topicBriefDraft]);
  const topicIntentCheckStale =
    hasLoadedTopicBriefContent &&
    hasTopicIntentCheckResult &&
    (topicIntentCheck.intentHash !== null &&
      currentIntentHash.length > 0 &&
      topicIntentCheck.intentHash !== currentIntentHash);
  const topicIntentNeedsSave = topicIntentDirty;
  const topicIntentCheckPassed = topicIntentCheck.status === 'pass' && !topicIntentCheckStale;
  const topicIntentSaveEnabled = topicIntentCheckPassed;
  const gateState = useMemo(() => {
    if (gateHitl.styleConfirmed) {
      return gateHitl;
    }
    if (topicAnalysis.styleCandidates.length === 0 && topicAnalysis.decisionSuggestion === null) {
      return gateHitl;
    }
    return {
      ...gateHitl,
      decision: gateHitl.decision ?? topicAnalysis.decisionSuggestion,
      styleOptions:
        topicAnalysis.styleCandidates.length > 0 ? topicAnalysis.styleCandidates : gateHitl.styleOptions,
    };
  }, [gateHitl, topicAnalysis.decisionSuggestion, topicAnalysis.styleCandidates]);
  const topicAnalysisReady =
    Boolean(topicAnalysis.summary) ||
    topicAnalysis.scoreState.items.length > 0 ||
    topicAnalysis.styleCandidates.length > 0;

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

  const flowCanValidate = gateReadyToValidate && intakeReadyToValidate && !topicGateAnalyzing;
  const flowValidateHint = gateValidateHint ?? intakeValidateHint;
  const isTerminalPipelineStage = isPipelineTerminalStage(selectedStage);
  const flowCanContinue =
    topicGateAnalyzing
      ? false
      : selectedStage === 'topic_gate' && gateHitl.decision === 'drop'
        ? false
        : canContinueStage;
  const flowContinueHint =
    topicGateAnalyzing
      ? '正在分析选题，请等待当前执行完成。'
      : !validatePassedForStage
      ? '请先通过 Validate。'
      : selectedStage === 'topic_gate' && gateHitl.decision === 'drop'
        ? '已放弃选题，当前阶段不会继续推进。'
        : !flowCanContinue
          ? '校验通过后方可 Continue。'
          : isTerminalPipelineStage
            ? '将校验全部阶段并标记项目创作完成。'
            : undefined;
  const flowStageMode =
    CORE_STUDIO_STAGES.has(selectedStage) ? 'core_confirm' : 'support_light';
  const prepSupportAutoAdvance =
    isPrepSupportSubmitStage(selectedStage) &&
    shouldAutoAdvanceAfterSupportSubmit(selectedStage, currentPolicy);
  const hasDedicatedStagePrimaryAction =
    selectedStage === 'source_intake' || selectedStage === 'topic_gate';
  const showBottomFlowActions =
    stageUsesFlowActions(selectedStage) &&
    !hasDedicatedStagePrimaryAction &&
    !(isPrepSupportSubmitStage(selectedStage) && prepSupportAutoAdvance);
  const nextStage = getNextPipelineStage(selectedStage);
  const continueRunCapability = getContinueRunCapability({
    currentStage: selectedStage,
    canContinue: flowCanContinue,
    nextStage,
    supportedRunners: getStageSupportedRunners(nextStage),
    runnerType: 'direct_llm',
  });
  const nextStageTitle = nextStage ? getSceneStageDefinitionLite(nextStage).titleZh : undefined;

  const persistCurrentStage = useCallback(
    async (stage: SceneStageId): Promise<SceneProjectState | null> => {
      if (!projectDir || typeof window === 'undefined' || !window.electronAPI?.sceneSetCurrentStage) {
        return null;
      }
      try {
        const nextState = await window.electronAPI.sceneSetCurrentStage(projectDir, stage);
        setProjectState(nextState);
        return nextState;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '持久化当前阶段失败。');
        return null;
      }
    },
    [projectDir],
  );

  const navigateToStage = useCallback(
    async (stage: SceneStageId) => {
      const nextState = (await persistCurrentStage(stage)) ?? (await refreshProjectState());
      setSelectedStage(stage);
      setValidation(null);
      setCopyFeedback(null);
      const nextId = getPreferredStageArtifactId(nextState?.artifacts ?? projectState?.artifacts ?? [], stage);
      if (nextId) {
        setSelectedArtifactId(nextId);
        setSelectedTab('Preview');
      } else {
        setSelectedArtifactId(null);
      }
    },
    [persistCurrentStage, projectState?.artifacts, refreshProjectState],
  );

  const stageContinuation = useSceneStageContinuation({
    approve: async (stage) => {
      if (!projectDir) throw new Error('请先打开 SceneForge 项目目录。');
      await window.electronAPI.sceneApproveStage(projectDir, stage);
    },
    navigate: navigateToStage,
    run: async (stage, runnerType) => {
      if (!projectDir) throw new Error('请先打开 SceneForge 项目目录。');
      return window.electronAPI.sceneRunStage({ projectDir, stage, runnerType });
    },
    finalizeProject: async () => {
      if (!projectDir || !window.electronAPI.sceneCompleteProject) {
        throw new Error('无法完成项目：缺少 SceneForge 接口。');
      }
      await window.electronAPI.sceneCompleteProject(projectDir);
      await refreshProjectState();
    },
  });

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

  const handleContinueStage = async (mode: 'navigate' | 'navigate_and_run' = 'navigate') => {
    if (!projectDir || !flowCanContinue) return;
    const stageAtApprove = selectedStage;
    const statusNow = projectState?.state.stages[stageAtApprove]?.status;
    if (!statusNow) return;
    setErrorMessage(null);
    try {
      const result = await stageContinuation.continueStage({
        currentStage: stageAtApprove,
        currentStatus: statusNow,
        mode,
        runnerType: 'direct_llm',
      });
      if (result.runResult) {
        setPendingStageRunResult(result.runResult);
      }
      if (result.runError) {
        setErrorMessage(result.runError);
      }
      if (isPipelineTerminalStage(stageAtApprove) && !result.nextStage) {
        const refreshed = await refreshProjectState();
        if (refreshed?.state.status === 'completed') {
          setAutoAdvanceMessage('全项目校验已通过，创作工坊项目已标记为完成。');
          if (autoAdvanceTimerRef.current != null) {
            window.clearTimeout(autoAdvanceTimerRef.current);
          }
          autoAdvanceTimerRef.current = window.setTimeout(() => {
            setAutoAdvanceMessage(null);
            autoAdvanceTimerRef.current = null;
          }, 6000);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '阶段推进失败。');
    }
  };

  const handleDedicatedStageContinue = useCallback(
    async (stage: SceneStageId, result: SubmitStageDraftResult) => {
      const nextState = await refreshProjectState();
      const statusNow = nextState?.state.stages[stage]?.status;
      if (!statusNow) {
        return;
      }
      const nextStage = getNextPipelineStage(stage);
      if (!nextStage) {
        return;
      }
      const continuation = await stageContinuation.continueStage({
        currentStage: stage,
        currentStatus: statusNow,
        mode: 'navigate',
        runnerType: 'direct_llm',
      });
      if (continuation.nextStage && result.validation.status === 'passed') {
        const fromTitle = getSceneStageDefinitionLite(stage).titleZh;
        const nextTitle = getSceneStageDefinitionLite(continuation.nextStage).titleZh;
        setAutoAdvanceMessage(`「${fromTitle}」已确认，已进入「${nextTitle}」。`);
        if (autoAdvanceTimerRef.current != null) {
          window.clearTimeout(autoAdvanceTimerRef.current);
        }
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          setAutoAdvanceMessage(null);
          autoAdvanceTimerRef.current = null;
        }, 4000);
      }
    },
    [refreshProjectState, stageContinuation],
  );

  const handleSupportStageSubmitted = useCallback(
    async (stage: SceneStageId, result: SubmitStageDraftResult) => {
      const nextState = await refreshProjectState();
      const policy =
        nextState?.approvalPolicies[stage] ??
        projectState?.approvalPolicies[stage] ??
        getSceneStageDefinitionLite(stage).defaultApprovalPolicy;
      if (
        result.validation.status !== 'passed' ||
        !shouldAutoAdvanceAfterSupportSubmit(stage, policy)
      ) {
        return;
      }
      const nextStage = getNextPipelineStage(stage);
      if (!nextStage) {
        return;
      }
      const fromTitle = getSceneStageDefinitionLite(stage).titleZh;
      const nextTitle = getSceneStageDefinitionLite(nextStage).titleZh;
      setAutoAdvanceMessage(`「${fromTitle}」已提交并通过校验，已自动进入「${nextTitle}」。`);
      if (autoAdvanceTimerRef.current != null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        setAutoAdvanceMessage(null);
        autoAdvanceTimerRef.current = null;
      }, 4000);
      await navigateToStage(nextStage);
    },
    [navigateToStage, projectState?.approvalPolicies, refreshProjectState],
  );

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

  useEffect(() => {
    const artifacts = projectState?.artifacts ?? [];
    setSelectedArtifactId((current) => {
      const next = resolveStageArtifactSelection({
        artifacts,
        stage: selectedStage,
        selectedArtifactId: current,
      });
      return next === current ? current : next;
    });
  }, [projectState?.artifacts, selectedStage]);

  useEffect(() => {
    const artifacts = projectState?.artifacts ?? [];
    const hasPendingDraft = Boolean(selectedStageSession?.pendingArtifacts);
    setSelectedArtifactId((current) => {
      if (
        !shouldClearAutoSelectedStageArtifact({
          artifacts,
          stage: selectedStage,
          selectedArtifactId: current,
          hasPendingDraft,
          stageStatus,
        })
      ) {
        return current;
      }
      return null;
    });
  }, [projectState?.artifacts, selectedStage, selectedStageSession?.pendingArtifacts, stageStatus]);

  const selectStage = (stageId: SceneStageId) => {
    setSelectedStage(stageId);
    setCopyFeedback(null);
    const artifacts = projectState?.artifacts ?? [];
    const nextId = getPreferredStageArtifactId(artifacts, stageId);
    if (nextId) {
      setSelectedArtifactId(nextId);
      setSelectedTab('Preview');
    } else {
      setSelectedArtifactId(null);
    }
    void persistCurrentStage(stageId);
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

  const refreshStageArtifacts = useCallback(
    async (stage: SceneStageId) => {
      const nextState = await refreshProjectState();
      const nextId = getPreferredStageArtifactId(
        nextState?.artifacts ?? projectState?.artifacts ?? [],
        stage,
      );
      if (nextId) {
        setSelectedArtifactId(nextId);
        setSelectedTab('Preview');
      }
    },
    [projectState?.artifacts, refreshProjectState],
  );

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
  // gate 确认后，下游阶段只展示当前阶段真正会注入的项目级参考资产，避免与上游依赖混淆。
  const showStageInputsPanel = selectedStage !== 'source_intake' && selectedStage !== 'topic_gate' && stageContext !== null;
  const showProjectAssetPanel = Boolean(stageContext?.assetLibrary?.snippets.length);

  const layout = useSceneForgeStudioLayout();

  const previewText =
    displayModel?.summary ||
    (displayModel?.copyBlocks.find((b) => b.target === 'full')?.text.slice(0, 400) ?? '') ||
    artifactContent ||
    '暂无预览内容';
  const coreStageCanValidate =
    !CORE_STUDIO_STAGES.has(selectedStage) ||
    stageStatus === 'draft_submitted' ||
    stageStatus === 'validation_failed' ||
    stageStatus === 'revision_requested' ||
    stageStatus === 'validated' ||
    stageStatus === 'waiting_approval' ||
    stageStatus === 'approved' ||
    stageStatus === 'completed' ||
    stageStatus === 'skipped';
  const coreStageValidateHint =
    CORE_STUDIO_STAGES.has(selectedStage) && !coreStageCanValidate
      ? '请先运行本阶段并提交草案到产物库。'
      : undefined;

  const sessions = useSceneStageRunSessionStore((state) => state.sessions);
  const isAnyStageRunning = useMemo(() => {
    if (stageContinuation.busy === 'running_next') return true;
    if (!projectDir) return false;
    return Array.from(sessions.values()).some(
      (s) => s.projectDir === projectDir && (s.status === 'running' || s.status === 'submitting')
    );
  }, [sessions, projectDir, stageContinuation.busy]);

  return (
    <main className={styles.page}>
      <SceneForgeStudioHeader
        projectStatus={projectState?.state.status}
        isAnyStageRunning={isAnyStageRunning}
      />

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
                    : selectedStage === 'topic_gate'
                      ? '先保存选题简报，再生成分析建议，最后由你确认是否继续推进。'
                      : workspaceTemplate === 'support'
                        ? '使用当前工作区完成该阶段内容。'
                        : '等待该阶段专用工作区完成配置。'}
              </p>
            </header>

            {showStageInputsPanel ? <SceneStageInputsPanel stageContext={stageContext} /> : null}

            {showProjectAssetPanel && stageContext?.assetLibrary ? (
              <SceneStyleSelectorPanel
                assetLibrary={stageContext.assetLibrary}
              />
            ) : null}

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
              </InspectorSection>
            ) : CORE_STUDIO_STAGES.has(selectedStage) ? (
              <p className={styles.emptyCopy}>提交并校验通过后，核心 final 产物会出现在这里。</p>
            ) : SUPPORT_SUBMIT_STAGES.has(selectedStage) ? null : workspaceTemplate === 'support' ? null : (
              <p className={styles.emptyCopy}>
                「{selectedStageMeta.title}」的专用工作区正在补齐中。
              </p>
            )}

            {selectedStage === 'source_intake' ? (
              <>
                <SceneIntakeBriefForm
                  projectDir={projectDir}
                  initialMarkdown={sourceMaterialMarkdown}
                  onSubmitted={(result) => void handleSupportStageSubmitted('source_intake', result)}
                  onError={(message) => setErrorMessage(message)}
                />
                <SceneAdaptationDirectionPanel
                  projectDir={projectDir}
                  status={intakeAdaptation.status}
                  directions={intakeAdaptation.directions}
                  selectedId={intakeAdaptation.selectedId}
                  onConfirmed={(result) => void handleDedicatedStageContinue('source_intake', result)}
                  onError={(message) => setErrorMessage(message)}
                />
              </>
            ) : null}

            {selectedStage === 'topic_gate' ? (
              <div className={styles.stageBusyShell}>
                {topicGateAnalyzing ? (
                  <div className={styles.stageBusyOverlay} role="status" aria-live="polite" aria-busy="true">
                    <div className={styles.stageBusyCard}>
                      <div className={styles.stageBusyBeacon} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className={styles.stageBusyText}>
                        <strong>正在分析选题</strong>
                        <p>当前阶段已加锁，等待模型返回评分、决策建议与风格候选。</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className={topicGateAnalyzing ? styles.stageBusyContent : undefined} aria-hidden={topicGateAnalyzing}>
                <InspectorSection title="选题简报" className={styles.workspaceSection}>
                  <SceneGateBriefForm
                    projectDir={projectDir}
                    initialMarkdown={topicBriefMarkdown}
                    canSave={topicIntentSaveEnabled}
                    confirmBusy={topicIntentCheckBusy}
                    confirmPassed={topicIntentCheckPassed}
                    onDraftChange={({ form }) => {
                      setTopicBriefDraft(form);
                    }}
                    onConfirmDraft={({ markdown }) => {
                      if (!projectDir || !window.electronAPI?.sceneCheckTopicIntent) {
                        setErrorMessage('请先打开 SceneForge 项目目录。');
                        return;
                      }
                      setTopicIntentCheckBusy(true);
                      setErrorMessage(null);
                      void window.electronAPI
                        .sceneCheckTopicIntent({ projectDir, topicBriefMarkdown: markdown })
                        .then((result) => {
                          setTopicIntentCheckLiveMarkdown(result.content);
                          return refreshProjectState();
                        })
                        .catch((error) =>
                          setErrorMessage(error instanceof Error ? error.message : '确认选题描述失败。'),
                        )
                        .finally(() => setTopicIntentCheckBusy(false));
                    }}
                    onIntentDirtyChange={setTopicIntentDirty}
                    onSubmitted={(result) => void handleSupportStageSubmitted('topic_gate', result)}
                    onError={(message) => setErrorMessage(message)}
                  />
                  <SceneTopicIntentCheckPanel
                    projectDir={projectDir}
                    topicBriefMarkdown={currentTopicBriefMarkdown}
                    initialCheckMarkdown={visibleTopicIntentCheckMarkdown}
                    stale={topicIntentCheckStale}
                    busy={topicIntentCheckBusy}
                    showAction={false}
                    onError={(message) => setErrorMessage(message)}
                  />
                </InspectorSection>
                <InspectorSection title="分析选题" className={styles.workspaceSection}>
                  <SceneGateAnalysisPanel
                    projectDir={projectDir}
                    topicBriefMarkdown={topicBriefMarkdown}
                    intentCheckStatus={
                      topicIntentCheckPassed
                        ? 'pass'
                        : topicIntentCheck.status === 'stale'
                          ? 'needs_more'
                          : topicIntentCheck.status
                    }
                    intentCheckStale={topicIntentNeedsSave || topicIntentCheckStale}
                    initialAnalysisMarkdown={topicAnalysisMarkdown}
                    busy={topicGateAnalyzing}
                    onAnalyzed={() => void refreshProjectState()}
                    onError={(message) => setErrorMessage(message)}
                  />
                </InspectorSection>
                <InspectorSection title="风格与决策" className={styles.workspaceSection}>
                  <SceneGateConfirmPanel
                    projectDir={projectDir}
                    gateState={gateState}
                    topicBriefMarkdown={topicBriefMarkdown}
                    analysisReady={topicAnalysisReady}
                    suggestedDecision={topicAnalysis.decisionSuggestion}
                    onSubmitted={(result, decision) => {
                      if (decision === 'go') {
                        void handleDedicatedStageContinue('topic_gate', result);
                        return;
                      }
                      void refreshProjectState();
                    }}
                    onError={(message) => setErrorMessage(message)}
                  />
                </InspectorSection>
                </div>
              </div>
            ) : null}

            {isPrepSupportSubmitStage(selectedStage) ? (
              <ScenePrepSupportWorkspace
                projectDir={projectDir}
                stage={selectedStage}
                stageTitle={selectedStageMeta.title}
                autoAdvanceAfterSubmit={prepSupportAutoAdvance}
                currentStatus={stageState?.status}
                revisionNote={stageState?.revisionNote ?? null}
                initialContent={prepSupportMarkdown}
                onSubmitted={(result) => void handleSupportStageSubmitted(selectedStage, result)}
                onError={(message) => setErrorMessage(message)}
              />
            ) : null}

            {workspaceTemplate === 'support' && !isPrepSupportSubmitStage(selectedStage) ? (
              <SceneSupportPlaceholderWorkspace stage={selectedStage} stageTitle={selectedStageMeta.title} />
            ) : null}

            {showBottomFlowActions ? (
              <SceneStageFlowActions
                stageMode={flowStageMode}
                canValidate={flowCanValidate}
                validateDisabledReason={flowValidateHint}
                validatePassed={validatePassedForStage}
                validateFailed={validation?.status === 'failed'}
                canContinue={flowCanContinue}
                continueDisabledReason={flowContinueHint}
                onValidate={() => void handleValidate()}
                onContinue={() => void handleContinueStage('navigate')}
                onContinueAndRun={() => void handleContinueStage('navigate_and_run')}
                canContinueAndRun={continueRunCapability.canRun}
                nextStageTitle={nextStageTitle}
                validateBusy={flowBusy === 'validate'}
                continueBusy={stageContinuation.busy === 'approving' || stageContinuation.busy === 'navigating'}
                runningNext={stageContinuation.busy === 'running_next'}
                isTerminalStage={isTerminalPipelineStage}
                projectCompleted={projectState?.state.status === 'completed'}
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
                description={getPrimaryValidationMessage(validation)}
              />
            )}

            <StageRunPanel
              projectDir={projectDir}
              stage={selectedStage}
              stageTitle={selectedStageMeta.title}
              currentStatus={stageState?.status}
              revisionNote={stageState?.revisionNote ?? null}
              onRunError={(message) => setErrorMessage(message)}
              onSubmitted={() => void refreshStageArtifacts(selectedStage)}
              onRevisionRequested={() => void refreshProjectState()}
              initialRunResult={
                pendingStageRunResult?.stage === selectedStage ? pendingStageRunResult : null
              }
              onInitialRunResultConsumed={() => setPendingStageRunResult(null)}
            />

              <SceneStageFlowActions
              stageMode={flowStageMode}
              canValidate={Boolean(projectDir) && coreStageCanValidate}
              validatePassed={validatePassedForStage}
              validateFailed={validation?.status === 'failed'}
              canContinue={canContinueStage}
              validateDisabledReason={coreStageValidateHint}
              continueDisabledReason={!validatePassedForStage ? '请先通过 Validate。' : undefined}
              onValidate={() => void handleValidate()}
              onContinue={() => void handleContinueStage('navigate')}
              onContinueAndRun={() => void handleContinueStage('navigate_and_run')}
              canContinueAndRun={continueRunCapability.canRun}
              nextStageTitle={nextStageTitle}
              validateBusy={flowBusy === 'validate'}
              continueBusy={stageContinuation.busy === 'approving' || stageContinuation.busy === 'navigating'}
              runningNext={stageContinuation.busy === 'running_next'}
            />
              </>
            ) : null}

            {errorMessage ? (
              <div className={styles.alertStack}>
                <Alert variant="error" title="操作失败" description={errorMessage} dismissible onDismiss={() => setErrorMessage(null)} />
              </div>
            ) : null}
            {autoAdvanceMessage ? (
              <div className={styles.alertStack} aria-live="polite">
                <Alert
                  variant="success"
                  title="已自动进入下一阶段"
                  description={autoAdvanceMessage}
                  dismissible
                  onDismiss={() => setAutoAdvanceMessage(null)}
                />
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
