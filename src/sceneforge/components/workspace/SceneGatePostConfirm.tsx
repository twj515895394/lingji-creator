import { Button } from '../../../ui/components/button';
import type { SceneGateHITLState } from '../../lib/scene-hitl-markdown';
import styles from './SceneGateConfirmPanel.module.css';

const DECISION_LABEL: Record<string, string> = {
  go: '继续制作',
  observe: '先观望',
  drop: '放弃选题',
};

export interface SceneGatePostConfirmProps {
  gateState: SceneGateHITLState;
  onEditAgain: () => void;
}

export function SceneGatePostConfirm({ gateState, onEditAgain }: SceneGatePostConfirmProps) {
  const styleLabel =
    gateState.styleOptions.find((o) => o.id === gateState.selectedStyleId)?.label ??
    gateState.selectedStyleId ??
    '—';
  const decisionLabel = gateState.decision ? DECISION_LABEL[gateState.decision] ?? gateState.decision : '—';

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
      </dl>
      <p className={styles.postHint}>请使用下方 <strong>Validate</strong> 与 <strong>Continue</strong> 完成本阶段并进入下一阶段。</p>
      <Button type="button" variant="ghost" size="sm" className={styles.confirmButton} onClick={onEditAgain}>
        修改风格与决策
      </Button>
    </div>
  );
}