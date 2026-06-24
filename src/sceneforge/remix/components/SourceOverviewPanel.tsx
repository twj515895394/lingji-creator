import type { SourceAsset } from '../types';
import {
  buildSegmentAnalysisItems,
  buildSourceOverviewFocus,
  buildSourceOverviewSummary,
} from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface SourceOverviewPanelProps {
  asset: SourceAsset;
}

export function SourceOverviewPanel({ asset }: SourceOverviewPanelProps) {
  const summaryItems = buildSourceOverviewSummary(asset);
  const segmentItems = buildSegmentAnalysisItems(asset);
  const focusText = buildSourceOverviewFocus(asset);

  return (
    <div className={styles.markdownSurface} data-testid="remix-source-overview-panel">
      <section className={styles.overviewSummary}>
        <div className={styles.overviewLead}>
          <div className={styles.overviewLeadLabel}>原片判断</div>
          <div className={styles.overviewLeadText}>{focusText}</div>
        </div>
        <div className={styles.overviewSummaryGrid}>
          {summaryItems.map((item) => (
            <div key={item.label} className={styles.overviewSummaryCard}>
              <div className={styles.overviewSummaryLabel}>{item.label}</div>
              <div className={styles.overviewSummaryValue}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.segmentAnalysisList}>
        {segmentItems.map((item) => (
          <article key={item.id} className={styles.segmentAnalysisCard}>
            <div className={styles.segmentAnalysisHeader}>
              <div className={styles.segmentAnalysisTitle}>{item.title}</div>
              <div className={styles.segmentAnalysisMeta}>{item.timeRange}</div>
            </div>
            <div className={styles.segmentAnalysisFacts}>
              <span className={styles.segmentAnalysisFact}>边界：{item.boundaryLabel}</span>
              <span className={styles.segmentAnalysisFact}>关键帧：{item.keyframeSummary}</span>
            </div>
            <div className={styles.segmentAnalysisNote}>{item.note}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
