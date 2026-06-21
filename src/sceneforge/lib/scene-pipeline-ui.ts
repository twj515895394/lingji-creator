/**
 * Renderer-safe mirror of electron/sceneforge/pipeline/scene-stage-definitions.ts
 * Keep ids, categories, dependencies, and display names in sync when engine changes.
 */
import type { SceneApprovalPolicy, SceneStageId } from '../../types/sceneforge';

export type ScenePipelineGroupId = 'prep' | 'production' | 'delivery';

export type SceneStageCategory = 'core' | 'support' | 'system';

export interface SceneStageDefinitionLite {
  id: SceneStageId;
  displayName: string;
  titleZh: string;
  category: SceneStageCategory;
  groupId: ScenePipelineGroupId;
  dependencies: SceneStageId[];
  defaultApprovalPolicy: SceneApprovalPolicy;
}

export const SCENE_PIPELINE_GROUP_LABELS: Record<ScenePipelineGroupId, string> = {
  prep: '前期',
  production: '制作',
  delivery: '交付',
};

const STAGE_ROWS: SceneStageDefinitionLite[] = [
  {
    id: 'source_intake',
    displayName: 'Source Intake',
    titleZh: '源视频解析',
    category: 'support',
    groupId: 'prep',
    dependencies: [],
    defaultApprovalPolicy: 'optional',
  },
  {
    id: 'topic_gate',
    displayName: 'Topic Gate',
    titleZh: '选题闸门',
    category: 'support',
    groupId: 'prep',
    dependencies: ['source_intake'],
    defaultApprovalPolicy: 'optional',
  },
  {
    id: 'reference',
    displayName: 'Reference Analysis',
    titleZh: '参考分析',
    category: 'support',
    groupId: 'prep',
    dependencies: ['topic_gate'],
    defaultApprovalPolicy: 'optional',
  },
  {
    id: 'story',
    displayName: 'Story Direction',
    titleZh: '故事方向',
    category: 'support',
    groupId: 'prep',
    dependencies: ['reference'],
    defaultApprovalPolicy: 'optional',
  },
  {
    id: 'assets',
    displayName: 'Asset Plan',
    titleZh: '资产规划',
    category: 'support',
    groupId: 'prep',
    dependencies: ['story'],
    defaultApprovalPolicy: 'optional',
  },
  {
    id: 'design',
    displayName: 'Design Prompts',
    titleZh: '设定图提示词',
    category: 'core',
    groupId: 'production',
    dependencies: ['assets'],
    defaultApprovalPolicy: 'required',
  },
  {
    id: 'script',
    displayName: 'Script',
    titleZh: '剧本',
    category: 'support',
    groupId: 'production',
    dependencies: ['design'],
    defaultApprovalPolicy: 'optional',
  },
  {
    id: 'performance',
    displayName: 'Performance Direction',
    titleZh: '表演指导',
    category: 'support',
    groupId: 'production',
    dependencies: ['script'],
    defaultApprovalPolicy: 'auto_if_valid',
  },
  {
    id: 'storyboard',
    displayName: 'Storyboard Prompts',
    titleZh: '分镜提示词',
    category: 'core',
    groupId: 'production',
    dependencies: ['design', 'performance'],
    defaultApprovalPolicy: 'required',
  },
  {
    id: 'audio',
    displayName: 'Audio Design',
    titleZh: '声音设计',
    category: 'support',
    groupId: 'production',
    dependencies: ['storyboard'],
    defaultApprovalPolicy: 'auto_if_valid',
  },
  {
    id: 'video_prompts',
    displayName: 'Video model prompts',
    titleZh: '视频提示词',
    category: 'core',
    groupId: 'delivery',
    dependencies: ['design', 'storyboard', 'audio'],
    defaultApprovalPolicy: 'required',
  },
  {
    id: 'publish',
    displayName: 'Publish deliverables',
    titleZh: '发布说明',
    category: 'support',
    groupId: 'delivery',
    dependencies: ['video_prompts'],
    defaultApprovalPolicy: 'optional',
  },
];

export const SCENE_STAGE_DEFINITIONS_LITE = STAGE_ROWS;

export function getSceneStageDefinitionLite(stage: SceneStageId): SceneStageDefinitionLite {
  const found = STAGE_ROWS.find((row) => row.id === stage);
  if (!found) {
    throw new Error(`Unknown SceneForge stage: ${stage}`);
  }
  return found;
}

export type ScenePipelineStageStatus = import('../../types/sceneforge').SceneStageStatus;

export interface ScenePipelineStageItem {
  definition: SceneStageDefinitionLite;
  status: ScenePipelineStageStatus;
}

export interface ScenePipelineGroup {
  id: ScenePipelineGroupId;
  label: string;
  stages: ScenePipelineStageItem[];
}

export function buildScenePipelineGroups(
  stageStatuses: Partial<Record<SceneStageId, ScenePipelineStageStatus>> = {},
): ScenePipelineGroup[] {
  const groupOrder: ScenePipelineGroupId[] = ['prep', 'production', 'delivery'];
  const buckets = new Map<ScenePipelineGroupId, ScenePipelineStageItem[]>();
  for (const id of groupOrder) {
    buckets.set(id, []);
  }

  for (const definition of STAGE_ROWS) {
    const status = stageStatuses[definition.id] ?? 'ready';
    buckets.get(definition.groupId)?.push({ definition, status });
  }

  return groupOrder.map((id) => ({
    id,
    label: SCENE_PIPELINE_GROUP_LABELS[id],
    stages: buckets.get(id) ?? [],
  }));
}

export function listAllPipelineStageIds(): SceneStageId[] {
  return STAGE_ROWS.map((row) => row.id);
}