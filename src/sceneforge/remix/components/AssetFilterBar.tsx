import { Button } from '../../../ui';
import type { RemixAssetLibrarySection } from '../types';
import styles from './AssetLibrary.module.css';

export type AssetLibraryStatusFilter = RemixAssetLibrarySection;

const STATUS_FILTERS: ReadonlyArray<{ value: AssetLibraryStatusFilter; label: string }> = [
  { value: 'published', label: '已入库资产' },
  { value: 'processing', label: '处理中' },
  { value: 'failed', label: '异常' },
];

interface AssetFilterBarProps {
  activeStatus: AssetLibraryStatusFilter;
  activeTag: string | null;
  availableTags: string[];
  onStatusChange: (status: AssetLibraryStatusFilter) => void;
  onTagChange: (tag: string | null) => void;
}

export function AssetFilterBar({
  activeStatus,
  activeTag,
  availableTags,
  onStatusChange,
  onTagChange,
}: AssetFilterBarProps) {
  return (
    <div className={styles.filterSection} data-testid="remix-asset-filter-bar">
      <div className={styles.filterGroup}>
        <div className={styles.filterLabel}>状态筛选</div>
        <div className={styles.filterPills}>
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={activeStatus === filter.value ? 'accent' : 'ghost'}
              className={styles.filterButton}
              onClick={() => onStatusChange(filter.value)}
              data-testid={`remix-status-filter-${filter.value}`}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <div className={styles.filterLabel}>标签筛选</div>
        <div className={styles.filterPills}>
          <Button
            variant={activeTag === null ? 'accent' : 'ghost'}
            className={styles.filterButton}
            onClick={() => onTagChange(null)}
            data-testid="remix-tag-filter-all"
          >
            全部标签
          </Button>
          {availableTags.map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? 'accent' : 'ghost'}
              className={styles.filterButton}
              onClick={() => onTagChange(tag)}
              data-testid={`remix-tag-filter-${tag}`}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
