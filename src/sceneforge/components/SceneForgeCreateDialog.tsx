import { useCallback, useState } from 'react';
import type { SceneEntryPath } from '../../types/sceneforge';
import { Button } from '../../ui/components/button';
import styles from './SceneForgeCreateDialog.module.css';

export interface SceneForgeCreateDialogProps {
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entryPath: SceneEntryPath) => void;
}

const OPTIONS: Array<{
  value: SceneEntryPath;
  title: string;
  detail: string;
}> = [
  {
    value: 'topic_gate',
    title: '从选题与创作想法开始',
    detail: '适合桥段、热点、原著母题或文字描述',
  },
  {
    value: 'source_intake',
    title: '从视频或链接解析开始',
    detail: '解析完成后仍进入选题闸门与风格确认',
  },
];

export function SceneForgeCreateDialog({
  open,
  busy = false,
  onOpenChange,
  onConfirm,
}: SceneForgeCreateDialogProps) {
  const [entryPath, setEntryPath] = useState<SceneEntryPath>('topic_gate');

  const handleConfirm = useCallback(() => {
    onConfirm(entryPath);
  }, [entryPath, onConfirm]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={() => onOpenChange(false)}>
      <div
        className={styles.panel}
        role="dialog"
        aria-labelledby="sceneforge-create-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sceneforge-create-title" className={styles.title}>
          新建视频内容创作工坊
        </h2>
        <p className={styles.lead}>选择项目起点。两种路径都会经过完整选题闸门与后续流水线。</p>
        <div className={styles.options} role="radiogroup" aria-label="项目起点">
          {OPTIONS.map((opt) => {
            const selected = entryPath === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                onClick={() => setEntryPath(opt.value)}
              >
                <span className={styles.optionIndicator} aria-hidden>
                  <span className={styles.optionDot} />
                </span>
                <span className={styles.optionCopy}>
                  <span className={styles.optionTitle}>{opt.title}</span>
                  <span className={styles.optionDetail}>{opt.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={busy} onClick={handleConfirm}>
            选择目录并创建
          </Button>
        </div>
      </div>
    </div>
  );
}