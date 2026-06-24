import { Button } from '../../../ui';
import type { PromptDisplayItem } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface KeyframePromptListProps {
  items: PromptDisplayItem[];
  selectedPromptId: string | null;
  copiedPromptId: string | null;
  onSelectPrompt: (promptId: string) => void;
  onCopyPrompt: (promptId: string) => void;
}

export function KeyframePromptList({
  items,
  selectedPromptId,
  copiedPromptId,
  onSelectPrompt,
  onCopyPrompt,
}: KeyframePromptListProps) {
  return (
    <div className={styles.promptList} data-testid="remix-keyframe-prompt-list">
      {items.map((item) => (
        <article
          key={item.id}
          className={[
            styles.promptCard,
            item.id === selectedPromptId ? styles.selectionCardActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            type="button"
            className={styles.selectionButtonReset}
            onClick={() => onSelectPrompt(item.id)}
          >
            <div className={styles.promptTitle}>{item.title}</div>
            <div className={styles.panelMeta}>{item.meta}</div>
            <div className={styles.promptText}>{item.body}</div>
          </button>
          <div className={styles.copyRow}>
            <Button variant="outline" size="sm" onClick={() => onCopyPrompt(item.id)}>
              复制提示词
            </Button>
            {copiedPromptId === item.id ? (
              <span className={styles.copyFeedback}>已复制</span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
