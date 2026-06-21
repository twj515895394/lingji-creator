const SCENE_ARTIFACT_LABELS: Record<string, string> = {
  source_material: '源材料',
  topic_brief: '选题简报',
  gate_confirmations: '选题闸门确认',
  reference_notes: '参考分析笔记',
  story_direction: '故事方向',
  asset_plan: '资产规划',
  design_prompts: '设定总览提示词',
  character_prompts: '角色说明书板提示词',
  scene_prompts: '全场景资产总参考图提示词',
  prop_prompts: '核心道具与状态矩阵提示词',
  master_reference_prompt: '总参考锚点提示词',
  script_draft: '剧本草案',
  performance_direction: '表演指导',
  storyboard_prompt_pack: '分镜提示词包',
  control_board_prompts: '控制板提示词',
  style_board_prompts: '风格板提示词',
  master_board_prompt: '总分镜板提示词',
  audio_design: '声音设计',
  video_prompt_pack: '视频提示词包',
  video_prompt_pack_cn: '中文视频提示词包',
  video_prompt_review: '视频提示词审查记录',
  video_prompt_trace: '视频提示词溯源记录',
  video_prompt_pack_en: '英文视频提示词包',
};

export function getSceneArtifactLabel(artifactKey: string): string {
  return SCENE_ARTIFACT_LABELS[artifactKey] ?? artifactKey;
}

export function getSceneArtifactDisplayLabel(artifactKey: string): string {
  const label = getSceneArtifactLabel(artifactKey);
  return label === artifactKey ? artifactKey : `${label} (${artifactKey})`;
}
