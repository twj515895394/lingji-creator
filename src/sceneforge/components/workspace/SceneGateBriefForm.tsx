import { useCallback, useEffect, useState } from 'react';
import type { SubmitStageDraftResult } from '../../../lib/electron-api';
import { Alert, Button } from '../../../ui';
import {
  buildTopicBriefMarkdown,
  createTopicBriefHash,
  isTopicBriefFormComplete,
  parseTopicBriefForm,
  SEGMENT_DURATION_OPTIONS,
  type TopicBriefFormValues,
} from '../../lib/topic-gate-form';
import styles from './SceneStageBriefForms.module.css';

export interface SceneGateBriefFormProps {
  projectDir: string | null;
  initialMarkdown?: string;
  canSave?: boolean;
  confirmBusy?: boolean;
  confirmPassed?: boolean;
  onDraftChange?: (payload: {
    form: TopicBriefFormValues;
    markdown: string;
    hash: string;
    complete: boolean;
  }) => void;
  onConfirmDraft?: (payload: { form: TopicBriefFormValues; markdown: string; hash: string }) => void;
  onSubmitted?: (result: SubmitStageDraftResult) => void;
  onIntentDirtyChange?: (dirty: boolean) => void;
  onError?: (message: string) => void;
}

export function SceneGateBriefForm({
  projectDir,
  initialMarkdown = '',
  canSave = false,
  confirmBusy = false,
  confirmPassed = false,
  onDraftChange,
  onConfirmDraft,
  onSubmitted,
  onIntentDirtyChange,
  onError,
}: SceneGateBriefFormProps) {
  const [form, setForm] = useState<TopicBriefFormValues>({
    intent: '',
    totalDurationSec: 60,
    segmentDurationSec: 8,
  });
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitStageDraftResult | null>(null);
  const [touched, setTouched] = useState({
    intent: false,
    totalDurationSec: false,
    segmentDurationSec: false,
  });

  useEffect(() => {
    const parsed = parseTopicBriefForm(initialMarkdown);
    const hasSavedDraft = Boolean(initialMarkdown.trim());
    setForm(parsed);
    setTouched({
      intent: hasSavedDraft && Boolean(parsed.intent.trim()),
      totalDurationSec: hasSavedDraft && parsed.totalDurationSec != null,
      segmentDurationSec: hasSavedDraft,
    });
    onIntentDirtyChange?.(false);
  }, [initialMarkdown, onIntentDirtyChange]);

  useEffect(() => {
    const markdown = buildTopicBriefMarkdown(form);
    onDraftChange?.({
      form,
      markdown,
      hash: createTopicBriefHash(form),
      complete: isTopicBriefFormComplete(form),
    });
  }, [form, onDraftChange]);

  const handleSubmit = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    if (!form.intent.trim()) {
      onError?.('请先填写创作意图（一句话即可）。');
      return;
    }
    if (!canSave) {
      onError?.('请先确认选题描述通过，再保存选题简报。');
      return;
    }
    setBusy(true);
    setLastResult(null);
    try {
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage: 'topic_gate',
      artifacts: [{ artifactKey: 'topic_brief', content: buildTopicBriefMarkdown(form) }],
      });
      setLastResult(result);
      onIntentDirtyChange?.(false);
      if (result.validation.status === 'failed') {
        onError?.(result.validation.errors[0]?.message ?? '校验未通过');
      } else {
        onSubmitted?.(result);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }, [form, onError, onIntentDirtyChange, onSubmitted, projectDir]);

  const submitOk = lastResult && lastResult.validation.status !== 'failed';
  const canConfirm =
    isTopicBriefFormComplete(form) &&
    touched.intent &&
    touched.totalDurationSec &&
    touched.segmentDurationSec;

  return (
    <section className={styles.root} data-testid="scene-gate-brief-form">
      <p className={styles.lead}>
        选题通常只需一两句话。保存后会写入本项目本地产物库，并自动跑校验规则；数据都在你的项目文件夹里，不是云端接口。
      </p>
      <label className={styles.field}>
        <span className={styles.label}>创作意图</span>
        <textarea
          className={styles.textareaIntent}
          rows={3}
          placeholder="用 2-4 句写清楚你想讲什么、想做成什么感觉、从哪个切口展开"
          value={form.intent}
          onChange={(e) => {
            setForm((f) => ({ ...f, intent: e.target.value }));
            setTouched((current) => ({ ...current, intent: true }));
            onIntentDirtyChange?.(true);
          }}
        />
      </label>
      <div className={styles.durationRow}>
        <label className={styles.fieldGrow}>
          <span className={styles.label}>成片总时长（秒）</span>
          <input
            className={styles.inputSingle}
            type="number"
            min={5}
            max={3600}
            step={1}
            placeholder="60"
            value={form.totalDurationSec ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number.parseInt(e.target.value, 10);
              setForm((f) => ({
                ...f,
                totalDurationSec: v != null && Number.isFinite(v) ? v : null,
              }));
              setTouched((current) => ({ ...current, totalDurationSec: true }));
              onIntentDirtyChange?.(true);
            }}
          />
        </label>
        <fieldset className={styles.segmentFieldset}>
          <legend className={styles.label}>每段时长</legend>
          <div className={styles.chipRow}>
            {SEGMENT_DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.chip} ${form.segmentDurationSec === opt.value ? styles.chipActive : ''}`}
                onClick={() => {
                  setForm((f) => ({ ...f, segmentDurationSec: opt.value }));
                  setTouched((current) => ({ ...current, segmentDurationSec: true }));
                  onIntentDirtyChange?.(true);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={styles.inlinePrimaryButton}
          disabled={!projectDir || !canConfirm || confirmBusy}
          onClick={() =>
            onConfirmDraft?.({
              form,
              markdown: buildTopicBriefMarkdown(form),
              hash: createTopicBriefHash(form),
            })
          }
        >
          {confirmBusy ? '确认中…' : confirmPassed ? '已确认选题描述' : '确认选题描述'}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={styles.inlinePrimaryButton}
          disabled={busy || !projectDir || !canSave}
          onClick={() => void handleSubmit()}
        >
          {busy ? '保存中…' : '保存选题简报'}
        </Button>
      </div>
      {submitOk ? (
        <Alert
          variant="success"
          title="选题简报已保存"
          description={`已写入本地产物并更新阶段状态（${lastResult.status}）。请在下方确认风格与决策，再决定是否继续推进。`}
          className={styles.feedback}
        />
      ) : null}
      {lastResult?.validation.status === 'failed' ? (
        <Alert
          variant="error"
          title="校验未通过"
          description={lastResult.validation.errors[0]?.message ?? '请按提示修改后重试。'}
          className={styles.feedback}
        />
      ) : null}
    </section>
  );
}
