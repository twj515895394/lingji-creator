import type { SceneArtifactCopyBlock, SceneArtifactDisplayModel } from '../../../types/sceneforge';
import { Button } from '../../../ui/components/button';
import styles from './ArtifactCopyPanel.module.css';

export type SceneCopyFeedback = { blockId: string; status: 'success' | 'error' } | null;

interface ArtifactCopyPanelProps {
  displayModel: SceneArtifactDisplayModel | null;
  rawContent: string;
  feedback: SceneCopyFeedback;
  onCopyBlock: (block: SceneArtifactCopyBlock) => void | Promise<void>;
  onCopyRaw: () => void | Promise<void>;
}

function blocksForTarget(blocks: SceneArtifactCopyBlock[], target: SceneArtifactCopyBlock['target']) {
  return blocks.filter((b) => b.target === target && b.text.trim().length > 0);
}

export function ArtifactCopyPanel({
  displayModel,
  rawContent,
  feedback,
  onCopyBlock,
  onCopyRaw,
}: ArtifactCopyPanelProps) {
  if (!displayModel) {
    return (
      <div className={styles.panel}>
        <p className={styles.hint}>该产物暂无结构化复制块，请使用 Raw 视图复制全文。</p>
        {rawContent.trim() ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-testid="scene-copy-raw-fallback"
            onClick={() => void onCopyRaw()}
          >
            复制全文
          </Button>
        ) : null}
      </div>
    );
  }

  const fullBlocks = blocksForTarget(displayModel.copyBlocks, 'full');
  const sectionBlocks = blocksForTarget(displayModel.copyBlocks, 'section');
  const promptBlocks = blocksForTarget(displayModel.copyBlocks, 'prompt');

  const renderGroup = (title: string, blocks: SceneArtifactCopyBlock[]) => {
    if (blocks.length === 0) return null;
    return (
      <section className={styles.group} aria-label={title}>
        <h4 className={styles.groupTitle}>{title}</h4>
        <ul className={styles.blockList}>
          {blocks.map((block) => (
            <li key={block.id} className={styles.blockItem}>
              <div className={styles.blockHeader}>
                <span className={styles.blockLabel}>{block.label}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  data-testid="scene-copy-block"
                  data-copy-block-id={block.id}
                  onClick={() => void onCopyBlock(block)}
                >
                  复制
                </Button>
              </div>
              <pre className={styles.blockPreview}>{block.text}</pre>
              {feedback?.blockId === block.id && feedback.status === 'success' ? (
                <span className={styles.feedbackOk} data-testid="scene-copy-feedback">
                  已复制
                </span>
              ) : null}
              {feedback?.blockId === block.id && feedback.status === 'error' ? (
                <span className={styles.feedbackErr} data-testid="scene-copy-feedback">
                  复制失败
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className={styles.panel}>
      {displayModel.summary ? <p className={styles.summary}>{displayModel.summary}</p> : null}
      {displayModel.warnings.length > 0 ? (
        <ul className={styles.warnings}>
          {displayModel.warnings.map((w) => (
            <li key={w.code}>{w.message}</li>
          ))}
        </ul>
      ) : null}
      {renderGroup('Copy Full', fullBlocks)}
      {renderGroup('Copy Section', sectionBlocks)}
      {renderGroup('Copy Prompt', promptBlocks)}
    </div>
  );
}