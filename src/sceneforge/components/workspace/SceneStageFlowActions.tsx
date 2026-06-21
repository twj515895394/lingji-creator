import { Check } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import styles from './SceneStageFlowActions.module.css';

export interface SceneStageFlowActionsProps {
  stageMode?: 'core_confirm' | 'support_light';
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
  onContinueAndRun?: () => void;
  canContinueAndRun?: boolean;
  nextStageTitle?: string;
  validateBusy?: boolean;
  continueBusy?: boolean;
  runningNext?: boolean;
  /** 流水线最后一阶段（publish） */
  isTerminalStage?: boolean;
  projectCompleted?: boolean;
}

export function SceneStageFlowActions({
  stageMode = 'core_confirm',
  canValidate,
  validateDisabledReason,
  validatePassed,
  validateFailed,
  canContinue,
  continueDisabledReason,
  onValidate,
  onContinue,
  onContinueAndRun,
  canContinueAndRun = false,
  nextStageTitle,
  validateBusy,
  continueBusy,
  runningNext,
  isTerminalStage = false,
  projectCompleted = false,
}: SceneStageFlowActionsProps) {
  const continueLabel = projectCompleted
    ? '已完成'
    : continueBusy
      ? isTerminalStage
        ? '收工校验中…'
        : '提交中…'
      : isTerminalStage
        ? '完成创作'
        : 'Continue';
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
            disabled={!canContinue || continueBusy || runningNext || projectCompleted}
            title={continueDisabledReason}
            onClick={() => onContinue()}
          >
            {continueLabel}
          </Button>
        </div>
        {canContinueAndRun && onContinueAndRun && nextStageTitle && !isTerminalStage ? (
          <div className={styles.autoAction}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="scene-continue-and-run"
              disabled={!canContinue || continueBusy || runningNext}
              onClick={() => onContinueAndRun()}
            >
              {runningNext ? '运行下一阶段…' : 'Continue & Run'}
            </Button>
            <span>
              将用 Direct LLM 运行「{nextStageTitle}」，生成结果仍需手动提交。
            </span>
          </div>
        ) : null}
      </div>
      {!canValidate && validateDisabledReason ? (
        <p className={styles.hint}>{validateDisabledReason}</p>
      ) : null}
      {stageMode === 'support_light' && !isTerminalStage ? (
        <p className={styles.hint}>当前阶段为轻确认路径，后续可演进为“提交并继续”。</p>
      ) : null}
      {isTerminalStage && !projectCompleted ? (
        <p className={styles.hint}>
          点击「完成创作」将依次校验各阶段产物，全部通过后把本项目标记为创作完成。
        </p>
      ) : null}
    </div>
  );
}
