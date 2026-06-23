import { Badge, Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import { RemixStageNav } from '../components/RemixStageNav';
import { REMIX_ROUTE_PATTERNS } from '../types';
import styles from './RemixWorkspaceShell.module.css';

interface RemixAssetProcessingProps {
  sourceAssetId: string;
  onBackToLibrary?: () => void;
}

export function RemixAssetProcessing({
  sourceAssetId,
  onBackToLibrary,
}: RemixAssetProcessingProps) {
  return (
    <div
      className={styles.shell}
      data-testid="remix-asset-processing-page"
      data-remix-route={REMIX_ROUTE_PATTERNS.assetProcessing}
    >
      <section className={[styles.panel, styles.rail].join(' ')}>
        <div className={styles.panelContent}>
          <RemixStageNav scope="asset-processing" activeItemId="understanding" />
        </div>
      </section>

      <main className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.heroBlock}>
            <div className={styles.eyebrow}>Source Asset Processing Workspace</div>
            <div className={styles.title}>把原片拆成可复用资产，而不是直接开始二创</div>
            <div className={styles.description}>
              当前处理对象是 <strong>{sourceAssetId}</strong>。这一页只解决导入、切片、关键帧、
              原片理解和人工标注，不展示 Remix Design 或 Seedance 提示词。
            </div>
            <div className={styles.actionRow}>
              <Button variant="outline" onClick={onBackToLibrary} data-testid="remix-processing-back">
                返回资产库
              </Button>
              <Button variant="primary" data-testid="remix-processing-publish">
                保存入库
              </Button>
            </div>
          </div>

          <div className={styles.metricRow}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Segments</div>
              <div className={styles.metricValue}>12</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Keyframes</div>
              <div className={styles.metricValue}>28</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Review</div>
              <div className={styles.metricValue}>待确认</div>
            </div>
          </div>

          <div className={styles.sectionGrid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>原视频预览与切片轨道</div>
              <div className={styles.cardText}>
                这里会承接真实镜头边界、短镜头合并、长镜头安全切分和 `long_segment` 标记。
              </div>
              <div className={styles.placeholderSurface} data-testid="remix-segment-rail-placeholder" />
            </section>
            <section className={styles.card}>
              <div className={styles.cardTitle}>关键帧与原片理解</div>
              <div className={styles.cardText}>
                这里展示 first / last / middle frame，以及 source overview 与 segment analysis 占位。
              </div>
              <div className={styles.placeholderSurface} data-testid="remix-keyframe-placeholder" />
            </section>
          </div>
        </div>
      </main>

      <aside className={styles.panel}>
        <div className={styles.panelContent}>
          <PanelHeader
            eyebrow="Inspector"
            title="资产处理 Inspector"
            description="这一栏专门留给入库前的状态、备注和人工确认。"
            meta={<Badge variant="warning">待入库</Badge>}
          />
          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span>当前资产</span>
              <strong>{sourceAssetId}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>处理中阶段</span>
              <strong>原片理解</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>不应出现</span>
              <strong>改图提示词 / Seedance Prompt</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
