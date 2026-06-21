import { Button, Tabs, TabsList, TabsTrigger } from '../../../ui';
import type { SceneArtifact } from '../../../lib/electron-api';
import type { SceneArtifactCopyBlock, SceneArtifactDisplayModel } from '../../../types/sceneforge';
import { ArtifactCopyPanel, type SceneCopyFeedback } from '../artifacts/ArtifactCopyPanel';
import styles from '../../pages/SceneForgeStudio.module.css';

const inspectorTabs = ['Preview', 'Structure', 'Trace', 'Raw', 'Copy'] as const;

export type SceneInspectorTab = (typeof inspectorTabs)[number];

export interface SceneForgeStudioInspectorProps {
  stageArtifacts: SceneArtifact[];
  selectedArtifact: SceneArtifact | null;
  selectedArtifactId: string | null;
  selectedTab: SceneInspectorTab;
  onSelectTab: (tab: SceneInspectorTab) => void;
  onSelectArtifact: (artifactId: string) => void;
  artifactContent: string;
  displayModel: SceneArtifactDisplayModel | null;
  previewText: string;
  copyFeedback: SceneCopyFeedback;
  onCopyBlock: (block: SceneArtifactCopyBlock) => void;
  onCopyRaw: () => void;
}

export function SceneForgeStudioInspector({
  stageArtifacts,
  selectedArtifact,
  selectedArtifactId,
  selectedTab,
  onSelectTab,
  onSelectArtifact,
  artifactContent,
  displayModel,
  previewText,
  copyFeedback,
  onCopyBlock,
  onCopyRaw,
}: SceneForgeStudioInspectorProps) {
  return (
    <aside className={styles.inspector} aria-label="产物检查器">
      <div className={styles.panelHeader}>
        <span>产物检查器</span>
      </div>
      <div className={styles.inspectorBody}>
        <div className={styles.artifactList}>
          {stageArtifacts.length === 0 ? (
            <p className={styles.emptyTitle}>尚未选择产物</p>
          ) : (
            stageArtifacts.map((artifact) => (
              <button
                key={artifact.id}
                type="button"
                className={
                  artifact.id === selectedArtifactId ? styles.artifactButtonActive : styles.artifactButton
                }
                data-testid="scene-inspector-artifact"
                onClick={() => onSelectArtifact(artifact.id)}
              >
                {artifact.title}
              </button>
            ))
          )}
        </div>
        <div className={styles.inspectorTabsWrap}>
          <Tabs
            value={selectedTab}
            onValueChange={(v) => onSelectTab(v as SceneInspectorTab)}
          >
            <TabsList className={styles.inspectorTabsList} aria-label="Artifact Inspector tabs">
              {inspectorTabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={styles.inspectorTabTrigger}
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {selectedArtifact ? (
          <div className={styles.artifactPreview} data-testid="scene-artifact-inspector">
            <h3>{selectedArtifact.title}</h3>
            <p>{selectedArtifact.id}</p>
            {selectedTab === 'Copy' ? (
              <ArtifactCopyPanel
                displayModel={displayModel}
                rawContent={artifactContent}
                feedback={copyFeedback}
                onCopyBlock={onCopyBlock}
                onCopyRaw={onCopyRaw}
              />
            ) : selectedTab === 'Raw' ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.rawCopyButton}
                  data-testid="scene-copy-raw"
                  onClick={() => void onCopyRaw()}
                >
                  复制全文 Markdown
                </Button>
                {copyFeedback?.blockId === (selectedArtifactId ?? 'raw') && copyFeedback.status === 'success' ? (
                  <span className={styles.rawFeedback} data-testid="scene-copy-feedback">
                    已复制
                  </span>
                ) : null}
                <pre>{artifactContent}</pre>
              </>
            ) : selectedTab === 'Trace' ? (
              <pre>{JSON.stringify(selectedArtifact, null, 2)}</pre>
            ) : selectedTab === 'Structure' ? (
              <pre>
                {displayModel ? JSON.stringify(displayModel.sections, null, 2) : selectedArtifact.path}
              </pre>
            ) : (
              <pre>{previewText}</pre>
            )}
          </div>
        ) : (
          <p className={styles.emptyCopy}>核心产物生成后，会在这里查看预览、结构、追踪和原始内容。</p>
        )}
      </div>
    </aside>
  );
}