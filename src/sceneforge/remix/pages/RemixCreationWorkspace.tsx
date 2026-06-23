import { Badge, Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import { RemixStageNav } from '../components/RemixStageNav';
import { REMIX_ROUTE_PATTERNS } from '../types';
import styles from './RemixWorkspaceShell.module.css';

interface RemixCreationWorkspaceProps {
  variantId: string;
  onBackToLibrary?: () => void;
}

export function RemixCreationWorkspace({
  variantId,
  onBackToLibrary,
}: RemixCreationWorkspaceProps) {
  return (
    <div
      className={styles.shell}
      data-testid="remix-creation-workspace-page"
      data-remix-route={REMIX_ROUTE_PATTERNS.creationWorkspace}
    >
      <section className={[styles.panel, styles.rail].join(' ')}>
        <div className={styles.panelContent}>
          <RemixStageNav scope="creation" activeItemId="design" />
        </div>
      </section>

      <main className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.heroBlock}>
            <div className={styles.eyebrow}>Remix Creation Workspace</div>
            <div className={styles.title}>围绕已入库资产做二创，不回写原片本体</div>
            <div className={styles.description}>
              当前 Variant 是 <strong>{variantId}</strong>。这里专注于改编策略、Remix Design、改图提示词、
              改后关键帧验收和 Seedance 2.0 提示词，不再出现导入、切片或原片理解步骤。
            </div>
            <div className={styles.actionRow}>
              <Button variant="outline" onClick={onBackToLibrary} data-testid="remix-creation-back">
                返回资产库
              </Button>
              <Button variant="primary" data-testid="remix-creation-export">
                预览提示词包
              </Button>
            </div>
          </div>

          <div className={styles.metricRow}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Reference Strength</div>
              <div className={styles.metricValue}>Strong</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Generation Mode</div>
              <div className={styles.metricValue}>Hybrid</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Seedance Ready</div>
              <div className={styles.metricValue}>2 / 8</div>
            </div>
          </div>

          <div className={styles.sectionGrid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>改编策略与 Segment Adaptations</div>
              <div className={styles.cardText}>
                这里会展示全局策略、逐段 keep / change / risk notes，以及 retentionMatrix 如何影响改编。
              </div>
              <div className={styles.placeholderSurface} data-testid="remix-strategy-placeholder" />
            </section>
            <section className={styles.card}>
              <div className={styles.cardTitle}>关键帧改图提示词与 Seedance 提示词</div>
              <div className={styles.cardText}>
                这里会承接逐帧 prompt、source frame 预览、改后关键帧状态，以及最终的 Seedance 2.0 copy-ready 输出。
              </div>
              <div className={styles.placeholderSurface} data-testid="remix-prompt-placeholder" />
            </section>
          </div>
        </div>
      </main>

      <aside className={styles.panel}>
        <div className={styles.panelContent}>
          <PanelHeader
            eyebrow="Inspector"
            title="创作摘要与检查器"
            description="给当前 Variant 一个稳定的摘要面，方便后续补 IPC 数据。"
            meta={<Badge variant="info">Variant Live</Badge>}
          />
          <div className={styles.summaryList} data-testid="remix-creation-inspector">
            <div className={styles.summaryRow}>
              <span>Source Asset</span>
              <strong>source-001</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Variant</span>
              <strong>{variantId}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>当前阶段</span>
              <strong>Remix Design</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>不应出现</span>
              <strong>导入 / 切片 / 原片理解</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
