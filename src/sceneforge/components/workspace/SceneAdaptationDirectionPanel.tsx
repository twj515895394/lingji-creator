import { useCallback, useState } from 'react';
import { Button } from '../../../ui/components/button';
import {
  buildAdaptationSelectionMarkdown,
  type SceneAdaptationDirection,
} from '../../lib/scene-hitl-markdown';
import styles from './SceneAdaptationDirectionPanel.module.css';

export interface SceneAdaptationDirectionPanelProps {
  projectDir: string | null;
  directions: SceneAdaptationDirection[];
  selectedId?: string;
  onConfirmed?: () => void;
  onError?: (message: string) => void;
}

export function SceneAdaptationDirectionPanel({
  projectDir,
  directions,
  selectedId: initialSelectedId,
  onConfirmed,
  onError,
}: SceneAdaptationDirectionPanelProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? directions[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const handleConfirm = useCallback(async () => {
    const picked = directions.find((d) => d.id === selectedId);
    if (!picked) {
      onError?.('请先选择一项改编方向。');
      return;
    }
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    setBusy(true);
    try {
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage: 'source_intake',
        artifacts: [
          {
            artifactKey: 'adaptation_selection',
            content: buildAdaptationSelectionMarkdown(picked),
          },
        ],
      });
      if (result.validation.status === 'failed') {
        onError?.(result.validation.errors[0]?.message ?? '确认提交校验失败');
      } else {
        onConfirmed?.();
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }, [directions, onConfirmed, onError, projectDir, selectedId]);

  if (directions.length === 0) {
    return null;
  }

  return (
    <section className={styles.root} data-testid="scene-adaptation-direction-panel">
      <h3 className={styles.title}>改编方向（必选一项）</h3>
      <p className={styles.lead}>在源材料的「## 改编方向」下列出候选后，在此选择并确认，方可完成 intake 校验。</p>
      <ul className={styles.list}>
        {directions.map((dir) => (
          <li key={dir.id}>
            <label className={styles.card}>
              <input
                type="radio"
                name="adaptation-direction"
                value={dir.id}
                checked={selectedId === dir.id}
                onChange={() => setSelectedId(dir.id)}
              />
              <span className={styles.cardBody}>
                <span className={styles.cardTitle}>{dir.title}</span>
                {dir.summary ? <span className={styles.cardSummary}>{dir.summary}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button type="button" variant="primary" size="sm" disabled={busy || !projectDir} onClick={() => void handleConfirm()}>
        {busy ? '提交中…' : '确认改编方向'}
      </Button>
    </section>
  );
}