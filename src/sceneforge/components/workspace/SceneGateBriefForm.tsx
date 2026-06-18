import { useCallback, useEffect, useState } from 'react';
import type { SubmitStageDraftResult } from '../../../lib/electron-api';
import { Alert, Button } from '../../../ui';
import {
  buildTopicBriefMarkdown,
  parseTopicBriefForm,
  SEGMENT_DURATION_OPTIONS,
  type TopicBriefFormValues,
} from '../../lib/topic-gate-form';
import styles from './SceneStageBriefForms.module.css';

export interface SceneGateBriefFormProps {
  projectDir: string | null;
  initialMarkdown?: string;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
}

export function SceneGateBriefForm({
  projectDir,
  initialMarkdown = '',
  onSubmitted,
  onError,
}: SceneGateBriefFormProps) {
  const [form, setForm] = useState<TopicBriefFormValues>({
    intent: '',
    totalDurationSec: 60,
    segmentDurationSec: 8,
  });
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitStageDraftResult | null>(null);

  useEffect(() => {
    setForm(parseTopicBriefForm(initialMarkdown));
  }, [initialMarkdown]);

  const handleSubmit = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    if (!form.intent.trim()) {
      onError?.('请先填写创作意图（一句话即可）。');
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
      if (result.validation.status === 'failed') {
        onError?.(result.validation.errors[0]?.message ?? '校验未通过');
      } else {
        onSubmitted?.();
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }, [form, onError, onSubmitted, projectDir]);

  const submitOk = lastResult && lastResult.validation.status !== 'failed';

  return (
    <section className={styles.root} data-testid="scene-gate-brief-form">
      <p className={styles.lead}>
        选题通常只需一两句话。保存后会写入本项目本地产物库，并自动跑校验规则；数据都在你的项目文件夹里，不是云端接口。
      </p>
      <label className={styles.field}>
        <span className={styles.label}>创作意图</span>
        <input
          className={styles.inputSingle}
          type="text"
          placeholder="桥段、热点、改编想法或一句话选题"
          value={form.intent}
          onChange={(e) => setForm((f) => ({ ...f, intent: e.target.value }))}
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
                onClick={() => setForm((f) => ({ ...f, segmentDurationSec: opt.value }))}
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
          variant="primary"
          size="sm"
          className={styles.inlinePrimaryButton}
          disabled={busy || !projectDir}
          onClick={() => void handleSubmit()}
        >
          {busy ? '保存中…' : '保存选题简报'}
        </Button>
      </div>
      {submitOk ? (
        <Alert
          variant="success"
          title="选题简报已保存"
          description={`已写入本地产物并更新阶段状态（${lastResult.status}）。请在下方确认风格与决策，再对 topic_gate 做 Validate / Approve。`}
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