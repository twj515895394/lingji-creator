import { useState } from 'react';
import { Play } from 'lucide-react';
import type { SceneStageId } from '../../../types/sceneforge';
import type { SceneRunStageInput, SceneStageRunnerResult } from '../../../lib/electron-api';
import { useTaskProgressStore } from '../../../store/task-progress';
import styles from './StageRunPanel.module.css';

export type SceneStageRunnerType = SceneRunStageInput['runnerType'];

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
    hint: 'Agent 会话简报或外部 MCP 提交',
  },
];

export interface StageRunPanelProps {
  projectDir: string | null;
  stage: SceneStageId;
  stageTitle: string;
  disabled?: boolean;
  onRunComplete?: (result: SceneStageRunnerResult) => void;
  onRunError?: (message: string) => void;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (error instanceof Error) return error.message;
  return '阶段运行失败。';
}

export function StageRunPanel({
  projectDir,
  stage,
  stageTitle,
  disabled = false,
  onRunComplete,
  onRunError,
}: StageRunPanelProps) {
  const [runnerType, setRunnerType] = useState<SceneStageRunnerType>('manual_submit');
  const [running, setRunning] = useState(false);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const canRun = Boolean(projectDir && window.electronAPI?.sceneRunStage) && !disabled && !running;

  const handleRun = async () => {
    if (!projectDir || !window.electronAPI?.sceneRunStage) {
      const msg = '请先打开 SceneForge 项目目录。';
      setErrorLocal(msg);
      onRunError?.(msg);
      return;
    }

    const taskId = `scene-run-${stage}-${Date.now()}`;
    const taskStore = useTaskProgressStore.getState();
    taskStore.startTask({
      id: taskId,
      category: 'ai-write',
      label: `SceneForge · ${stageTitle}`,
      mode: 'indeterminate',
      progress: 0,
      phase: '运行阶段',
      level: 2,
      canCancel: false,
    });

    setRunning(true);
    setLastHint(null);
    setErrorLocal(null);

    try {
      taskStore.updateTask(taskId, {
        phase: runnerType === 'direct_llm' ? '调用 LLM' : '执行 Runner',
      });
      const result = await window.electronAPI.sceneRunStage({
        projectDir,
        stage,
        runnerType,
      });

      const keys = Object.keys(result.artifacts).filter((k) => !k.startsWith('__'));
      const summary =
        keys.length > 0
          ? `已生成 ${keys.length} 个草案字段，请校验后提交。`
          : result.artifacts.__acp_session_brief
            ? 'ACP 简报已生成，请按 Agent 说明通过 MCP 提交。'
            : '运行完成，无草案内容。';

      setLastHint(summary);
      taskStore.completeTask(taskId);
      onRunComplete?.(result);
    } catch (error) {
      const message = extractErrorMessage(error);
      setErrorLocal(message);
      taskStore.failTask(taskId, message);
      onRunError?.(message);
    } finally {
      setRunning(false);
    }
  };

  const selectedHint = RUNNER_OPTIONS.find((o) => o.value === runnerType)?.hint ?? '';

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
          {RUNNER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.hint}>{selectedHint}</p>
        <button
          type="button"
          className={styles.runButton}
          data-testid="scene-run-stage-button"
          disabled={!canRun}
          title={!projectDir ? '需要已打开的 SceneForge 项目' : undefined}
          onClick={() => void handleRun()}
        >
          <Play size={14} aria-hidden />
          {running ? '运行中…' : '运行本阶段'}
        </button>
      </div>
      {lastHint ? <p className={styles.successHint}>{lastHint}</p> : null}
      {errorLocal ? <p className={styles.errorHint}>{errorLocal}</p> : null}
    </section>
  );
}