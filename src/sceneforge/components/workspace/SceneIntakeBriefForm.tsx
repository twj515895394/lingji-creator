import { useCallback, useEffect, useState } from 'react';
import type { SubmitStageDraftResult } from '../../../lib/electron-api';
import { Alert, Button } from '../../../ui';
import { parseIntakeIntent, buildIntakeBriefMarkdown } from '../../lib/topic-gate-form';
import styles from './SceneStageBriefForms.module.css';

export interface SceneIntakeBriefFormProps {
  projectDir: string | null;
  initialMarkdown?: string;
  onSubmitted?: (result: SubmitStageDraftResult) => void;
  onError?: (message: string) => void;
}

export function SceneIntakeBriefForm({
  projectDir,
  initialMarkdown = '',
  onSubmitted,
  onError,
}: SceneIntakeBriefFormProps) {
  const [intent, setIntent] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanced, setAdvanced] = useState(initialMarkdown);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitStageDraftResult | null>(null);

  useEffect(() => {
    setIntent(parseIntakeIntent(initialMarkdown));
    setAdvanced(initialMarkdown);
  }, [initialMarkdown]);

  const handleSubmit = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    const body = showAdvanced && advanced.trim() ? advanced.trim() : buildIntakeBriefMarkdown(intent);
    setBusy(true);
    setLastResult(null);
    try {
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage: 'source_intake',
        artifacts: [{ artifactKey: 'source_material', content: body }],
      });
      setLastResult(result);
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
  }, [advanced, intent, onError, onSubmitted, projectDir, showAdvanced]);

  const submitOk = lastResult && lastResult.validation.status !== 'failed';

  return (
    <section className={styles.root} data-testid="scene-intake-brief-form">
      <p className={styles.lead}>
        用一句话说明素材来源或你想解析的内容。点「保存源材料」会把内容<strong>写入本项目目录</strong>下的 SceneForge
        产物库（本地文件，不是云端接口）；随后可校验、审批，Agent 也能通过 MCP 读取同一份数据。
      </p>
      <label className={styles.field}>
        <span className={styles.label}>素材 / 链接说明</span>
        <input
          className={styles.inputSingle}
          type="text"
          placeholder="例如：抖音链接、想改编的短片主题、或粘贴 URL"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
        />
      </label>
      <button type="button" className={styles.advancedToggle} onClick={() => setShowAdvanced((v) => !v)}>
        {showAdvanced ? '收起高级 Markdown' : '高级：完整 Markdown 编辑'}
      </button>
      {showAdvanced ? (
        <label className={styles.field}>
          <span className={styles.label}>源材料全文</span>
          <textarea
            className={styles.textareaCompact}
            rows={8}
            value={advanced}
            onChange={(e) => setAdvanced(e.target.value)}
          />
        </label>
      ) : null}
      <div className={styles.actions}>
        <Button type="button" variant="primary" size="sm" disabled={busy || !projectDir} onClick={() => void handleSubmit()}>
          {busy ? '保存中…' : '保存源材料'}
        </Button>
      </div>
      {submitOk ? (
        <Alert
          variant="success"
          title="已保存到本项目"
          description={`产物已写入本地 Artifact Store，阶段状态：${lastResult.status}。下一步请确认改编方向，再继续后续阶段。`}
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
