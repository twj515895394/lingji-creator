import type { SceneStageId } from '../../types/sceneforge';

export type PrepSupportSubmitStage =
  | 'reference'
  | 'story'
  | 'assets'
  | 'script'
  | 'performance'
  | 'audio';

/** gate 之后、design 之前的支撑链 MVP */
export const PREP_SUPPORT_SUBMIT_STAGES = new Set<PrepSupportSubmitStage>([
  'reference',
  'story',
  'assets',
]);

/** design 之后、storyboard 之前的制作链支撑 MVP */
export const PRODUCTION_SUPPORT_SUBMIT_STAGES = new Set<PrepSupportSubmitStage>([
  'script',
  'performance',
  'audio',
]);

export const MARKDOWN_SUPPORT_SUBMIT_STAGES = new Set<SceneStageId>([
  ...PREP_SUPPORT_SUBMIT_STAGES,
  ...PRODUCTION_SUPPORT_SUBMIT_STAGES,
]);

export interface PrepSupportStageConfig {
  artifactKey: string;
  artifactLabel: string;
  placeholder: string;
  lead: string;
}

export const PREP_SUPPORT_STAGE_CONFIG: Record<PrepSupportSubmitStage, PrepSupportStageConfig> = {
  reference: {
    artifactKey: 'reference_notes',
    artifactLabel: '参考分析笔记',
    lead: '填写参考片、风格包或分析要点，提交后写入产物库并自动校验。',
    placeholder: `# 参考分析

## 参考方向
## 风格包摘要
`,
  },
  story: {
    artifactKey: 'story_direction',
    artifactLabel: '故事方向',
    lead: '填写故事结构、改编方向或叙事要点，提交后自动校验。',
    placeholder: `# 故事方向

## 核心冲突
## 结构节拍
`,
  },
  assets: {
    artifactKey: 'asset_plan',
    artifactLabel: '资产规划',
    lead: '填写角色/场景/道具等资产规划要点，提交后自动校验。',
    placeholder: `# 资产规划

## 角色
## 场景
`,
  },
  script: {
    artifactKey: 'script_draft',
    artifactLabel: '剧本草案',
    lead: '填写剧本或口播稿要点（MVP 占位），提交后自动校验。',
    placeholder: `# 剧本草案

## 场次 / 段落
## 对白要点
`,
  },
  performance: {
    artifactKey: 'performance_direction',
    artifactLabel: '表演指导',
    lead: '填写节奏、语气、表演方向要点，提交后自动校验（storyboard 依赖本阶段）。',
    placeholder: `# 表演指导

## 节奏
## 语气与情绪
`,
  },
  audio: {
    artifactKey: 'audio_design',
    artifactLabel: '声音设计',
    lead: '填写 BGM / 音效规划要点，提交后自动校验（video_prompts 依赖本阶段）。',
    placeholder: `# 声音设计

## 音乐
## 音效
`,
  },
};

export function getPrepSupportConfig(stage: SceneStageId): PrepSupportStageConfig | null {
  if (isMarkdownSupportSubmitStage(stage)) {
    return PREP_SUPPORT_STAGE_CONFIG[stage];
  }
  return null;
}

export function isMarkdownSupportSubmitStage(
  stage: SceneStageId,
): stage is PrepSupportSubmitStage {
  return MARKDOWN_SUPPORT_SUBMIT_STAGES.has(stage);
}
