import { Badge, Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import { REMIX_ROUTE_PATTERNS } from '../types';
import styles from './RemixWorkspaceShell.module.css';

interface RemixAssetLibraryProps {
  selectedSourceAssetId?: string | null;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onOpenDetails?: (sourceAssetId: string) => void;
  onOpenCreation?: (sourceAssetId: string) => void;
}

const FILTERS = ['全部资产', '处理中', '待确认', '已入库', '解析失败', '最近使用', '有二创版本'];

export function RemixAssetLibrary({
  selectedSourceAssetId = null,
  onOpenProcessing,
  onOpenDetails,
  onOpenCreation,
}: RemixAssetLibraryProps) {
  const activeAssetId = selectedSourceAssetId ?? 'source-001';

  return (
    <div
      className={[styles.shell, styles.libraryShell].join(' ')}
      data-testid="remix-asset-library-page"
      data-remix-route={selectedSourceAssetId ? REMIX_ROUTE_PATTERNS.assetDetails : REMIX_ROUTE_PATTERNS.assetLibrary}
    >
      <section className={[styles.panel, styles.rail].join(' ')}>
        <div className={styles.panelContent}>
          <PanelHeader
            eyebrow="Remix Asset Library"
            title="原片资产库"
            description="先把可复用原片做成稳定 Source Asset，再从这里发起 Variant 创作。"
          />
          <div className={styles.filterList}>
            {FILTERS.map((filter, index) => (
              <Button
                key={filter}
                variant={index === 0 ? 'accent' : 'ghost'}
                className={styles.filterButton}
                data-testid={`remix-filter-${index + 1}`}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <main className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.heroBlock}>
            <div className={styles.eyebrow}>Asset First, Remix Later</div>
            <div className={styles.title}>资产先入库，创作再引用</div>
            <div className={styles.description}>
              这里先管理原片的切片、关键帧和分析状态。只有完成入库确认的 Source Asset，
              才允许进入 Remix Creation Workspace。
            </div>
            <div className={styles.actionRow}>
              <Button variant="primary" data-testid="remix-import-source-button">
                导入新原片
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenProcessing?.('source-001')}
                data-testid="remix-open-processing-button"
              >
                继续处理资产
              </Button>
            </div>
          </div>

          <div className={styles.assetGrid} data-testid="remix-asset-grid">
            {[
              { id: 'source-001', title: '买瓜原片', status: '已入库', segments: 12, keyframes: 28, variants: 3 },
              { id: 'source-002', title: '地铁对峙', status: '处理中', segments: 7, keyframes: 16, variants: 0 },
            ].map((asset) => (
              <article key={asset.id} className={styles.assetCard} data-testid={`remix-asset-card-${asset.id}`}>
                <div className={styles.assetPreview} />
                <div className={styles.cardTitle}>{asset.title}</div>
                <div className={styles.assetMeta}>
                  <Badge variant={asset.status === '已入库' ? 'success' : 'warning'}>{asset.status}</Badge>
                  <Badge variant="outline">{asset.segments} segments</Badge>
                  <Badge variant="outline">{asset.keyframes} keyframes</Badge>
                </div>
                <div className={styles.cardText}>
                  已派生 {asset.variants} 个 Variant，支持从资产库直接继续处理、查看详情或进入创作工作台。
                </div>
                <div className={styles.actionRow}>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenDetails?.(asset.id)}
                    data-testid={`remix-open-details-${asset.id}`}
                  >
                    查看资产详情
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenProcessing?.(asset.id)}
                    data-testid={`remix-open-processing-${asset.id}`}
                  >
                    继续处理
                  </Button>
                  <Button
                    variant="accent"
                    onClick={() => onOpenCreation?.(asset.id)}
                    data-testid={`remix-open-creation-${asset.id}`}
                  >
                    创建二创 Variant
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <aside className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.inspectorTitle}>
            {selectedSourceAssetId ? '资产详情视图' : '选中资产摘要'}
          </div>
          <div className={styles.inspectorText}>
            {selectedSourceAssetId
              ? `当前路由正在查看 ${selectedSourceAssetId} 的资产详情。这里会承接封面图、最近处理状态和快捷操作。`
              : '默认路由只展示资产库概览；点击卡片后，这里切成当前 Source Asset 的详情与快捷操作。'}
          </div>
          <div className={styles.summaryList} data-testid="remix-asset-library-inspector">
            <div className={styles.summaryRow}>
              <span>Source Asset</span>
              <strong>{activeAssetId}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>当前状态</span>
              <strong>{selectedSourceAssetId ? '详情查看中' : '等待选择'}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>下一动作</span>
              <strong>{selectedSourceAssetId ? '继续处理 / 创建 Variant' : '选择一张资产卡'}</strong>
            </div>
          </div>
          <div className={styles.placeholderSurface} />
        </div>
      </aside>
    </div>
  );
}
