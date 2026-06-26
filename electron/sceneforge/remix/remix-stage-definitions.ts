import type { SceneApprovalPolicy } from '../../../src/types/sceneforge';
import type { SceneStageCategory } from '../pipeline/scene-stage-definitions';
import type { RemixStageId } from '../../../src/sceneforge/remix/types';

export interface RemixStageDefinition {
  id: RemixStageId;
  displayName: string;
  category: SceneStageCategory;
  dependencies: RemixStageId[];
  defaultApprovalPolicy: SceneApprovalPolicy;
  requiredArtifacts: string[];
}

export const REMIX_STAGE_DEFINITIONS: RemixStageDefinition[] = [
  {
    id: 'remix_source_import',
    displayName: 'Remix Source Import',
    category: 'support',
    dependencies: [],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['source_manifest', 'source_video', 'source_srt'],
  },
  {
    id: 'remix_segmentation',
    displayName: 'Remix Segmentation',
    category: 'support',
    dependencies: ['remix_source_import'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['segment_manifest_index', 'source_clips'],
  },
  {
    id: 'remix_keyframes',
    displayName: 'Remix Keyframes',
    category: 'support',
    dependencies: ['remix_segmentation'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['keyframe_manifest_index', 'source_keyframes'],
  },
  {
    id: 'remix_understanding',
    displayName: 'Remix Understanding',
    category: 'support',
    dependencies: ['remix_keyframes'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['source_overview', 'segment_analysis', 'original_understanding'],
  },
  {
    id: 'remix_strategy',
    displayName: 'Remix Strategy',
    category: 'core',
    dependencies: ['remix_understanding'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['remix_strategy', 'segment_adaptations'],
  },
  {
    id: 'remix_design',
    displayName: 'Remix Design',
    category: 'core',
    dependencies: ['remix_strategy'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['global_design', 'segment_design_overrides'],
  },
  {
    id: 'remix_keyframe_edit_prompts',
    displayName: 'Remix Keyframe Edit Prompts',
    category: 'core',
    dependencies: ['remix_design'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['global_keyframe_edit_rules', 'segment_keyframe_edit_prompts'],
  },
  {
    id: 'edited_keyframes_review',
    displayName: 'Edited Keyframes Review',
    category: 'core',
    dependencies: ['remix_keyframe_edit_prompts'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['edited_keyframe_manifest'],
  },
  {
    id: 'remix_video_prompts',
    displayName: 'Remix Video Prompts',
    category: 'core',
    dependencies: ['edited_keyframes_review'],
    defaultApprovalPolicy: 'required',
    requiredArtifacts: ['global_seedance_rules', 'segment_seedance_prompts', 'audio_plan'],
  },
  {
    id: 'remix_publish',
    displayName: 'Remix Publish',
    category: 'support',
    dependencies: ['remix_video_prompts'],
    defaultApprovalPolicy: 'optional',
    requiredArtifacts: ['prompt_bundle_manifest'],
  },
];

const STAGE_DEFINITION_MAP = new Map(
  REMIX_STAGE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const STAGE_ORDER_MAP = new Map(
  REMIX_STAGE_DEFINITIONS.map((definition, index) => [definition.id, index + 1]),
);

export function isRemixStageId(value: unknown): value is RemixStageId {
  return typeof value === 'string' && STAGE_DEFINITION_MAP.has(value as RemixStageId);
}

export function getRemixStageDefinition(stage: RemixStageId): RemixStageDefinition {
  const found = STAGE_DEFINITION_MAP.get(stage);
  if (!found) {
    throw new Error(`Unknown SceneForge Remix stage: ${stage}`);
  }
  return found;
}

export function getRemixStageOrder(stage: RemixStageId): number {
  const found = STAGE_ORDER_MAP.get(stage);
  if (!found) {
    throw new Error(`Unknown SceneForge Remix stage order: ${stage}`);
  }
  return found;
}
