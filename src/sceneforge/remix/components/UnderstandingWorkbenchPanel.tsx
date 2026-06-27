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
  onRerunRollup?: () => void;
}

export function UnderstandingWorkbenchPanel({
  workbench,
  loading = false,
  copiedSegmentId,
  pendingSegmentId,
  disabled = false,
  onCopyPrompt,
  onRerunSegment,
  onRerunRollup,
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
      {workbench.rollupFallbackUsed ? (
        <section
          className={styles.overviewSummary}
          style={{
            border: '1px solid var(--color-warning-border, #e0a800)',
            background: 'rgba(224, 168, 0, 0.05)',
            padding: '16px',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              color: 'var(--color-warning-text, #e0a800)',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span>全片故事未成功生成，当前显示的是系统兜底信息。请检查 LLM 配置后重跑全片故事。</span>
            {workbench.errors.length > 0 && (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>错误原因: {workbench.errors.join('; ')}</span>
            )}
            <div>
              <Button
                variant="accent"
                size="sm"
                disabled={disabled}
                onClick={onRerunRollup}
              >
                重跑全片故事
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.overviewSummary}>
          <div className={styles.overviewLead}>
            <div className={styles.overviewLeadLabel}>故事内容</div>
            <div className={styles.overviewLeadText}>{workbench.overviewSummary || '正在生成故事内容…'}</div>
          </div>
          {workbench.remixPotential.length > 0 ? (
            <p className={styles.copyFeedback} style={{ marginTop: '12px', fontSize: '13px' }}>
              二创方向：{workbench.remixPotential.join(' / ')}
            </p>
          ) : null}
        </section>
      )}

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
