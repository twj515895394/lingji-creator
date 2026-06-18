import { Alert, Button } from '../../../ui';
import styles from './SceneRunDraftReview.module.css';

export interface SceneRunDraftReviewProps {
  artifacts: Record<string, string>;
  requiredKeys: string[];
  submitting: boolean;
  onSubmit: () => void;
  onDiscard: () => void;
}

export function SceneRunDraftReview({
  artifacts,
  requiredKeys,
  submitting,
  onSubmit,
  onDiscard,
}: SceneRunDraftReviewProps) {
  const missingKeys = requiredKeys.filter((key) => !artifacts[key]?.trim());
  const complete = requiredKeys.length > 0 && missingKeys.length === 0;

  return (
    <section className={styles.review} aria-label="生成草案审核">
      <div className={styles.header}>
        <div>
          <h4>生成草案</h4>
          <p>提交前逐项检查，本区内容尚未写入产物库。</p>
        </div>
        <span>{requiredKeys.length} 项</span>
      </div>

      {missingKeys.length > 0 ? (
        <Alert
          variant="error"
          title="草案不完整"
          description={`缺少或为空：${missingKeys.join('、')}`}
        />
      ) : null}

      <div className={styles.items}>
        {requiredKeys.map((key) => {
          const content = artifacts[key] ?? '';
          return (
            <details className={styles.item} key={key}>
              <summary>
                <code>{key}</code>
                <span>{content.length} 字符</span>
              </summary>
              <pre>{content || '（无内容）'}</pre>
            </details>
          );
        })}
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={onDiscard}>
          放弃草案
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          data-testid="scene-submit-run-draft-button"
          disabled={!complete || submitting}
          onClick={onSubmit}
        >
          {submitting ? '提交中…' : `提交 ${requiredKeys.length} 个草案到产物库`}
        </Button>
      </div>
    </section>
  );
}
