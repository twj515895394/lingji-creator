import { useCallback, useEffect, useState } from 'react';
import type { SubmitStageDraftResult } from '../../../lib/electron-api';
import type { SceneStageId } from '../../../types/sceneforge';
import { Button } from '../../../ui/components/button';
import {
  getPrepSupportConfig,
  isMarkdownSupportSubmitStage,
  type PrepSupportStageConfig,
  type PrepSupportSubmitStage,
} from '../../lib/scene-prep-support-stages';
import styles from './ScenePrepSupportWorkspace.module.css';

export interface ScenePrepSupportWorkspaceProps {
  projectDir: string | null;
  stage: PrepSupportSubmitStage;
  stageTitle: string;
  initialContent?: string;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
}

export function ScenePrepSupportWorkspace({
  projectDir,
  stage,
  stageTitle,
  initialContent = '',
  onSubmitted,
  onError,
}: ScenePrepSupportWorkspaceProps) {
  const config = getPrepSupportConfig(stage);
  if (!config) {
    return null;
  }
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitStageDraftResult | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, stage]);

  const handleSubmit = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    const body = content.trim() || config.placeholder;
    setBusy(true);
    setLastResult(null);
    try {
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage,
        artifacts: [{ artifactKey: config.artifactKey, content: body }],
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
  }, [config.artifactKey, config.placeholder, content, onError, onSubmitted, projectDir, stage]);

  return (
    <section className={styles.root} data-testid={`scene-prep-support-${stage}`}>
      <p className={styles.lead}>{config.lead}</p>
      <label className={styles.label}>
        {config.artifactLabel}
        <textarea
          className={styles.textarea}
          value={content}
          placeholder={config.placeholder}
          rows={14}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <Button type="button" disabled={busy || !projectDir} onClick={() => void handleSubmit()}>
          {busy ? '提交中…' : '提交草案'}
        </Button>
        {lastResult ? (
          <span className={styles.hint} data-testid="scene-prep-submit-status">
            状态：{lastResult.status}
            {lastResult.validation.status === 'failed' ? '（校验失败）' : ''}
          </span>
        ) : null}
      </div>
      <p className={styles.note}>
        阶段：{stageTitle}（{stage}）· 产物 key：<code>{config.artifactKey}</code>
      </p>
    </section>
  );
}

export function isPrepSupportSubmitStage(
  stage: SceneStageId,
): stage is PrepSupportSubmitStage {
  return isMarkdownSupportSubmitStage(stage);
}
