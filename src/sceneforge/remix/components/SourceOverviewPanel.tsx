import type { SourceAsset } from '../types';
import {
  buildSegmentAnalysisMarkdown,
  buildSourceOverviewMarkdown,
} from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface SourceOverviewPanelProps {
  asset: SourceAsset;
}

export function SourceOverviewPanel({ asset }: SourceOverviewPanelProps) {
  return (
    <div className={styles.markdownSurface} data-testid="remix-source-overview-panel">
      <section className={styles.markdownBlock}>
        <pre>{buildSourceOverviewMarkdown(asset)}</pre>
      </section>
      <section className={styles.markdownBlock}>
        <pre>{buildSegmentAnalysisMarkdown(asset)}</pre>
      </section>
    </div>
  );
}
