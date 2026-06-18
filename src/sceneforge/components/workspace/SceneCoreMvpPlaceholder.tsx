import type { SceneStageId } from '../../../types/sceneforge';
import { Button } from '../../../ui';
import styles from './SceneCoreMvpPlaceholder.module.css';

const MVP_PLACEHOLDER_BODY = '# MVP 占位\n\n用于无 LLM 时测试 Validate/Continue。\n';

const VIDEO_MVP_PLACEHOLDER_BODY = `# MVP 占位

## Segment 1
测试分段

## Audio
环境音与对白执行说明
`;

function placeholderBodyForStage(stage: 'design' | 'storyboard' | 'video_prompts'): string {
  return stage === 'video_prompts' ? VIDEO_MVP_PLACEHOLDER_BODY : MVP_PLACEHOLDER_BODY;
}

const CORE_MVP_KEYS: Partial<
  Record<'design' | 'storyboard' | 'video_prompts', readonly string[]>
> = {
  design: [
    'design_prompts',
    'character_prompts',
    'scene_prompts',
    'prop_prompts',
    'master_reference_prompt',
  ],
  storyboard: [
    'storyboard_prompt_pack',
    'control_board_prompts',
    'style_board_prompts',
    'master_board_prompt',
  ],
  video_prompts: ['video_prompt_pack', 'video_prompt_pack_cn'],
};

const CORE_STAGE_LABEL: Record<'design' | 'storyboard' | 'video_prompts', string> = {
  design: '设定图',
  storyboard: '分镜',
  video_prompts: '视频模型提示词',
};

export interface SceneCoreMvpPlaceholderProps {
  projectDir: string | null;
  stage: SceneStageId;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
}

export function SceneCoreMvpPlaceholder({
  projectDir,
  stage,
  onSubmitted,
  onError,
}: SceneCoreMvpPlaceholderProps) {
  const keys = CORE_MVP_KEYS[stage as keyof typeof CORE_MVP_KEYS];
  if (!keys) {
    return null;
  }

  const label = CORE_STAGE_LABEL[stage as keyof typeof CORE_STAGE_LABEL];

  const handleFill = async () => {
    if (!projectDir || !window.electronAPI?.sceneSubmitStageDraft) {
      onError?.('请先打开 SceneForge 项目目录。');
      return;
    }
    if (
      !window.confirm(
        `将写入 ${keys.length} 个${label}核心产物的 MVP 占位 Markdown，仅用于测试校验流程。继续？`,
      )
    ) {
      return;
    }
    try {
      const result = await window.electronAPI.sceneSubmitStageDraft({
        projectDir,
        stage: stage as 'design' | 'storyboard' | 'video_prompts',
        artifacts: keys.map((artifactKey) => ({
          artifactKey,
          content: placeholderBodyForStage(stage as 'design' | 'storyboard' | 'video_prompts'),
        })),
      });
      if (result.validation.status === 'failed') {
        onError?.(result.validation.errors[0]?.message ?? '校验未通过');
      } else {
        onSubmitted?.();
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '提交失败');
    }
  };

  return (
    <div className={styles.root} data-testid={`scene-${stage}-mvp-placeholder`}>
      <Button type="button" variant="secondary" size="sm" onClick={() => void handleFill()}>
        填充 MVP 占位（测试用）
      </Button>
      <p className={styles.hint}>
        无 LLM 时可一键写入 {keys.length} 个{label}核心产物占位内容。
      </p>
    </div>
  );
}