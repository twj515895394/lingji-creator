import type { DesignSection } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface DesignPreviewProps {
  sections: DesignSection[];
}

export function DesignPreview({ sections }: DesignPreviewProps) {
  return (
    <div className={styles.strategyList} data-testid="remix-design-preview">
      {sections.map((section) => (
        <article key={section.id} className={styles.strategyCard}>
          <div className={styles.strategyTitle}>{section.title}</div>
          <div className={styles.strategyText}>{section.body}</div>
        </article>
      ))}
    </div>
  );
}
