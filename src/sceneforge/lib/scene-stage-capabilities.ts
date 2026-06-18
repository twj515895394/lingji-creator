import type { SceneStageId } from '../../types/sceneforge';

export type SceneStageReadiness = 'studio' | 'agent' | 'planned';

export type SceneWorkspaceTemplateId =
  | 'core'
  | 'intake'
  | 'gate'
  | 'support'
  | 'export';

const STUDIO_READY_STAGES = new Set<SceneStageId>([
  'design',
  'storyboard',
  'video_prompts',
  'source_intake',
  'topic_gate',
  'reference',
  'story',
  'assets',
  'script',
  'performance',
  'audio',
]);

export function getStageReadiness(stageId: SceneStageId): SceneStageReadiness {
  if (STUDIO_READY_STAGES.has(stageId)) {
    return 'studio';
  }
  if (stageId === 'source_intake' || stageId === 'topic_gate') {
    return 'studio';
  }
  if (stageId === 'export') {
    return 'planned';
  }
  return 'agent';
}

export function getWorkspaceTemplateForStage(stageId: SceneStageId): SceneWorkspaceTemplateId {
  if (stageId === 'source_intake') {
    return 'intake';
  }
  if (stageId === 'topic_gate') {
    return 'gate';
  }
  if (stageId === 'reference' || stageId === 'story' || stageId === 'assets') {
    return 'support';
  }
  if (stageId === 'script' || stageId === 'performance' || stageId === 'audio') {
    return 'support';
  }
  if (stageId === 'export') {
    return 'export';
  }
  if (STUDIO_READY_STAGES.has(stageId)) {
    return 'core';
  }
  return 'support';
}

export function readinessLabel(readiness: SceneStageReadiness): string {
  switch (readiness) {
    case 'studio':
      return '工坊';
    case 'agent':
      return 'Agent';
    case 'planned':
      return 'P0';
    default:
      return '';
  }
}