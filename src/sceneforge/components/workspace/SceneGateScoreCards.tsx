import type { SceneGateScoreState } from '../../lib/scene-hitl-markdown';
import styles from './SceneGateScoreCards.module.css';

export interface SceneGateScoreCardsProps {
  scoreState: SceneGateScoreState;
}

export function SceneGateScoreCards({ scoreState }: SceneGateScoreCardsProps) {
  if (scoreState.items.length === 0) {
    return <p className={styles.empty}>当前简报没有评分数据。</p>;
  }

  return (
    <dl className={styles.grid} data-testid="scene-gate-score-cards">
      {scoreState.items.map((item, index) => (
        <div className={styles.card} key={`${item.label}-${index}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
