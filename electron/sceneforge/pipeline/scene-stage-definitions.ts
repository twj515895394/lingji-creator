import type { SceneApprovalPolicy, SceneStageId } from '../types';
import { SCENE_STAGE_IDS } from '../types';

export type SceneStageCategory = 'core' | 'support' | 'system';

export interface SceneStageDefinition {
  id: SceneStageId;
  displayName: string;
  category: SceneStageCategory;
  dependencies: SceneStageId[];
  defaultApprovalPolicy: SceneApprovalPolicy;
  requiredArtifacts: string[];
}

export const SCENE_STAGE_DEFINITIONS: SceneStageDefinition[] = [
  {
    id: 'source_intake',
    displayName: 'Source Intake',
    category: 'support',
    dependencies: [],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['source_material'],
  },
  {
    id: 'topic_gate',
    displayName: 'Topic Gate',
    category: 'support',
    dependencies: ['source_intake'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['topic_brief'],
  },
  {
    id: 'reference',
    displayName: 'Reference Analysis',
    category: 'support',
    dependencies: ['topic_gate'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['reference_notes'],
  },
  {
    id: 'story',
    displayName: 'Story Direction',
    category: 'support',
    dependencies: ['reference'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['story_direction'],
  },
  {
    id: 'assets',
    displayName: 'Asset Plan',
    category: 'support',
    dependencies: ['story'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['asset_plan'],
  },
  {
    id: 'design',
    displayName: 'Design Prompts',
    category: 'core',
    dependencies: ['assets'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: [
      'design_prompts',
      'character_prompts',
      'scene_prompts',
      'prop_prompts',
      'master_reference_prompt',
    ],
  },
  {
    id: 'script',
    displayName: 'Script',
    category: 'support',
    dependencies: ['design'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['script_draft'],
  },
  {
    id: 'performance',
    displayName: 'Performance Direction',
    category: 'support',
    dependencies: ['script'],
    defaultApprovalPolicy: 'auto_if_valid',
    requiredArtifacts: ['performance_direction'],
  },
  {
    id: 'storyboard',
    displayName: 'Storyboard Prompts',
    category: 'core',
    dependencies: ['design', 'performance'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: [
      'storyboard_prompt_pack',
      'control_board_prompts',
      'style_board_prompts',
      'master_board_prompt',
    ],
  },
  {
    id: 'audio',
    displayName: 'Audio Design',
    category: 'support',
    dependencies: ['storyboard'],
    defaultApprovalPolicy: 'auto_if_valid',
    requiredArtifacts: ['audio_design'],
  },
  {
    id: 'video_prompts',
    displayName: 'Video Prompt Packs',
    category: 'core',
    dependencies: ['design', 'storyboard', 'audio'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['video_prompt_pack', 'video_prompt_pack_cn'],
  },
  {
    id: 'publish',
    displayName: 'Publish Notes',
    category: 'support',
    dependencies: ['video_prompts'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['publish_notes'],
  },
  {
    id: 'export',
    displayName: 'Export Prompt Pack',
    category: 'system',
    dependencies: ['video_prompts'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['final_prompt_pack'],
  },
];

const STAGE_DEFINITION_MAP = new Map(
  SCENE_STAGE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function isSceneStageId(value: unknown): value is SceneStageId {
  return typeof value === 'string' && SCENE_STAGE_IDS.includes(value as SceneStageId);
}

export function getSceneStageDefinition(stage: SceneStageId): SceneStageDefinition {
  const found = STAGE_DEFINITION_MAP.get(stage);
  if (!found) {
    throw new Error(`Unknown SceneForge stage: ${stage}`);
  }
  return found;
}
