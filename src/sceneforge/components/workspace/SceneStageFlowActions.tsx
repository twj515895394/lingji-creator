import { Check } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import styles from './SceneStageFlowActions.module.css';

export interface SceneStageFlowActionsProps {
  /** 可点校验（例如 gate 需先确认风格） */
  canValidate: boolean;
  validateDisabledReason?: string;
  /** 本次或阶段已校验通过 */
  validatePassed: boolean;
  validateFailed?: boolean;
  canContinue: boolean;
  continueDisabledReason?: string;
  onValidate: () => void;
  onContinue: () => void;
  validateBusy?: boolean;
  continueBusy?: boolean;
}

export function SceneStageFlowActions({
  canValidate,
  validateDisabledReason,
  validatePassed,
  validateFailed,
  canContinue,
  continueDisabledReason,
  onValidate,
  onContinue,
  validateBusy,
  continueBusy,
}: SceneStageFlowActionsProps) {
  return (
    <div className={styles.root} data-testid="scene-stage-flow-actions">
      <div className={styles.track}>
        <div className={`${styles.step} ${validatePassed ? styles.stepDone : styles.stepActive}`}>
          {validatePassed ? (
            <span className={styles.stepIconDone} aria-hidden>
              <Check size={14} strokeWidth={2.5} />
            </span>
          ) : (
            <span className={styles.stepDot} aria-hidden />
          )}
          <Button
            type="button"
            variant={validatePassed ? 'secondary' : 'secondary'}
            size="sm"
            className={
              validatePassed
                ? styles.btnPassed
                : validateFailed
                  ? styles.btnFailed
                  : styles.stepBtn
            }
            disabled={!canValidate || validateBusy || validatePassed}
            title={validateDisabledReason}
            onClick={() => onValidate()}
          >
            {validateBusy ? '校验中…' : validatePassed ? '已通过' : 'Validate'}
          </Button>
        </div>

        <span className={styles.connector} aria-hidden />

        <div className={`${styles.step} ${canContinue ? styles.stepActive : ''}`}>
          <span className={styles.stepDot} aria-hidden />
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={styles.stepBtn}
            disabled={!canContinue || continueBusy}
            title={continueDisabledReason}
            onClick={() => onContinue()}
          >
            {continueBusy ? '提交中…' : 'Continue'}
          </Button>
        </div>
      </div>
      {!canValidate && validateDisabledReason ? (
        <p className={styles.hint}>{validateDisabledReason}</p>
      ) : null}
    </div>
  );
}