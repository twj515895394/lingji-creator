import type { SegmentStrategyItem } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface StrategyPreviewProps {
  items: SegmentStrategyItem[];
}

export function StrategyPreview({ items }: StrategyPreviewProps) {
  return (
    <div className={styles.strategyList} data-testid="remix-strategy-preview">
      {items.map((item) => (
        <article key={item.segmentId} className={styles.strategyCard}>
          <div className={styles.strategyTitle}>{item.title}</div>
          <div className={styles.strategyColumns}>
            <div className={styles.strategyColumn}>
              <div className={styles.strategyColumnLabel}>保留</div>
              <div className={styles.strategyText}>{item.keep}</div>
            </div>
            <div className={styles.strategyColumn}>
              <div className={styles.strategyColumnLabel}>改写</div>
              <div className={styles.strategyText}>{item.change}</div>
            </div>
            <div className={styles.strategyColumn}>
              <div className={styles.strategyColumnLabel}>风险</div>
              <div className={styles.strategyText}>{item.risk}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
