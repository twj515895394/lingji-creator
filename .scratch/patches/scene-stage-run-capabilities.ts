import type { SceneStageId } from '../../types/sceneforge';
import type { SceneStageRunnerType } from '../../../electron/sceneforge/pipeline/scene-stage-runner';

export type SceneStageSubmitMode = 'core' | 'support' | 'none';

export interface SceneStageRunCapability {
  stage: SceneStageId;
  runnerTypes: readonly SceneStageRunnerType[];
  submitMode: SceneStageSubmitMode;
}

const MANUAL_ONLY: readonly SceneStageRunnerType[] = ['manual_submit', 'acp_agent'];
const DIRECT_LLM: readonly SceneStageRunnerType[] = [
  'manual_submit',
  'direct_llm',
  'acp_agent',
];

const CAPABILITY_MAP = new Map<SceneStageId, SceneStageRunCapability>([
  ['source_intake', { stage: 'source_intake', runnerTypes: MANUAL_ONLY, submitMode: 'support' }],
  ['topic_gate', { stage: 'topic_gate', runnerTypes: MANUAL_ONLY, submitMode: 'support' }],
  ['reference', { stage: 'reference', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
  ['story', { stage: 'story', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
  ['assets', { stage: 'assets', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
  ['design', { stage: 'design', runnerTypes: DIRECT_LLM, submitMode: 'core' }],
  ['script', { stage: 'script', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
  ['performance', { stage: 'performance', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
  ['storyboard', { stage: 'storyboard', runnerTypes: DIRECT_LLM, submitMode: 'core' }],
  ['audio', { stage: 'audio', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
  ['video_prompts', { stage: 'video_prompts', runnerTypes: DIRECT_LLM, submitMode: 'core' }],
  ['publish', { stage: 'publish', runnerTypes: MANUAL_ONLY, submitMode: 'none' }],
  ['export', { stage: 'export', runnerTypes: MANUAL_ONLY, submitMode: 'none' }],
]);

export function getSceneStageRunCapability(stage: SceneStageId): SceneStageRunCapability {
  const capability = CAPABILITY_MAP.get(stage);
  if (!capability) {
    throw new Error(`Unknown SceneForge stage capability: ${stage}`);
  }
  return capability;
}

export function stageSupportsRunner(
  stage: SceneStageId,
  runnerType: SceneStageRunnerType,
): boolean {
  return getSceneStageRunCapability(stage).runnerTypes.includes(runnerType);
}