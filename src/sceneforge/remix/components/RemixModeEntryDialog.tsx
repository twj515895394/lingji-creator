import { useCallback, useState } from 'react';
import { Button } from '../../../ui/components/button';
import styles from '../../components/SceneForgeCreateDialog.module.css';

export type RemixEntryIntent = 'asset-ingestion' | 'creation';

interface RemixModeEntryDialogProps {
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (intent: RemixEntryIntent) => void;
}

const OPTIONS: Array<{
  value: RemixEntryIntent;
  title: string;
  detail: string;
}> = [
  {
    value: 'asset-ingestion',
    title: '资产入库',
    detail: '导入原片、切片、关键帧与资产标记，先把原片沉淀成稳定的源素材。',
  },
  {
    value: 'creation',
    title: '二次创作',
    detail: '基于已经入库的源素材，继续已有二创版本或创建新的二创版本。',
  },
];

export function RemixModeEntryDialog({
  open,
  busy = false,
  onOpenChange,
  onConfirm,
}: RemixModeEntryDialogProps) {
  const [intent, setIntent] = useState<RemixEntryIntent>('asset-ingestion');

  const handleConfirm = useCallback(() => {
    onConfirm(intent);
  }, [intent, onConfirm]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={() => onOpenChange(false)}>
      <div
        className={styles.panel}
        role="dialog"
        aria-labelledby="remix-entry-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="remix-entry-title" className={styles.title}>
          进入 Remix 二创
        </h2>
        <p className={styles.lead}>先选择你这次是要做“资产入库”，还是直接基于已有资产发起二创。</p>
        <div className={styles.options} role="radiogroup" aria-label="Remix 入口模式">
          {OPTIONS.map((option) => {
            const selected = intent === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                onClick={() => setIntent(option.value)}
              >
                <span className={styles.optionIndicator} aria-hidden>
                  <span className={styles.optionDot} />
                </span>
                <span className={styles.optionCopy}>
                  <span className={styles.optionTitle}>{option.title}</span>
                  <span className={styles.optionDetail}>{option.detail}</span>
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
            选择项目并进入
          </Button>
        </div>
      </div>
    </div>
  );
}
