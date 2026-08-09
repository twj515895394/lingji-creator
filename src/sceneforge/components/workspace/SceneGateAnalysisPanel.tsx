import { useEffect, useMemo } from 'react';
import { Alert, Button } from '../../../ui';
import {
  parseTopicAnalysisFromMarkdown,
  type SceneTopicAnalysisState,
} from '../../lib/scene-hitl-markdown';
import {
  getSceneStageRunSessionKey,
  useSceneStageRunSessionStore,
} from '../../store/scene-stage-run-session';
import { SceneGateScoreCards } from './SceneGateScoreCards';
import styles from './SceneGateAnalysisPanel.module.css';

export interface SceneGateAnalysisPanelProps {
  projectDir: string | null;
  topicBriefMarkdown: string;
  intentCheckStatus?: 'pass' | 'needs_more' | 'unknown';
  intentCheckStale?: boolean;
  initialAnalysisMarkdown?: string;
  busy?: boolean;
  onAnalyzed?: () => void;
  onError?: (message: string) => void;
}

function decisionLabel(value: SceneTopicAnalysisState['decisionSuggestion']): string {
  if (value === 'go') return '建议继续制作';
  if (value === 'observe') return '建议先观望';
  if (value === 'drop') return '建议放弃选题';
  return '—';
}

export function SceneGateAnalysisPanel({
  projectDir,
  topicBriefMarkdown,
  intentCheckStatus = 'unknown',
  intentCheckStale = false,
  initialAnalysisMarkdown = '',
  busy = false,
  onAnalyzed,
  onError,
}: SceneGateAnalysisPanelProps) {
  const sessionKey = projectDir ? getSceneStageRunSessionKey(projectDir, 'topic_gate') : null;
  const session = useSceneStageRunSessionStore((state) =>
    sessionKey ? state.sessions.get(sessionKey) ?? null : null,
  );
  const upsertSession = useSceneStageRunSessionStore((state) => state.upsertSession);
  const rehydrateFromStorage = useSceneStageRunSessionStore((state) => state.rehydrateFromStorage);

  useEffect(() => {
    rehydrateFromStorage();
  }, [rehydrateFromStorage]);

  const analysisMarkdown =
    session?.pendingArtifacts?.topic_analysis ??
    initialAnalysisMarkdown;
  const analysis = useMemo(
    () => parseTopicAnalysisFromMarkdown(analysisMarkdown),
    [analysisMarkdown],
  );
  const hasAnalysis =
    Boolean(analysis.summary) ||
    analysis.scoreState.items.length > 0 ||
    analysis.styleCandidates.length > 0;
  const isRunning = busy || session?.status === 'running';
  const analysisLockedReason = !topicBriefMarkdown.trim()
    ? '请先确认并保存选题简报。'
    : intentCheckStale
      ? '你刚修改了选题描述，请先重新确认。'
      : intentCheckStatus !== 'pass'
        ? '请先确认选题描述，通过后再保存并分析。'
        : null;

  const handleAnalyze = async () => {
    if (!projectDir || !window.electronAPI?.sceneAnalyzeTopicGate) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    if (!topicBriefMarkdown.trim()) {
      onError?.('请先保存选题简报，再分析选题。');
      return;
    }
    upsertSession({
      projectDir,
      stage: 'topic_gate',
      runnerType: 'direct_llm',
      status: 'running',
      lastHint: '正在分析选题，请稍候。',
      error: null,
    });
    try {
      const result = await window.electronAPI.sceneAnalyzeTopicGate({ projectDir });
      upsertSession({
        projectDir,
        stage: 'topic_gate',
        runnerType: 'direct_llm',
        status: 'ready',
        pendingArtifacts: { topic_analysis: result.content },
        pendingRequiredKeys: ['topic_analysis'],
        lastHint: '选题分析已生成，请确认建议后继续。',
        error: null,
      });
      onAnalyzed?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '选题分析失败。';
      upsertSession({
        projectDir,
        stage: 'topic_gate',
        runnerType: 'direct_llm',
        status: 'error',
        lastHint: null,
        error: message,
      });
      onError?.(message);
    }
  };

  return (
    <section className={styles.root} data-testid="scene-gate-analysis-panel">
      {!hasAnalysis ? (
        <>
          <p className={styles.lead}>
            {analysisLockedReason ?? '确认选题描述通过后，再生成评分、决策建议和风格候选。'}
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={styles.primaryButton}
              disabled={!projectDir || isRunning || analysisLockedReason !== null}
              onClick={() => void handleAnalyze()}
            >
              {isRunning ? '分析中…' : '分析选题'}
            </Button>
          </div>
          {analysisLockedReason ? (
            <p className={styles.hint}>{analysisLockedReason}</p>
          ) : null}
          {isRunning ? (
            <div className={styles.inlineBusyCard} aria-live="polite">
              <span className={styles.inlineBusyDot} aria-hidden="true" />
              <div>
                <strong>正在分析选题</strong>
                <p>当前阶段已进入执行中，本区会在结果返回后自动刷新。</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className={styles.header}>
            <div>
              <h4>选题分析</h4>
              <p>以下内容是模型给出的辅助建议，最终是否继续和采用何种风格，仍由你在下方确认。</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.primaryButton}
              disabled={!projectDir || isRunning || analysisLockedReason !== null}
              onClick={() => void handleAnalyze()}
            >
              {isRunning ? '分析中…' : '重新分析'}
            </Button>
          </div>
          {analysisLockedReason ? <p className={styles.hint}>{analysisLockedReason}</p> : null}

          {analysis.summary ? <p className={styles.summary}>{analysis.summary}</p> : null}

          <div className={styles.recommendationGrid}>
            <div className={styles.recommendationCard}>
              <span>总分</span>
              <strong>{analysis.totalScore ?? '—'}</strong>
            </div>
            <div className={styles.recommendationCard}>
              <span>建议决策</span>
              <strong>{decisionLabel(analysis.decisionSuggestion)}</strong>
            </div>
            <div className={styles.recommendationCard}>
              <span>建议制作档位</span>
              <strong>{analysis.productionLevelSuggestion ?? '—'}</strong>
            </div>
          </div>

          {analysis.scoreState.items.length > 0 ? (
            <div className={styles.block}>
              <h5>评分维度</h5>
              <SceneGateScoreCards scoreState={analysis.scoreState} />
            </div>
          ) : null}

          {analysis.styleCandidates.length > 0 ? (
            <div className={styles.block}>
              <h5>推荐风格候选</h5>
              <ul className={styles.styleList}>
                {analysis.styleCandidates.map((candidate) => (
                  <li key={candidate.id} className={styles.styleCard}>
                    <span className={styles.styleLabel}>{candidate.label}</span>
                    {candidate.family ? <span className={styles.styleFamily}>{candidate.family}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {session?.lastHint ? (
        <Alert variant="info" title="状态提示" description={session.lastHint} className={styles.feedback} />
      ) : null}
      {session?.error ? (
        <Alert variant="error" title="分析失败" description={session.error} className={styles.feedback} />
      ) : null}
    </section>
  );
}
