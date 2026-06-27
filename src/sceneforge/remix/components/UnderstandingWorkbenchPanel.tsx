import { Button } from '../../../ui';
import type { RemixUnderstandingWorkbenchSnapshot } from '../../../../electron/sceneforge/remix/remix-understanding-workbench';
import styles from './RemixWorkspacePanels.module.css';

interface UnderstandingWorkbenchPanelProps {
  workbench: RemixUnderstandingWorkbenchSnapshot | null;
  loading?: boolean;
  copiedSegmentId: string | null;
  pendingSegmentId: string | null;
  disabled?: boolean;
  onCopyPrompt: (segmentId: string, text: string) => void;
  onRerunSegment: (segmentId: string) => void;
}

export function UnderstandingWorkbenchPanel({
  workbench,
  loading = false,
  copiedSegmentId,
  pendingSegmentId,
  disabled = false,
  onCopyPrompt,
  onRerunSegment,
}: UnderstandingWorkbenchPanelProps) {
  if (loading) {
    return <p className={styles.copyFeedback}>正在加载理解结果…</p>;
  }
  if (!workbench) {
    return (
      <p className={styles.copyFeedback}>
        尚未生成真实片段理解。点击「生成原片理解」后，这里会展示每段剧情、镜头与 video prompt。
      </p>
    );
  }
  if (workbench.isPlaceholder) {
    return (
      <div className={styles.stack} data-testid="remix-understanding-workbench-placeholder">
        <p className={styles.copyFeedback}>
          当前仍是占位或未完成理解（{workbench.understoodSegmentCount}/{workbench.segmentCount} 段）。
          {workbench.errors[0] ? ` ${workbench.errors[0]}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.stack} data-testid="remix-understanding-workbench">
      <section className={styles.overviewSummary}>
        <div className={styles.overviewLead}>
          <div className={styles.overviewLeadLabel}>全片摘要</div>
          <div className={styles.overviewLeadText}>{workbench.overviewSummary}</div>
        </div>
        <div className={styles.overviewSummaryGrid}>
          <div className={styles.overviewSummaryCard}>
            <div className={styles.overviewSummaryLabel}>剧情线</div>
            <div className={styles.overviewSummaryValue}>{workbench.storyArc}</div>
          </div>
          <div className={styles.overviewSummaryCard}>
            <div className={styles.overviewSummaryLabel}>情绪曲线</div>
            <div className={styles.overviewSummaryValue}>{workbench.emotionCurve}</div>
          </div>
          <div className={styles.overviewSummaryCard}>
            <div className={styles.overviewSummaryLabel}>已完成段数</div>
            <div className={styles.overviewSummaryValue}>
              {workbench.understoodSegmentCount}/{workbench.segmentCount}
            </div>
          </div>
        </div>
        {workbench.remixPotential.length > 0 ? (
          <p className={styles.copyFeedback}>二创方向：{workbench.remixPotential.join(' / ')}</p>
        ) : null}
      </section>

      <section className={styles.segmentAnalysisList}>
        {workbench.segments.map((segment) => (
          <article key={segment.segmentId} className={styles.segmentAnalysisCard} data-testid={`remix-understanding-card-${segment.segmentId}`}>
            <div className={styles.segmentAnalysisHeader}>
              <div className={styles.segmentAnalysisTitle}>
                {String(segment.segmentIndex).padStart(2, '0')} · {segment.title}
              </div>
              <div className={styles.segmentAnalysisMeta}>{segment.timeRangeLabel}</div>
            </div>
            <div className={styles.segmentAnalysisFacts}>
              <span className={styles.segmentAnalysisFact}>动作：{segment.mainAction}</span>
              <span className={styles.segmentAnalysisFact}>镜头：{segment.shotSummary}</span>
              <span className={styles.segmentAnalysisFact}>台词：{segment.transcriptSummary}</span>
            </div>
            <div className={styles.segmentAnalysisNote}>剧情功能：{segment.plotFunction}</div>
            <div className={styles.segmentAnalysisNote}>正向 prompt：{segment.positivePrompt}</div>
            <div className={styles.copyRow}>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || !segment.positivePrompt}
                onClick={() => onCopyPrompt(segment.segmentId, segment.positivePrompt)}
              >
                复制 video prompt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled || pendingSegmentId === segment.segmentId}
                onClick={() => onRerunSegment(segment.segmentId)}
              >
                {pendingSegmentId === segment.segmentId ? '重跑中…' : '重跑本段'}
              </Button>
              {copiedSegmentId === segment.segmentId ? (
                <span className={styles.copyFeedback}>已复制</span>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
