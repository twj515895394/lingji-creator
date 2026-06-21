import { Button } from '../../../ui/components/button';
import type { SceneGateHITLState } from '../../lib/scene-hitl-markdown';
import { parseTopicBriefForm } from '../../lib/topic-gate-form';
import styles from './SceneGateConfirmPanel.module.css';

const DECISION_LABEL: Record<string, string> = {
  go: '继续制作',
  observe: '先观望',
  drop: '放弃选题',
};

export interface SceneGatePostConfirmProps {
  gateState: SceneGateHITLState;
  topicBriefMarkdown: string;
  onEditAgain: () => void;
}

export function SceneGatePostConfirm({
  gateState,
  topicBriefMarkdown,
  onEditAgain,
}: SceneGatePostConfirmProps) {
  const styleLabel =
    gateState.styleOptions.find((o) => o.id === gateState.selectedStyleId)?.label ??
    gateState.selectedStyleId ??
    '—';
  const decisionLabel = gateState.decision ? DECISION_LABEL[gateState.decision] ?? gateState.decision : '—';
  const duration = parseTopicBriefForm(topicBriefMarkdown);

  return (
    <div className={styles.postConfirm} data-testid="scene-gate-post-confirm">
      <dl className={styles.summaryDl}>
        <div>
          <dt>决策</dt>
          <dd>{decisionLabel}</dd>
        </div>
        <div>
          <dt>画面风格</dt>
          <dd>{styleLabel}</dd>
        </div>
        <div>
          <dt>成片时长</dt>
          <dd>{duration.totalDurationSec ? `${duration.totalDurationSec} 秒` : '—'}</dd>
        </div>
        <div>
          <dt>单段时长</dt>
          <dd>{duration.segmentDurationSec} 秒</dd>
        </div>
      </dl>
      <p className={styles.postHint}>当前确认结果会作为下游阶段输入使用；如需调整，请先回到这里重新修改。</p>
      <Button type="button" variant="ghost" size="sm" className={styles.confirmButton} onClick={onEditAgain}>
        修改风格与决策
      </Button>
    </div>
  );
}
