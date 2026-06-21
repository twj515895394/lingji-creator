import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Play } from 'lucide-react';
import type { SceneStageId, SceneStageStatus } from '../../../types/sceneforge';
import type {
  SceneRunStageInput,
  SceneStageContext,
  SceneStageRunProgressPayload,
  SceneStageRunnerResult,
  SceneValidationResult,
  SubmitStageDraftResult,
} from '../../../lib/electron-api';
import { useTaskProgressStore } from '../../../store/task-progress';
import {
  getSceneStageRunSessionKey,
  useSceneStageRunSessionStore,
} from '../../store/scene-stage-run-session';
import { Alert, Button } from '../../../ui';
import { SceneRunDraftReview } from './SceneRunDraftReview';
import { getSceneStageRunCapability, stageSupportsRunner } from '../../lib/scene-stage-run-capabilities';
import {
  formatMissingRequiredInputsMessage,
  hasBlockingMissingRequiredInputs,
  listMissingRequiredStageInputs,
  normalizeRequiredInputsForBlocking,
} from '../../lib/scene-required-context';
import styles from './StageRunPanel.module.css';

export type SceneStageRunnerType = SceneRunStageInput['runnerType'];
type StageRunVisualState = 'context' | 'running_fresh' | 'running_refine' | 'submitting';

const SUBMITTED_LOCKED_STATUSES: SceneStageStatus[] = [
  'draft_submitted',
  'validated',
  'waiting_approval',
  'approved',
  'completed',
  'skipped',
];

function buildReopenRevisionNote(stageTitle: string): string {
  return `用户已确认提交后的 ${stageTitle} 草案需要推翻，申请撤回当前确认结果并重新生成一版新草案。`;
}

const RUNNER_OPTIONS: Array<{
  value: SceneStageRunnerType;
  label: string;
  hint: string;
}> = [
  {
    value: 'manual_submit',
    label: '手动提交',
    hint: '仅返回粘贴草案，不自动写入产物',
  },
  {
    value: 'direct_llm',
    label: 'Direct LLM',
    hint: '主进程 LLM 生成草案，需再提交',
  },
  {
    value: 'acp_agent',
    label: 'ACP Agent',
    hint: '单轮 Agent 生成草案，需再提交到产物库',
  },
];

export interface StageRunPanelProps {
  projectDir: string | null;
  stage: SceneStageId;
  stageTitle: string;
  currentStatus?: SceneStageStatus;
  revisionNote?: string | null;
  disabled?: boolean;
  onRunComplete?: (result: SceneStageRunnerResult) => void;
  onRunError?: (message: string) => void;
  onSubmitted?: (result: SubmitStageDraftResult) => void;
  onRevisionRequested?: () => void;
  initialRunResult?: SceneStageRunnerResult | null;
  onInitialRunResultConsumed?: () => void;
  draftSubmitLabel?: string;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) {
      if (
        msg.includes('SCENE_DIRECT_LLM_NO_SETTINGS') ||
        msg.includes('未找到应用 LLM 设置') ||
        msg.includes('未配置任何 LLM Provider')
      ) {
        return `${msg} 请打开应用「设置 → AI」，配置 LLM Provider 与 API Key 后再试 Direct LLM。`;
      }
      if (msg.includes('SCENE_DIRECT_LLM_NO_MODEL') || msg.includes('未设置默认模型')) {
        return `${msg} 请打开「设置 → AI」，在默认模型中填写与 Provider 文档一致的模型 ID。`;
      }
      if (msg.includes('SCENE_DIRECT_LLM_INVOKE_FAILED') || msg.includes('LLM 接口返回 404')) {
        return msg.replace(/^Error invoking remote method[^:]*:\s*/i, '').trim();
      }
      if (msg.includes('SCENE_ACP_NO_AGENT') || msg.includes('未配置 Agent')) {
        return `${msg} 请打开应用「设置 → Agent」，完成 ACP Agent 配置后再试。`;
      }
      if (msg.includes('SCENE_ACP_PARSE_FAILED')) {
        return `${msg} Agent 返回的结构化 JSON 不合法，请重试或改用 Direct LLM。`;
      }
      if (msg.includes('SCENE_ACP_MISSING_ARTIFACTS')) {
        return `${msg} Agent 未返回完整草案字段，请重试或切换为手动提交。`;
      }
      return msg;
    }
  }
  if (error instanceof Error) return error.message;
  return '阶段运行失败。';
}

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

function buildRunSignalCopy(
  state: StageRunVisualState,
  stageTitle: string,
  runnerType: SceneStageRunnerType,
  liveProgress: SceneStageRunProgressPayload | null,
): {
  title: string;
  body: string;
  phaseLabel: string;
  progressLabel: string;
  progressPercent: number | null;
} {
  if (state === 'context') {
    return {
      title: `正在检查 ${stageTitle} 的阶段依赖`,
      body: '系统正在读取上游产物、执行能力与阶段契约，确认本轮请求可以安全发往模型。',
      phaseLabel: '校验上下文',
      progressLabel: '准备运行',
      progressPercent: null,
    };
  }
  if (state === 'submitting') {
    return {
      title: `正在写入 ${stageTitle} 产物`,
      body: '草案结果已返回，系统正在把本轮内容落入 Artifact Store，并同步执行提交后的规则校验。',
      phaseLabel: '提交与校验',
      progressLabel: '写入产物库',
      progressPercent: null,
    };
  }
  if (runnerType === 'direct_llm' && liveProgress) {
    const stepLabel = `${liveProgress.phaseLabel}（${liveProgress.current}/${liveProgress.total}）`;
    return {
      title: state === 'running_refine' ? `正在重塑 ${stageTitle} 草案` : `正在生成 ${stageTitle} 草案`,
      body:
        liveProgress.total > 1
          ? `系统正在按多段 LLM 串行生成当前阶段结果，当前已进入「${liveProgress.phaseLabel}」阶段。`
          : '请求已发往 LLM，系统正在执行当前阶段提示词并等待结构化结果返回。',
      phaseLabel: liveProgress.total > 1 ? `第 ${liveProgress.current} / ${liveProgress.total} 段` : '调用 LLM',
      progressLabel: stepLabel,
      progressPercent: Math.max(8, Math.round((liveProgress.current / liveProgress.total) * 100)),
    };
  }
  if (state === 'running_refine') {
    return {
      title: `正在重塑 ${stageTitle} 草案`,
      body: '本轮会带着补充意见整阶段重跑，让结构、镜头语言和下游契约一起重算。',
      phaseLabel: runnerType === 'direct_llm' ? '补充优化' : '重新执行 Runner',
      progressLabel: '重生草案',
      progressPercent: null,
    };
  }
  return {
    title: `正在生成 ${stageTitle} 草案`,
    body:
      runnerType === 'direct_llm'
        ? '请求已发往 LLM，系统正在组装阶段上下文、执行提示词并等待结构化结果返回。'
        : '请求已提交给当前 Runner，系统正在等待本轮草案结果返回。',
    phaseLabel: runnerType === 'direct_llm' ? '调用 LLM' : '执行 Runner',
    progressLabel: '等待返回',
    progressPercent: null,
  };
}

export function StageRunPanel({
  projectDir,
  stage,
  stageTitle,
  currentStatus,
  revisionNote = null,
  disabled = false,
  onRunComplete,
  onRunError,
  onSubmitted,
  onRevisionRequested,
  initialRunResult = null,
  onInitialRunResultConsumed,
  draftSubmitLabel,
}: StageRunPanelProps) {
  const initialSessionRunner =
    projectDir
      ? useSceneStageRunSessionStore
          .getState()
          .sessions.get(getSceneStageRunSessionKey(projectDir, stage))?.runnerType
      : null;
  const supportsDirectLlm = stageSupportsRunner(stage, 'direct_llm');
  const [runnerType, setRunnerType] = useState<SceneStageRunnerType>(() =>
    initialSessionRunner && stageSupportsRunner(stage, initialSessionRunner)
      ? initialSessionRunner
      : supportsDirectLlm
        ? 'direct_llm'
        : 'manual_submit',
  );
  const [stageContext, setStageContext] = useState<SceneStageContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [runVisualState, setRunVisualState] = useState<Exclude<StageRunVisualState, 'context' | 'submitting'> | null>(null);
  const sessionKey = projectDir ? getSceneStageRunSessionKey(projectDir, stage) : null;
  const session = useSceneStageRunSessionStore((state) =>
    sessionKey ? state.sessions.get(sessionKey) ?? null : null,
  );
  const upsertSession = useSceneStageRunSessionStore((state) => state.upsertSession);
  const clearPendingDraft = useSceneStageRunSessionStore((state) => state.clearPendingDraft);
  const matchingInitialResult = initialRunResult?.stage === stage ? initialRunResult : null;
  const pendingArtifacts = session?.pendingArtifacts ?? matchingInitialResult?.artifacts ?? null;
  const pendingRequiredKeys =
    session?.pendingRequiredKeys ??
    matchingInitialResult?.requiredArtifacts ??
    Object.keys(matchingInitialResult?.artifacts ?? {}).filter((key) => !key.startsWith('__'));
  const liveProgress = session?.progress ?? null;
  const refinementPrompt = session?.refinementPrompt ?? '';
  const lastHint = session?.lastHint ?? null;
  const errorLocal = session?.error ?? null;
  const running = session?.status === 'running';
  const submitting = session?.status === 'submitting';

  useEffect(() => {
    if (!projectDir || !initialRunResult || initialRunResult.stage !== stage) return;
    const keys = Object.keys(initialRunResult.artifacts).filter((key) => !key.startsWith('__'));
    upsertSession({
      projectDir,
      stage,
      runnerType: initialRunResult.runnerType,
      status: 'ready',
      pendingArtifacts: initialRunResult.artifacts,
      pendingRequiredKeys: initialRunResult.requiredArtifacts ?? keys,
      lastHint: `已自动生成 ${keys.length} 个草案字段，请审阅后手动提交。`,
      error: null,
    });
    onInitialRunResultConsumed?.();
  }, [initialRunResult, onInitialRunResultConsumed, projectDir, stage, upsertSession]);

  const refreshStageContext = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneGetStageContext) {
      setStageContext(null);
      return;
    }
    setContextLoading(true);
    try {
      const ctx = await window.electronAPI.sceneGetStageContext(projectDir, stage, {
        runner: runnerType,
      });
      setStageContext(ctx);
    } catch {
      setStageContext(null);
    } finally {
      setContextLoading(false);
    }
  }, [projectDir, runnerType, stage]);

  useEffect(() => {
    void refreshStageContext();
  }, [refreshStageContext]);

  const runnerOptions = useMemo(
    () =>
      RUNNER_OPTIONS.filter((option) => stageSupportsRunner(stage, option.value)),
    [stage],
  );

  useEffect(() => {
    if (!runnerOptions.some((o) => o.value === runnerType)) {
      setRunnerType(runnerOptions[0]?.value ?? 'manual_submit');
    }
  }, [runnerOptions, runnerType]);

  useEffect(() => {
    if (!session?.runnerType) {
      return;
    }
    if (runnerOptions.some((option) => option.value === session.runnerType) && session.runnerType !== runnerType) {
      setRunnerType(session.runnerType);
    }
  }, [runnerOptions, runnerType, session?.runnerType]);

  useEffect(() => {
    if (!projectDir || typeof window === 'undefined' || !window.electronAPI?.onSceneStageRunProgress) {
      return;
    }
    return window.electronAPI.onSceneStageRunProgress((payload) => {
      if (payload.projectDir !== projectDir || payload.stage !== stage) {
        return;
      }
      upsertSession({
        projectDir,
        stage,
        runnerType: payload.runnerType,
        status: 'running',
        progress: payload,
        error: null,
      });
      const activeTaskId =
        useSceneStageRunSessionStore
          .getState()
          .sessions.get(getSceneStageRunSessionKey(projectDir, stage))?.taskId ?? null;
      if (activeTaskId) {
        useTaskProgressStore.getState().updateTask(activeTaskId, {
          mode: 'determinate',
          progress: Math.max(8, Math.round((payload.current / payload.total) * 100)),
          phase:
            payload.total > 1
              ? `${payload.phaseLabel} (${payload.current}/${payload.total})`
              : payload.phaseLabel,
        });
      }
    });
  }, [projectDir, stage, upsertSession]);

  const blockingContext = useMemo(() => {
    if (!stageContext) {
      return { blocked: false, message: '' };
    }
    const requiredInputs = normalizeRequiredInputsForBlocking(stageContext.requiredInputs);
    const blocked = hasBlockingMissingRequiredInputs({ requiredInputs });
    const message = blocked
      ? formatMissingRequiredInputsMessage(listMissingRequiredStageInputs({ requiredInputs }))
      : '';
    return { blocked, message };
  }, [stageContext]);

  const runBlocked =
    (runnerType === 'direct_llm' || runnerType === 'acp_agent') && blockingContext.blocked;

  const canRequestRevision =
    Boolean(projectDir && window.electronAPI?.sceneRequestRevision) &&
    (currentStatus === 'draft_submitted' ||
      currentStatus === 'validation_failed' ||
      currentStatus === 'validated' ||
      currentStatus === 'waiting_approval' ||
      currentStatus === 'approved' ||
      currentStatus === 'completed' ||
      currentStatus === 'skipped');

  const canRun =
    Boolean(projectDir && window.electronAPI?.sceneRunStage) &&
    !disabled &&
    !SUBMITTED_LOCKED_STATUSES.includes(currentStatus ?? 'ready') &&
    !running &&
    !contextLoading &&
    !runBlocked;
  const capability = getSceneStageRunCapability(stage);
  const runLockedAfterSubmit = SUBMITTED_LOCKED_STATUSES.includes(currentStatus ?? 'ready');
  const canReopenSubmittedDraft = canRequestRevision && runLockedAfterSubmit;
  const canRefineDraft =
    runnerType === 'direct_llm' &&
    Boolean(projectDir && pendingArtifacts && Object.keys(pendingArtifacts).length > 0) &&
    !running &&
    !submitting;

  const primaryRunLabel = pendingArtifacts ? '重新生成草案' : '运行本阶段';

  const submitDraftArtifacts = async (
    artifactsMap: Record<string, string>,
    requiredKeys: string[],
  ): Promise<boolean> => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      return false;
    }
    if (capability.submitMode === 'none') {
      onRunError?.('当前阶段不支持从运行结果批量提交。');
      return false;
    }
    const missingKeys = requiredKeys.filter((key) => !artifactsMap[key]?.trim());
    if (requiredKeys.length === 0 || missingKeys.length > 0) {
      if (projectDir) {
        upsertSession({
          projectDir,
          stage,
          runnerType,
          status: 'ready',
          error: `草案不完整，缺少或为空：${missingKeys.join('、')}`,
        });
      }
      return false;
    }
    upsertSession({
      projectDir,
      stage,
      runnerType,
      status: 'submitting',
      error: null,
    });
    try {
      const artifacts = requiredKeys.map((artifactKey) => ({
        artifactKey,
        content: artifactsMap[artifactKey],
      }));
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage: stage as Exclude<SceneStageId, 'publish'>,
        artifacts,
      });
      if (result.validation.status === 'failed') {
        const msg = getPrimaryValidationMessage(result.validation);
        upsertSession({
          projectDir,
          stage,
          runnerType,
          status: 'ready',
          error: msg,
        });
        onRunError?.(msg);
        return false;
      }
      clearPendingDraft(projectDir, stage, `已提交 ${artifacts.length} 个产物到产物库。`);
      onSubmitted?.(result);
      return true;
    } catch (error) {
      const message = extractErrorMessage(error);
      upsertSession({
        projectDir,
        stage,
        runnerType,
        status: 'ready',
        error: message,
      });
      onRunError?.(message);
      return false;
    }
  };

  const handleSubmitDraft = async () => {
    if (!projectDir || !pendingArtifacts) {
      return;
    }
    setRunVisualState(null);
    await submitDraftArtifacts(pendingArtifacts, pendingRequiredKeys);
  };

  const executeRun = async (mode: 'fresh' | 'refine') => {
    if (!projectDir || !window.electronAPI?.sceneRunStage) {
      const msg = '请先打开 SceneForge 项目目录。';
      onRunError?.(msg);
      return;
    }
    if (runBlocked) {
      upsertSession({
        projectDir,
        stage,
        runnerType,
        status: 'error',
        error: blockingContext.message,
      });
      onRunError?.(blockingContext.message);
      return;
    }
    if (mode === 'refine' && !pendingArtifacts) {
      const msg = '当前没有可优化的草案。';
      upsertSession({
        projectDir,
        stage,
        runnerType,
        status: 'error',
        error: msg,
      });
      onRunError?.(msg);
      return;
    }
    if (mode === 'refine' && !refinementPrompt.trim()) {
      const msg = '请先填写一次性补充意见。';
      upsertSession({
        projectDir,
        stage,
        runnerType,
        status: 'error',
        error: msg,
      });
      onRunError?.(msg);
      return;
    }

    const taskId = `scene-run-${stage}-${Date.now()}`;
    const taskStore = useTaskProgressStore.getState();
    taskStore.startTask({
      id: taskId,
      category: 'ai-write',
      label: `SceneForge · ${stageTitle}`,
      mode: stage === 'storyboard' && runnerType === 'direct_llm' ? 'determinate' : 'indeterminate',
      progress: 0,
      phase: '运行阶段',
      level: 2,
      canCancel: false,
    });

    upsertSession({
      projectDir,
      stage,
      taskId,
      runnerType,
      status: 'running',
      error: null,
      lastHint: null,
      ...(mode === 'fresh'
        ? {
            pendingArtifacts: null,
            pendingRequiredKeys: [],
            refinementPrompt: '',
            progress: null,
          }
        : {}),
    });
    setRunVisualState(mode === 'refine' ? 'running_refine' : 'running_fresh');

    try {
      taskStore.updateTask(taskId, {
        phase:
          mode === 'refine'
            ? '按补充意见优化草案'
            : runnerType === 'direct_llm'
              ? '调用 LLM'
              : '执行 Runner',
      });
      const result = await window.electronAPI.sceneRunStage({
        projectDir,
        stage,
        runnerType,
        currentDraftArtifacts: mode === 'refine' ? pendingArtifacts ?? undefined : undefined,
        refinementPrompt: mode === 'refine' ? refinementPrompt.trim() : undefined,
      });

      const keys = Object.keys(result.artifacts).filter((k) => !k.startsWith('__'));
      const summary =
        keys.length > 0
          ? mode === 'refine'
            ? `已按补充意见生成 ${keys.length} 个新草案字段，请审阅后决定是否提交。`
            : `已生成 ${keys.length} 个草案字段，请点击下方「提交草案到产物库」。`
          : result.artifacts.__acp_session_brief
            ? 'ACP 简报已生成，请按 Agent 说明通过 MCP 提交。'
            : '运行完成，无草案内容。';

      if (keys.length > 0) {
        upsertSession({
          projectDir,
          stage,
          taskId: null,
          runnerType,
          status: 'ready',
          pendingArtifacts: result.artifacts,
          pendingRequiredKeys: result.requiredArtifacts ?? keys,
          progress: null,
        });
      }

      if (
        capability.draftCommitStrategy === 'auto_commit_if_generated' &&
        keys.length > 0
      ) {
        const committed = await submitDraftArtifacts(
          result.artifacts,
          result.requiredArtifacts ?? keys,
        );
        if (!committed) {
          upsertSession({
            projectDir,
            stage,
            taskId: null,
            runnerType,
            status: 'ready',
            pendingArtifacts: result.artifacts,
            pendingRequiredKeys: result.requiredArtifacts ?? keys,
            lastHint: '自动落盘失败，已保留本次草案供手动处理。',
            progress: null,
          });
        }
      } else {
        upsertSession({
          projectDir,
          stage,
          taskId: null,
          runnerType,
          status: 'ready',
          lastHint: summary,
          progress: null,
        });
      }
      taskStore.completeTask(taskId);
      onRunComplete?.(result);
    } catch (error) {
      const message = extractErrorMessage(error);
      upsertSession({
        projectDir,
        stage,
        taskId: null,
        runnerType,
        status: pendingArtifacts ? 'ready' : 'error',
        error: message,
        progress: null,
      });
      taskStore.failTask(taskId, message);
      onRunError?.(message);
    } finally {
      setRunVisualState(null);
    }
  };

  const handleRun = async () => {
    await executeRun('fresh');
  };

  const handleRefineDraft = async () => {
    await executeRun('refine');
  };

  const handleRequestRevision = async () => {
    if (!projectDir || !window.electronAPI?.sceneRequestRevision) {
      return;
    }
    const trimmed = revisionNote?.trim() || buildReopenRevisionNote(stageTitle);
    if (!trimmed) {
      const message = '修订说明不能为空。';
      if (projectDir) {
        upsertSession({
          projectDir,
          stage,
          runnerType,
          status: session?.status === 'submitting' ? 'submitting' : 'ready',
          error: message,
        });
      }
      onRunError?.(message);
      return;
    }

    setRequestingRevision(true);
    if (projectDir) {
      upsertSession({
        projectDir,
        stage,
        runnerType,
        status: pendingArtifacts ? 'ready' : 'idle',
        error: null,
      });
    }
    try {
      await window.electronAPI.sceneRequestRevision(projectDir, stage, trimmed);
      if (projectDir) {
        upsertSession({
          projectDir,
          stage,
          runnerType,
          status: pendingArtifacts ? 'ready' : 'idle',
          lastHint: '已撤回本轮确认。现在可以重新生成草案，生成后仍需再次提交与校验审批。',
          error: null,
        });
      }
      setShowReopenConfirm(false);
      onRevisionRequested?.();
      if (typeof window.electronAPI?.sceneRunStage === 'function') {
        await executeRun('fresh');
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      if (projectDir) {
        upsertSession({
          projectDir,
          stage,
          runnerType,
          status: pendingArtifacts ? 'ready' : 'error',
          error: message,
        });
      }
      onRunError?.(message);
    } finally {
      setRequestingRevision(false);
    }
  };

  const selectedHint = RUNNER_OPTIONS.find((o) => o.value === runnerType)?.hint ?? '';
  const activeRunSignal: StageRunVisualState | null =
    submitting
      ? 'submitting'
      : running
        ? (runVisualState ?? 'running_fresh')
        : contextLoading
          ? 'context'
          : null;
  const runSignalCopy = activeRunSignal
    ? buildRunSignalCopy(activeRunSignal, stageTitle, runnerType, liveProgress)
    : null;

  return (
    <section className={styles.panel} aria-label="阶段执行" data-testid="scene-stage-run-panel">
      <div className={styles.header}>
        <h3>执行方式</h3>
        <p>Runner</p>
      </div>
      <div className={styles.controls}>
        <label className={styles.label} htmlFor="scene-runner-select">
          执行方式
        </label>
        <select
          id="scene-runner-select"
          data-testid="scene-runner-select"
          value={runnerType}
          disabled={running}
          onChange={(e) => setRunnerType(e.target.value as SceneStageRunnerType)}
        >
          {runnerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.hint}>{selectedHint}</p>
        {runSignalCopy ? (
          <div className={styles.runSignalCard} data-testid="scene-run-signal-card" aria-live="polite">
            <div className={styles.runSignalVisual} aria-hidden="true">
              <span className={styles.runSignalRing} />
              <span className={styles.runSignalRingDelayed} />
              <span className={styles.runSignalCore}>
                <LoaderCircle size={16} className={styles.runSignalIcon} />
              </span>
            </div>
            <div className={styles.runSignalMeta}>
              <div className={styles.runSignalHeader}>
                <strong>{runSignalCopy.title}</strong>
                <span>{runSignalCopy.phaseLabel}</span>
              </div>
              <p>{runSignalCopy.body}</p>
              <div className={styles.runSignalRail} role="presentation">
                <span
                  className={styles.runSignalRailFill}
                  data-determinate={runSignalCopy.progressPercent !== null ? 'true' : 'false'}
                  style={
                    runSignalCopy.progressPercent !== null
                      ? { width: `${runSignalCopy.progressPercent}%` }
                      : undefined
                  }
                />
              </div>
              <div className={styles.runSignalFooter}>
                <span>{runSignalCopy.progressLabel}</span>
                <span>{runnerType === 'direct_llm' ? 'Direct LLM' : selectedHint}</span>
              </div>
            </div>
          </div>
        ) : null}
        {runBlocked ? (
          <Alert
            variant="warning"
            title="无法运行"
            description={blockingContext.message}
            className={styles.runAlert}
          />
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid="scene-run-stage-button"
          disabled={!canRun}
          title={
            !projectDir
              ? '需要已打开的 SceneForge 项目'
              : SUBMITTED_LOCKED_STATUSES.includes(currentStatus ?? 'ready')
                ? '当前阶段草案已提交；如需重做，请先登记修订。'
              : runBlocked
                ? blockingContext.message
                : contextLoading
                  ? '正在检查上游产物…'
                  : undefined
          }
          onClick={() => void handleRun()}
        >
          <Play size={14} aria-hidden />
          {running ? '运行中…' : primaryRunLabel}
        </Button>
        {runLockedAfterSubmit ? (
          <p className={styles.hint}>
            当前草案已提交并视为本轮确认结果。若要推翻这次确认，请先撤回后再重新生成。
          </p>
        ) : null}
        {pendingArtifacts ? (
          <p className={styles.hint}>
            重新生成只会替换当前待提交草案，不会直接覆盖已提交产物。
          </p>
        ) : null}
        {canReopenSubmittedDraft ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="scene-reopen-regenerate-button"
              disabled={requestingRevision || running || submitting}
              onClick={() => setShowReopenConfirm((value) => !value)}
            >
              {showReopenConfirm ? '收起撤回确认' : '撤回并重生成'}
            </Button>
            <p className={styles.hint}>
              不会直接覆盖已提交产物，而是先撤回本轮确认，再重新开放生成入口。
            </p>
          </>
        ) : null}
        {showReopenConfirm && canReopenSubmittedDraft ? (
          <div className={styles.reopenConfirm} data-testid="scene-reopen-confirm-panel">
            <Alert
              variant="warning"
              title="重新生成会推翻当前确认结果"
              description="确认后，本阶段会回到待修订状态。你可以重新生成草案，但新结果仍需再次提交并重新校验审批。"
              className={styles.runAlert}
            />
            <div className={styles.reopenActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="scene-confirm-reopen-button"
                disabled={requestingRevision || running || submitting}
                onClick={() => void handleRequestRevision()}
              >
                {requestingRevision ? '撤回中…' : '确认重生成'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="scene-cancel-reopen-button"
                disabled={requestingRevision}
                onClick={() => setShowReopenConfirm(false)}
              >
                取消
              </Button>
            </div>
          </div>
        ) : null}
        {currentStatus === 'revision_requested' && revisionNote ? (
          <Alert
            variant="warning"
            title="当前阶段已请求修订"
            description={`修订说明：${revisionNote}`}
            className={styles.runAlert}
          />
        ) : null}
        {pendingArtifacts && runnerType === 'direct_llm' ? (
          <div className={styles.refinementPanel} data-testid="scene-draft-refinement-panel">
            <label className={styles.label} htmlFor="scene-refinement-prompt">
              一次性补充意见
            </label>
            <textarea
              id="scene-refinement-prompt"
              data-testid="scene-refinement-input"
              className={styles.refinementInput}
              rows={4}
              value={refinementPrompt}
              placeholder="例如：保留当前结构，但加强镜头语言与结尾情绪爆点。该意见只影响本次补充优化。"
              onChange={(event) => {
                if (!projectDir) return;
                upsertSession({
                  projectDir,
                  stage,
                  runnerType,
                  refinementPrompt: event.target.value,
                  status: pendingArtifacts ? 'ready' : 'idle',
                });
              }}
            />
            <div className={styles.refinementActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="scene-refine-draft-button"
                disabled={!canRefineDraft}
                onClick={() => void handleRefineDraft()}
              >
                {running ? '优化中…' : '补充优化'}
              </Button>
              <span className={styles.hint}>
                基于当前草案与本次补充意见整阶段重生一版新草案；不会写入长期状态。
              </span>
            </div>
          </div>
        ) : null}
      </div>
      {pendingArtifacts ? (
        <SceneRunDraftReview
          artifacts={pendingArtifacts}
          requiredKeys={pendingRequiredKeys}
          submitting={submitting || running}
          submitLabel={draftSubmitLabel}
          onSubmit={() => void handleSubmitDraft()}
          onDiscard={() => {
            if (!projectDir) return;
            clearPendingDraft(projectDir, stage, '已放弃本次生成草案。');
          }}
        />
      ) : null}
      {lastHint ? <p className={styles.successHint}>{lastHint}</p> : null}
      {errorLocal ? (
        <Alert variant="error" title="运行失败" description={errorLocal} className={styles.runAlert} />
      ) : null}
    </section>
  );
}
