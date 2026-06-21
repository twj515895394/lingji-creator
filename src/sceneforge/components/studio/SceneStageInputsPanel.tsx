import type { SceneStageContext } from '../../../lib/electron-api';
import { InspectorSection } from '../../../ui/patterns/InspectorSection';
import styles from '../../pages/SceneForgeStudio.module.css';

interface SceneStageInputsPanelProps {
  stageContext: SceneStageContext;
}

function describeDelivery(delivery: string | undefined): string {
  if (delivery === 'handoff' || delivery === 'handoff_first') {
    return '交接摘要';
  }
  if (delivery === 'summary') {
    return '摘要摘录';
  }
  if (delivery === 'pointer') {
    return '路径指针';
  }
  if (delivery === 'full') {
    return '完整产物';
  }
  return '阶段输入';
}

function sortInputsByPriority<T extends SceneStageContext['requiredInputs'][number]>(inputs: T[]): T[] {
  return [...inputs].sort((left, right) => {
    const leftPriority = left.priorityOrder ?? Number.NEGATIVE_INFINITY;
    const rightPriority = right.priorityOrder ?? Number.NEGATIVE_INFINITY;
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }
    return left.artifactId.localeCompare(right.artifactId);
  });
}

function buildSummaryLine(
  requiredCount: number,
  optionalCount: number,
  missingRequiredCount: number,
): string {
  const parts = [`阻塞 ${requiredCount}`, `补充 ${optionalCount}`];
  if (missingRequiredCount > 0) {
    parts.push(`缺失 ${missingRequiredCount}`);
  } else {
    parts.push('全部就绪');
  }
  return parts.join(' · ');
}

function StageInputRow({
  input,
}: {
  input: SceneStageContext['requiredInputs'][number];
}) {
  const stageLabel = input.fromStage ?? input.stage;
  const artifactRef = input.fromStage
    ? `${input.fromStage}.${input.artifactKey}`
    : input.artifactId;
  const missing = input.satisfied === false;

  return (
    <div
      className={missing ? styles.stageInputRowMissing : styles.stageInputRow}
      data-testid="scene-stage-input-row"
      title={artifactRef}
    >
      <div className={styles.stageInputRowMain}>
        <span className={styles.stageInputRowTitle}>{input.title}</span>
        <span className={styles.stageInputRowMeta}>
          {stageLabel}
          {' · '}
          {describeDelivery(input.delivery)}
        </span>
      </div>
      <span
        className={missing ? styles.stageInputRowStatusMissing : styles.stageInputRowStatusReady}
        aria-label={missing ? '缺失' : '已就绪'}
      >
        {missing ? '缺失' : '已就绪'}
      </span>
    </div>
  );
}

function InputGroup({
  title,
  count,
  inputs,
  emptyText,
}: {
  title: string;
  count: number;
  inputs: SceneStageContext['requiredInputs'];
  emptyText: string;
}) {
  const sortedInputs = sortInputsByPriority(inputs);

  return (
    <div className={styles.stageInputGroup}>
      <h4 className={styles.stageInputGroupTitle}>
        {title}
        <span className={styles.stageInputGroupCount}>{count}</span>
      </h4>
      {sortedInputs.length === 0 ? (
        <p className={styles.stageInputEmpty}>{emptyText}</p>
      ) : (
        <div className={styles.stageInputRowList}>
          {sortedInputs.map((input) => (
            <StageInputRow key={`${input.policyInputId}-${input.artifactId}`} input={input} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SceneStageInputsPanel({ stageContext }: SceneStageInputsPanelProps) {
  const requiredCount = stageContext.requiredInputs.length;
  const optionalCount = stageContext.optionalInputs.length;
  const missingRequiredCount = stageContext.requiredInputs.filter((input) => input.satisfied === false).length;
  const hasMissingRequiredInput = missingRequiredCount > 0;
  const summaryLine = buildSummaryLine(requiredCount, optionalCount, missingRequiredCount);

  return (
    <section
      className={styles.stageInputsInspectorWrap}
      aria-label="本阶段输入"
      data-testid="scene-stage-inputs-panel"
    >
      <InspectorSection
        title="本阶段输入"
        className={`${styles.workspaceSection} ${styles.stageInputsInspector}`}
      >
        <p className={styles.stageInputsLead}>上游阶段产物，不含项目级参考资产。</p>

        <details
          className={styles.stageInputsDisclosure}
          open={hasMissingRequiredInput}
          data-testid="scene-stage-inputs-disclosure"
          data-default-open={hasMissingRequiredInput ? 'true' : 'false'}
        >
          <summary className={styles.stageInputsSummary}>
            <span className={styles.stageInputsSummaryLeading}>
              <span className={styles.stageInputsChevron} aria-hidden />
              <span className={styles.stageInputsSummaryLabel}>上游依赖</span>
            </span>
            <span className={styles.stageInputsSummaryHint} data-testid="scene-stage-inputs-summary">
              {summaryLine}
            </span>
          </summary>

          <div className={styles.stageInputsDisclosureBody}>
            {hasMissingRequiredInput ? (
              <p className={styles.stageInputsBlockingHint} role="status">
                有阻塞型输入缺失时，当前阶段无法运行。补齐上游产物后刷新本页。
              </p>
            ) : null}

            <InputGroup
              title="阻塞型上游输入"
              count={requiredCount}
              inputs={stageContext.requiredInputs}
              emptyText="当前阶段没有阻塞型上游输入。"
            />
            <InputGroup
              title="补充型上游输入"
              count={optionalCount}
              inputs={stageContext.optionalInputs}
              emptyText="当前阶段没有补充型上游输入。"
            />
          </div>
        </details>
      </InspectorSection>
    </section>
  );
}