import { Button } from '../../../ui';
import type { PublishChecklistItem } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface PublishToLibraryButtonProps {
  items: PublishChecklistItem[];
  disabled: boolean;
  isPublishing?: boolean;
  onPublish?: () => void;
}

export function PublishToLibraryButton({
  items,
  disabled,
  isPublishing = false,
  onPublish,
}: PublishToLibraryButtonProps) {
  return (
    <div className={styles.stack} data-testid="remix-publish-source-panel">
      <div className={styles.checklist}>
        {items.map((item) => (
          <div key={item.id} className={styles.checkItem}>
            <div className={styles.checkTopline}>
              <div className={styles.checkTitle}>{item.label}</div>
              <div className={styles.chip}>{item.passed ? '已满足' : '未满足'}</div>
            </div>
            <div className={styles.checkNote}>{item.note}</div>
          </div>
        ))}
      </div>
      <Button
        variant={disabled ? 'outline' : 'accent'}
        disabled={disabled}
        onClick={onPublish}
        data-testid="remix-processing-publish"
      >
        {disabled ? '前置步骤未完成' : isPublishing ? '保存中…' : '保存入库'}
      </Button>
    </div>
  );
}
