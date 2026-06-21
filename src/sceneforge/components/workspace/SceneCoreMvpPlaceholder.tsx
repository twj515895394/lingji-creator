import type { SceneStageId } from '../../../types/sceneforge';
import { Button } from '../../../ui';
import styles from './SceneCoreMvpPlaceholder.module.css';

const MVP_PLACEHOLDER_BODY = '# MVP 占位\n\n用于无 LLM 时测试 Validate/Continue。\n';

const VIDEO_MVP_PLACEHOLDER_BODY = `# MVP 占位

## video_prompt_pack_plan
本包覆盖控制故事板 Pack 01、风格故事板 Pack 01，对应 Segment 01。

## global_execution_preamble
继承上游锁定的角色数量、空间轴线、动作连续性和道具状态。

## 故事板关键帧参考规则
将"控制故事板 Pack 01"作为本段视频生成的顺序动作、镜头调度、空间关系和连续性主参考；将"风格故事板 Pack 01"作为角色渲染、场景质感、灯光影调、情绪氛围和最终画面质量辅助参考。

## 项目级全局锁定规则
- 主场景：测试场景
- 角色锁定：2 人
- 不重复角色：禁止增删角色
- 画面可读性：主体关系清晰
- 风格锁定：写实
- 灯光锁定：自然日光
- 负向边界：禁止海报化定格

## Segment 01

### Segment 01 技术控制说明
本段承接 VGU-01，continuity_in 为建立镜头，continuity_out 为动作落点。blocking 保持角色左右站位不漂移，prop state 维持关键道具连续，next_handoff 交给下一段反应镜头。

### segment_sound_execution
#### BGM
轻微底乐。

#### Foley-SFX
脚步与道具轻响。

#### Ambience
环境底噪。

#### Silence
关键动作前压低环境。

#### Voice
若上游已锁定人声，则保持同一说话人音色、呼吸与停顿习惯。

### Segment 01 导演长版提示词
Segment 总时间轴：00:00-00:06
C01 [00:00-00:03] 景别为广角建立镜头，机位平稳推进，构图明确主体关系，动作聚焦起势，情绪从建立推进到张力，道具状态保持连续，声音承接 BGM、Foley-SFX、Ambience 与 Voice，负向边界禁止角色漂移。
C02 [00:03-00:06] 景别切到中景，机位稳定逼近，构图锁定对峙关系，动作落在主要行为推进，情绪持续收紧，道具状态准备切入下一段，声音承接延续前段张力，负向边界禁止海报化定格。
`;

const VIDEO_REVIEW_MVP_PLACEHOLDER_BODY = `# 视频提示词审查记录

review_status: pass
review_round: 1
issues_found: 0
auto_fixes_applied: none
final_delivery_ready: true
`;

const VIDEO_TRACE_MVP_PLACEHOLDER_BODY = `# 视频提示词溯源记录

## actual_inputs_used
- storyboard.storyboard_prompt_pack
- audio.audio_design

## pack_mapping
- storyboard Pack 01 -> video Pack 01

## segment_trace
### Segment 01
- storyboard: Shot 01-02
- audio: BGM / Foley-SFX / Ambience / Silence

## optional_input_effectiveness
- design.design_prompts: effective

## continuity_sources
- 角色连续性：design.master_reference_prompt

## open_risks
- 无
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
  video_prompts: ['video_prompt_pack_cn', 'video_prompt_review', 'video_prompt_trace'],
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
          content:
            stage === 'video_prompts' && artifactKey === 'video_prompt_review'
              ? VIDEO_REVIEW_MVP_PLACEHOLDER_BODY
              : stage === 'video_prompts' && artifactKey === 'video_prompt_trace'
                ? VIDEO_TRACE_MVP_PLACEHOLDER_BODY
              : placeholderBodyForStage(stage as 'design' | 'storyboard' | 'video_prompts'),
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
