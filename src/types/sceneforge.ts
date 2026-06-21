export const SCENE_CORE_STAGES = ['design', 'storyboard', 'video_prompts'] as const;

export const SCENE_STAGE_IDS = [
  'source_intake',
  'topic_gate',
  'reference',
  'story',
  'assets',
  'design',
  'script',
  'performance',
  'storyboard',
  'audio',
  'video_prompts',
  'publish',
] as const;

export const SCENE_ENTRY_PATHS = ['source_intake', 'topic_gate'] as const;

export type SceneEntryPath = (typeof SCENE_ENTRY_PATHS)[number];

export const SCENE_APPROVAL_POLICIES = ['required', 'optional', 'auto_if_valid', 'skip'] as const;

export type SceneStageId = (typeof SCENE_STAGE_IDS)[number];
export type SceneApprovalPolicy = (typeof SCENE_APPROVAL_POLICIES)[number];

export function isSceneApprovalPolicy(value: unknown): value is SceneApprovalPolicy {
  return typeof value === 'string' && SCENE_APPROVAL_POLICIES.includes(value as SceneApprovalPolicy);
}

export type SceneStageStatus =
  | 'ready'
  | 'in_progress'
  | 'draft_submitted'
  | 'validation_failed'
  | 'validated'
  | 'waiting_approval'
  | 'approved'
  | 'revision_requested'
  | 'completed'
  | 'skipped';

export interface SceneCoreArtifactRefs {
  design: string | null;
  storyboard: string | null;
  videoPrompts: string | null;
}

export interface SceneProjectMeta {
  version: 1;
  projectRoot: 'sceneforge';
  pipelineId: 'reference_remake' | 'original_scene' | 'prompt_pack_only';
  /** 创建时选择的项目起点；缺省 topic_gate */
  entryPath?: SceneEntryPath;
  /** 项目级视觉风格；用于跨阶段稳定复用，不绑定单次运行。 */
  selectedStyleProfileId?: string | null;
  /** 项目级参考资产；只保存显式选择的 registry asset ids。 */
  selectedAssetIds?: string[];
  currentStage: SceneStageId | null;
  status: 'ready' | 'in_progress' | 'completed';
  coreArtifacts: SceneCoreArtifactRefs;
  lastExportPath: string | null;
}

export type SceneArtifactCopyTarget = 'full' | 'section' | 'prompt';

export type SceneArtifactDisplaySectionKind = 'overview' | 'section' | 'prompt';

export interface SceneArtifactDisplaySection {
  id: string;
  title: string;
  kind: SceneArtifactDisplaySectionKind;
  copyBlockIds: string[];
}

export interface SceneArtifactCopyBlock {
  id: string;
  label: string;
  target: SceneArtifactCopyTarget;
  format: 'plain_text';
  text: string;
}

export interface SceneArtifactDisplayWarning {
  code: string;
  message: string;
}

export interface SceneArtifactDisplayModel {
  artifactId: string;
  displayModelVersion: 1;
  title: string;
  summary: string;
  sections: SceneArtifactDisplaySection[];
  copyBlocks: SceneArtifactCopyBlock[];
  warnings: SceneArtifactDisplayWarning[];
}

export const SCENE_ARTIFACT_COPY_TARGETS: SceneArtifactCopyTarget[] = ['full', 'section', 'prompt'];

export const SCENE_CORE_DISPLAY_ARTIFACT_KEYS: Record<
  (typeof SCENE_CORE_STAGES)[number],
  string[]
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
  video_prompts: ['video_prompt_pack', 'video_prompt_pack_cn', 'video_prompt_review', 'video_prompt_trace', 'video_prompt_pack_en'],
};
