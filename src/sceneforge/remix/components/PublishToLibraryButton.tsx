import { Badge, Button } from '../../../ui';
import type { AssetMarkingSummary, PublishChecklistItem } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface PublishToLibraryButtonProps {
  items: PublishChecklistItem[];
  summary: AssetMarkingSummary;
  disabled: boolean;
  blockingReason?: string | null;
  isPublishing?: boolean;
  isPublished?: boolean;
  onPublish?: () => void;
  onBackToLibrary?: () => void;
}

export function PublishToLibraryButton({
  items,
  summary,
  disabled,
  blockingReason = null,
  isPublishing = false,
  isPublished = false,
  onPublish,
  onBackToLibrary,
}: PublishToLibraryButtonProps) {
  const failedItems = items.filter((item) => !item.passed);

  return (
    <div className={styles.stack} data-testid="remix-publish-source-panel">
      <div className={styles.publishSection}>
        <h3 className={styles.publishSectionTitle}>前置门禁</h3>
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
      </div>

      <div className={styles.publishSection} data-testid="remix-publish-marking-summary">
        <h3 className={styles.publishSectionTitle}>资产标记摘要</h3>
        <p className={styles.copyFeedback}>
          {summary.tagCount > 0
            ? `已保存 ${summary.tagCount} 个标签：${summary.tags.join('、')}`
            : '尚未保存资产标签。'}
        </p>
        <p className={styles.copyFeedback}>
          {summary.hasNote && summary.notePreview
            ? `资产备注：${summary.notePreview}${summary.notePreview.length >= 200 ? '…' : ''}`
            : '资产备注未填写（可选）。'}
        </p>
      </div>

      <p className={styles.copyFeedback}>
        保存入库后，将更新 source manifest 与资产状态，供资产库与后续二创版本读取。
      </p>

      {isPublished ? (
        <div className={styles.publishSection} data-testid="remix-publish-success-state">
          <div className={styles.copyRow}>
            <Badge variant="success">已入库</Badge>
            <span className={styles.copyFeedback}>这份素材已进入可复用资产库。</span>
          </div>
          <div className={styles.copyRow}>
            <Button variant="accent" onClick={onBackToLibrary}>
              返回资产库
            </Button>
          </div>
        </div>
      ) : null}

      {!isPublished && disabled && (blockingReason || failedItems.length > 0) ? (
        <p className={styles.publishBlockingHint} data-testid="remix-publish-blocking-hint">
          {blockingReason ?? `仍有 ${failedItems.length} 项前置条件未满足，无法保存入库。`}
        </p>
      ) : null}

      {!isPublished ? (
        <Button
          variant={disabled ? 'outline' : 'accent'}
          disabled={disabled}
          onClick={onPublish}
          data-testid="remix-processing-publish"
        >
          {disabled ? '前置步骤未完成' : isPublishing ? '保存中…' : '保存入库'}
        </Button>
      ) : null}
    </div>
  );
}
