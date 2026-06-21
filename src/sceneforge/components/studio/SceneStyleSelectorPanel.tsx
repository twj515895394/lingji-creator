import type { SceneStageContext } from '../../../lib/electron-api';
import styles from '../../pages/SceneForgeStudio.module.css';

interface SceneStyleSelectorPanelProps {
  assetLibrary: SceneStageContext['assetLibrary'];
}

function getAssetTypeLabel(type: string | undefined): string {
  if (type === 'style_profile') {
    return '风格设定';
  }
  if (type === 'methodology') {
    return '参考方法';
  }
  return '参考资产';
}

export function SceneStyleSelectorPanel({ assetLibrary }: SceneStyleSelectorPanelProps) {
  if (!assetLibrary || assetLibrary.snippets.length === 0) {
    return null;
  }

  return (
    <section className={styles.styleSelectorPanel} aria-label="跨阶段参考资产" data-testid="scene-style-selector">
      <div className={styles.styleSelectorHeader}>
        <div>
          <h3>跨阶段参考资产</h3>
          <p>这里只展示当前阶段实际会注入的项目级参考配置，不再混入上游阶段产物依赖。</p>
        </div>
        <span className={styles.styleSelectorStatus}>当前阶段生效</span>
      </div>

      <div className={styles.assetSummaryList}>
        {assetLibrary.snippets.map((asset) => (
          <article key={asset.id} className={styles.assetSummaryCard}>
            <div className={styles.assetSummaryHeader}>
              <div>
                <strong>{asset.title}</strong>
                <span>{asset.id}</span>
              </div>
              <em>{getAssetTypeLabel(asset.type)}</em>
            </div>
            <p className={styles.assetSummaryPreview}>{asset.text.trim() || '当前资产没有可展示的摘要。'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
