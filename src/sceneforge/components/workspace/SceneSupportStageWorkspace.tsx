import { useCallback, useState } from 'react';
import type { SceneStageId } from '../../../types/sceneforge';
import type { SubmitStageDraftResult } from '../../../lib/electron-api';
import { Button } from '../../../ui/components/button';
import styles from './SceneSupportStageWorkspace.module.css';

export interface SceneSupportStageWorkspaceProps {
  projectDir: string | null;
  stage: 'source_intake' | 'topic_gate';
  stageTitle: string;
  artifactKey: string;
  artifactLabel: string;
  initialContent?: string;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
}

const INTAKE_PLACEHOLDER = `# 源材料

## 输入类型
video_url | video_file | frame_sequence | text

## 链接或说明
（粘贴视频链接，或描述你要解析的素材）

## 用户目标
（希望从该素材得到什么：改编方向、结构分析等）
`;

const GATE_PLACEHOLDER = `# 选题简报

## 创作意图
（桥段、热点、原著母题或改编想法）

## 成片规格
total_duration_sec: 60
segment_duration_sec: 8

## 决策
go

## 风格（待确认）
- style_family:
- director_style_id:

## 风格候选
- id: pixar_like | label: 动画·皮克斯感 | family: animation
- id: live_action_cinematic | label: 实拍·电影感 | family: live_action
- id: documentary | label: 纪实·解说 | family: documentary

## 备注
（先保存，再分析，再在确认区正式确认风格与继续策略）
`;

export function SceneSupportStageWorkspace({
  projectDir,
  stage,
  stageTitle,
  artifactKey,
  artifactLabel,
  initialContent = '',
  onSubmitted,
  onError,
}: SceneSupportStageWorkspaceProps) {
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitStageDraftResult | null>(null);

  const placeholder = stage === 'source_intake' ? INTAKE_PLACEHOLDER : GATE_PLACEHOLDER;

  const handleSubmit = useCallback(async () => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    const body = content.trim() || placeholder;
    setBusy(true);
    setLastResult(null);
    try {
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage,
        artifacts: [{ artifactKey, content: body }],
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
  }, [artifactKey, content, onError, onSubmitted, placeholder, projectDir, stage]);

  return (
    <section className={styles.root} data-testid={`scene-${stage}-workspace`}>
      <p className={styles.lead}>
        {stage === 'source_intake'
          ? '填写或粘贴源视频/链接说明，提交后写入源材料产物并自动校验。'
          : '填写选题与风格意向，提交后写入选题简报并自动校验。'}
      </p>
      <label className={styles.label}>
        {artifactLabel}
        <textarea
          className={styles.textarea}
          value={content}
          placeholder={placeholder}
          rows={14}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <Button type="button" disabled={busy || !projectDir} onClick={() => void handleSubmit()}>
          {busy ? '提交中…' : '提交草案'}
        </Button>
        {lastResult ? (
          <span className={styles.hint} data-testid="scene-support-submit-status">
            状态：{lastResult.status}
            {lastResult.validation.status === 'failed' ? '（校验失败）' : ''}
          </span>
        ) : null}
      </div>
      <p className={styles.note}>
        阶段：{stageTitle}（{stage}）· 产物 key：<code>{artifactKey}</code>
      </p>
    </section>
  );
}

export function supportArtifactKeyForStage(stage: SceneStageId): string | null {
  if (stage === 'source_intake') return 'source_material';
  if (stage === 'topic_gate') return 'topic_brief';
  return null;
}
