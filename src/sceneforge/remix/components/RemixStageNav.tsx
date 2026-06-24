import { getRemixStageNavItems, type RemixNavScope } from '../lib/remix-stage-nav';
import styles from './RemixStageNav.module.css';

interface RemixStageNavProps {
  scope: RemixNavScope;
  activeItemId?: string | null;
  stageStatuses?: Partial<Record<string, string>>;
  onSelectItem?: (itemId: string) => void;
}

export function RemixStageNav({
  scope,
  activeItemId = null,
  stageStatuses = {},
  onSelectItem,
}: RemixStageNavProps) {
  const items = getRemixStageNavItems(scope);
  const isProcessing = scope === 'asset-processing';

  return (
    <aside
      className={styles.root}
      data-testid={`remix-stage-nav-${scope}`}
      data-remix-stage-scope={scope}
    >
      <div className={styles.header}>
        <div className={styles.eyebrow}>
          {isProcessing ? '素材处理工作台' : '二创创作工作台'}
        </div>
        <div className={styles.title}>
          {isProcessing ? '资产处理流程' : '二创创作流程'}
        </div>
        <div className={styles.description}>
          {isProcessing
            ? '先把原片拆解成可复用资产，再决定它能否进入二创库。'
            : '所有创作动作都围绕已入库素材展开，不回写原片本体。'}
        </div>
      </div>

      <ol className={styles.list}>
        {items.map((item) => {
          const active = activeItemId === item.id;
          const status = stageStatuses[item.id] ?? null;
          return (
            <li
              key={item.id}
              className={[styles.item, active ? styles.itemActive : ''].filter(Boolean).join(' ')}
              data-remix-stage-id={item.id}
              data-remix-active={active ? 'true' : 'false'}
            >
              <button
                type="button"
                className={styles.itemButton}
                onClick={() => onSelectItem?.(item.id)}
              >
                <span className={styles.index}>{String(item.index).padStart(2, '0')}</span>
                <div className={styles.content}>
                  <div className={styles.itemTopline}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    {status ? <span className={styles.statusChip}>{status}</span> : null}
                  </div>
                  <div className={styles.itemCaption}>{item.caption}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
