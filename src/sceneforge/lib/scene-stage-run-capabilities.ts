import type { SceneStageId } from '../../types/sceneforge';
import type { SceneStageRunnerType } from '../../../electron/sceneforge/pipeline/scene-stage-runner';

export type SceneStageSubmitMode = 'core' | 'support' | 'none';
export type SceneDraftCommitStrategy = 'manual_submit_required' | 'auto_commit_if_generated';

export interface SceneStageRunCapability {
  stage: SceneStageId;
  runnerTypes: readonly SceneStageRunnerType[];
  submitMode: SceneStageSubmitMode;
  draftCommitStrategy: SceneDraftCommitStrategy;
}

const MANUAL_ONLY: readonly SceneStageRunnerType[] = ['manual_submit', 'acp_agent'];
const DIRECT_LLM: readonly SceneStageRunnerType[] = [
  'manual_submit',
  'direct_llm',
  'acp_agent',
];

const CAPABILITY_MAP = new Map<SceneStageId, SceneStageRunCapability>([
  ['source_intake', { stage: 'source_intake', runnerTypes: MANUAL_ONLY, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['topic_gate', { stage: 'topic_gate', runnerTypes: MANUAL_ONLY, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['reference', { stage: 'reference', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['story', { stage: 'story', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['assets', { stage: 'assets', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['design', { stage: 'design', runnerTypes: DIRECT_LLM, submitMode: 'core', draftCommitStrategy: 'manual_submit_required' }],
  ['script', { stage: 'script', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['performance', { stage: 'performance', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['storyboard', { stage: 'storyboard', runnerTypes: DIRECT_LLM, submitMode: 'core', draftCommitStrategy: 'manual_submit_required' }],
  ['audio', { stage: 'audio', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
  ['video_prompts', { stage: 'video_prompts', runnerTypes: DIRECT_LLM, submitMode: 'core', draftCommitStrategy: 'manual_submit_required' }],
  ['publish', { stage: 'publish', runnerTypes: DIRECT_LLM, submitMode: 'support', draftCommitStrategy: 'manual_submit_required' }],
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
