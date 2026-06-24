import { Button } from '../../../ui';
import type { PublishChecklistItem } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface PublishChecklistProps {
  items: PublishChecklistItem[];
  canExport: boolean;
  isExporting?: boolean;
  onExportZip?: () => void;
  onExportDirectory?: () => void;
}

export function PublishChecklist({
  items,
  canExport,
  isExporting = false,
  onExportZip,
  onExportDirectory,
}: PublishChecklistProps) {
  return (
    <div className={styles.stack} data-testid="remix-publish-checklist">
      <div className={styles.checklist}>
        {items.map((item) => (
          <article key={item.id} className={styles.checkItem}>
            <div className={styles.checkTopline}>
              <div className={styles.checkTitle}>{item.label}</div>
              <div className={styles.chip}>{item.passed ? '完成' : '待补齐'}</div>
            </div>
            <div className={styles.checkNote}>{item.note}</div>
          </article>
        ))}
      </div>
      <div className={styles.copyRow}>
        <Button
          variant={canExport ? 'accent' : 'outline'}
          disabled={!canExport || isExporting}
          data-testid="remix-creation-export-zip"
          onClick={onExportZip}
        >
          {isExporting ? '导出中…' : '导出 ZIP'}
        </Button>
        <Button
          variant="outline"
          disabled={!canExport || isExporting}
          data-testid="remix-creation-export-directory"
          onClick={onExportDirectory}
        >
          {isExporting ? '导出中…' : '导出到文件夹'}
        </Button>
      </div>
    </div>
  );
}
