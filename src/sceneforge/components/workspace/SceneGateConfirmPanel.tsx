import { useCallback, useState } from 'react';
import { Button } from '../../../ui/components/button';
import {
  buildGateConfirmationsMarkdown,
  type SceneGateHITLState,
} from '../../lib/scene-hitl-markdown';
import { parseTopicBriefForm } from '../../lib/topic-gate-form';
import styles from './SceneGateConfirmPanel.module.css';

import { SceneGatePostConfirm } from './SceneGatePostConfirm';

export interface SceneGateConfirmPanelProps {
  projectDir: string | null;
  gateState: SceneGateHITLState;
  topicBriefMarkdown?: string;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
}

const DECISIONS: Array<{ value: 'go' | 'observe' | 'drop'; label: string; hint: string }> = [
  { value: 'go', label: '继续制作', hint: '认可这个选题，按流水线往下做（设定、分镜、视频提示词等）。' },
  { value: 'observe', label: '先观望', hint: '选题先留着，暂不往下推进；项目可保存，侧栏仍可查看。' },
  { value: 'drop', label: '放弃选题', hint: '不再投入这个方向；仍会记录你的选择，便于以后查阅。' },
];

export function SceneGateConfirmPanel({
  projectDir,
  gateState,
  topicBriefMarkdown = '',
  onSubmitted,
  onError,
}: SceneGateConfirmPanelProps) {
  const [decision, setDecision] = useState<'go' | 'observe' | 'drop'>(gateState.decision ?? 'go');
  const [styleId, setStyleId] = useState(
    gateState.selectedStyleId ?? gateState.styleOptions[0]?.id ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const showSummary = gateState.styleConfirmed && !editing;

  const handleConfirm = useCallback(async () => {
    const style = gateState.styleOptions.find((o) => o.id === styleId);
    if (!style) {
      onError?.('请选择导演/风格包。');
      return;
    }
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    setBusy(true);
    try {
      const duration = parseTopicBriefForm(topicBriefMarkdown);
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage: 'topic_gate',
        artifacts: [
          {
            artifactKey: 'gate_confirmations',
            content: buildGateConfirmationsMarkdown({
              decision,
              styleId: style.id,
              styleLabel: style.label,
              styleFamily: style.family,
              totalDurationSec: duration.totalDurationSec,
              segmentDurationSec: duration.segmentDurationSec,
            }),
          },
        ],
      });
      if (result.validation.status === 'failed') {
        onError?.(result.validation.errors[0]?.message ?? '确认提交校验失败');
      } else {
        setEditing(false);
        onSubmitted?.();
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }, [decision, gateState.styleOptions, onSubmitted, onError, projectDir, styleId, topicBriefMarkdown]);

  if (showSummary) {
    return (
      <SceneGatePostConfirm gateState={gateState} onEditAgain={() => setEditing(true)} />
    );
  }

  return (
    <div className={styles.root} data-testid="scene-gate-confirm-panel">
      <p className={styles.lead}>
        确认你对选题的态度与画面风格。完成后侧栏后续阶段不再显示阻塞提示。
      </p>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>你对这个选题的态度</legend>
        <div className={styles.decisionRow}>
          {DECISIONS.map((d) => (
            <label
              key={d.value}
              className={`${styles.decisionChip} ${decision === d.value ? styles.decisionChipActive : ''}`}
            >
              <input
                type="radio"
                className={styles.srOnly}
                name="gate-decision"
                value={d.value}
                checked={decision === d.value}
                onChange={() => setDecision(d.value)}
              />
              <span className={styles.decisionLabel}>{d.label}</span>
            </label>
          ))}
        </div>
        <p className={styles.decisionHint}>{DECISIONS.find((d) => d.value === decision)?.hint}</p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>导演 / 画面风格（必选一项）</legend>
        <ul className={styles.styleList}>
          {gateState.styleOptions.map((opt) => (
            <li key={opt.id}>
              <label
                className={`${styles.styleCard} ${styleId === opt.id ? styles.styleCardActive : ''}`}
              >
                <input
                  type="radio"
                  className={styles.srOnly}
                  name="gate-style"
                  value={opt.id}
                  checked={styleId === opt.id}
                  onChange={() => setStyleId(opt.id)}
                />
                <span className={styles.styleLabel}>{opt.label}</span>
                {opt.family ? <span className={styles.styleFamily}>{opt.family}</span> : null}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className={styles.confirmActions}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={styles.confirmButton}
          disabled={busy || !projectDir}
          onClick={() => void handleConfirm()}
        >
          {busy ? '提交中…' : '确认风格并继续'}
        </Button>
      </div>
    </div>
  );
}