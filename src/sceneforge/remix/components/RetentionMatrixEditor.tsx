import { Slider } from '../../../ui';
import type { RetentionMatrix } from '../types';
import {
  getRetentionChoiceValue,
  getRetentionMatrixChoiceLabel,
  getRetentionMatrixValueIndex,
  RETENTION_MATRIX_DIMENSIONS,
} from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface RetentionMatrixEditorProps {
  retentionMatrix: RetentionMatrix;
  onChange: (next: RetentionMatrix) => void;
}

export function RetentionMatrixEditor({
  retentionMatrix,
  onChange,
}: RetentionMatrixEditorProps) {
  return (
    <div className={styles.matrixGrid} data-testid="remix-retention-matrix-editor">
      {RETENTION_MATRIX_DIMENSIONS.map((dimension) => {
        const value = retentionMatrix[dimension.key];
        const sliderValue = getRetentionMatrixValueIndex(dimension.key, value);
        return (
          <article key={dimension.key} className={styles.matrixRow}>
            <div className={styles.matrixTopline}>
              <div>
                <div className={styles.matrixLabel}>{dimension.label}</div>
                <div className={styles.matrixDescription}>{dimension.description}</div>
              </div>
              <div className={styles.matrixValue}>
                {getRetentionMatrixChoiceLabel(dimension.key, value)}
              </div>
            </div>
            <Slider
              min={0}
              max={dimension.options.length - 1}
              step={1}
              value={sliderValue}
              onChange={(nextValue) =>
                onChange({
                  ...retentionMatrix,
                  [dimension.key]: getRetentionChoiceValue(dimension.key, nextValue),
                })
              }
              size="sm"
            />
            <div className={styles.matrixOptions}>
              {dimension.options.map((option) => (
                <span key={String(option.value)} className={styles.matrixOption}>
                  {option.label}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
