import { useCallback, useEffect, useState } from 'react';
import type { SubmitStageDraftResult } from '../../../lib/electron-api';
import type { SceneStageId, SceneStageStatus } from '../../../types/sceneforge';
import { Button } from '../../../ui/components/button';
import {
  getPrepSupportConfig,
  isMarkdownSupportSubmitStage,
  type PrepSupportStageConfig,
  type PrepSupportSubmitStage,
} from '../../lib/scene-prep-support-stages';
import styles from './ScenePrepSupportWorkspace.module.css';
import { StageRunPanel } from '../stage-run/StageRunPanel';
import { stageSupportsRunner } from '../../lib/scene-stage-run-capabilities';

export interface ScenePrepSupportWorkspaceProps {
  projectDir: string | null;
  stage: PrepSupportSubmitStage;
  stageTitle: string;
  autoAdvanceAfterSubmit?: boolean;
  currentStatus?: SceneStageStatus;
  revisionNote?: string | null;
  initialContent?: string;
  onSubmitted?: (result: SubmitStageDraftResult) => void;
  onError?: (message: string) => void;
}

export function ScenePrepSupportWorkspace({
  projectDir,
  stage,
  stageTitle,
  autoAdvanceAfterSubmit = false,
  currentStatus,
  revisionNote = null,
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
  const submitButtonLabel = autoAdvanceAfterSubmit ? '提交并继续' : '提交草案';
  const draftSubmitLabel = autoAdvanceAfterSubmit ? '提交草案并继续到下一阶段' : undefined;

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
        onSubmitted?.(result);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }, [config.artifactKey, config.placeholder, content, onError, onSubmitted, projectDir, stage]);

  return (
    <>
      {stageSupportsRunner(stage, 'direct_llm') ? (
        <StageRunPanel
          projectDir={projectDir}
          stage={stage}
          stageTitle={stageTitle}
          currentStatus={currentStatus}
          revisionNote={revisionNote}
          draftSubmitLabel={draftSubmitLabel}
          onSubmitted={onSubmitted}
          onRunError={onError}
        />
      ) : null}
      <section className={styles.root} data-testid={`scene-prep-support-${stage}`}>
        <p className={styles.lead}>
          {autoAdvanceAfterSubmit ? `${config.lead} 校验通过后会直接进入下一阶段。` : config.lead}
        </p>
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
            {busy ? '提交中…' : submitButtonLabel}
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
    </>
  );
}

export function isPrepSupportSubmitStage(
  stage: SceneStageId,
): stage is PrepSupportSubmitStage {
  return isMarkdownSupportSubmitStage(stage);
}
