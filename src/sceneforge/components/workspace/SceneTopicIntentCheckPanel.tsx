import { useMemo, useState } from 'react';
import { Alert, Button } from '../../../ui';
import {
  parseTopicIntentCheckFromMarkdown,
  type SceneTopicIntentCheckState,
} from '../../lib/scene-hitl-markdown';
import styles from './SceneTopicIntentCheckPanel.module.css';

export interface SceneTopicIntentCheckPanelProps {
  projectDir: string | null;
  topicBriefMarkdown: string;
  initialCheckMarkdown?: string;
  stale?: boolean;
  busy?: boolean;
  showAction?: boolean;
  onChecked?: () => void;
  onError?: (message: string) => void;
}

function suggestionMapFromState(state: SceneTopicIntentCheckState): Map<string, string[]> {
  return new Map(state.suggestions.map((item) => [item.dimensionId, item.tips]));
}

const PASS_SUGGESTION_LABELS: Record<string, string> = {
  expression_goal: '情感方向',
  theme_expression: '表达重点',
  style_direction: '风格倾向',
  time_place: '时间 / 场景',
  characters: '人物 / 主体',
  action_line: '发生的事情',
  key_constraints: '时长约束',
};

function getSuggestionLabel(dimensionId: string): string {
  return PASS_SUGGESTION_LABELS[dimensionId] ?? dimensionId;
}

export function SceneTopicIntentCheckPanel({
  projectDir,
  topicBriefMarkdown,
  initialCheckMarkdown = '',
  stale = false,
  busy = false,
  showAction = true,
  onChecked,
  onError,
}: SceneTopicIntentCheckPanelProps) {
  const [localBusy, setLocalBusy] = useState(false);
  const checkState = useMemo(
    () => parseTopicIntentCheckFromMarkdown(initialCheckMarkdown),
    [initialCheckMarkdown],
  );
  const suggestionMap = useMemo(() => suggestionMapFromState(checkState), [checkState]);
  const passSuggestions = useMemo(
    () =>
      checkState.suggestions.filter(
        (item) => !checkState.missingDimensions.some((dimension) => dimension.id === item.dimensionId),
      ),
    [checkState],
  );
  const hasCheckResult = checkState.status !== 'unknown' || Boolean(checkState.summary);
  const showReadyToConfirmHint = Boolean(topicBriefMarkdown.trim()) && !hasCheckResult;
  const effectiveBusy = busy || localBusy;
  const shouldShowPreviousResult = hasCheckResult && !effectiveBusy;

  const handleCheck = async () => {
    if (!projectDir || !window.electronAPI?.sceneCheckTopicIntent) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    if (!topicBriefMarkdown.trim()) {
      onError?.('请先保存选题简报，再确认选题描述。');
      return;
    }

    setLocalBusy(true);
    try {
      await window.electronAPI.sceneCheckTopicIntent({ projectDir });
      onChecked?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '确认选题描述失败。');
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <section className={styles.root} data-testid="scene-topic-intent-check-panel">
      {!hasCheckResult ? (
        <p className={styles.lead}>先确认这段选题描述是否已经足够清楚，通过后才能保存并继续分析选题。</p>
      ) : null}
      {showReadyToConfirmHint ? (
        <p className={styles.hint}>请先把创作意图、成片总时长和每段时长填完整，再确认选题描述。</p>
      ) : null}

      {showAction ? (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={styles.primaryButton}
            disabled={!projectDir || !topicBriefMarkdown.trim() || effectiveBusy}
            onClick={() => void handleCheck()}
          >
            {effectiveBusy ? '确认中…' : '确认选题描述'}
          </Button>
        </div>
      ) : null}

      {effectiveBusy ? (
        <div className={styles.inlineBusyCard} aria-live="polite">
          <span className={styles.inlineBusyDot} aria-hidden="true" />
          <div>
            <strong>正在确认选题描述</strong>
            <p>系统正在判断当前描述是否足够支撑整段视频方向。</p>
          </div>
        </div>
      ) : null}

      {stale ? (
        <Alert
          variant="warning"
          title="你刚修改了选题描述，请重新确认"
          description="上一次的确认结果已经失效。重新确认通过后，才能再次保存并继续分析选题。"
          className={styles.feedback}
        />
      ) : null}

      {shouldShowPreviousResult && checkState.status === 'pass' ? (
        <>
          <Alert
            variant="success"
            title="选题描述已确认"
            description={checkState.summary ?? '当前创作意图已经足够明确，可以进入选题分析。'}
            className={styles.feedback}
          />
          {passSuggestions.length > 0 ? (
            <ul className={styles.missingList}>
              {passSuggestions.map((item) => (
                <li key={item.dimensionId} className={styles.adviceCard}>
                  <strong>{getSuggestionLabel(item.dimensionId)}</strong>
                  <p className={styles.reason}>这些信息不是当前必填，但补上后能让后续故事方向更稳。</p>
                  <ul className={styles.tipList}>
                    {item.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {shouldShowPreviousResult && checkState.status === 'needs_more' ? (
        <>
          <Alert
            variant="warning"
            title="还不能分析选题"
            description={checkState.summary ?? '当前描述还不足以稳定推导整段视频方向。'}
            className={styles.feedback}
          />
          <ul className={styles.missingList}>
            {checkState.missingDimensions.map((item) => (
              <li key={item.id} className={styles.missingCard}>
                <strong>{item.label}</strong>
                <p className={styles.reason}>{item.reason}</p>
                {(suggestionMap.get(item.id) ?? []).length > 0 ? (
                  <ul className={styles.tipList}>
                    {(suggestionMap.get(item.id) ?? []).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
