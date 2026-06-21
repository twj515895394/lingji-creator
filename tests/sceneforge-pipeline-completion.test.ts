import { describe, expect, it } from 'vitest';
import type { SceneState } from '../electron/sceneforge/pipeline/scene-state-machine';
import {
  auditPipelineStageCompletion,
  listStagesRequiredForProjectCompletion,
} from '../electron/sceneforge/pipeline/scene-pipeline-completion';
import type { SceneStageId } from '../src/types/sceneforge';

function stateWithStages(
  entries: Partial<Record<SceneStageId, import('../src/types/sceneforge').SceneStageStatus>>,
): SceneState {
  const stages: SceneState['stages'] = {};
  for (const [id, status] of Object.entries(entries)) {
    stages[id as SceneStageId] = {
      status: status!,
      artifactIds: [],
      validation: null,
      validatedAt: null,
      approvedAt: null,
      revisionNote: null,
    };
  }
  return {
    version: 1,
    pipelineId: 'reference_remake',
    currentStage: 'publish',
    status: 'in_progress',
    stages,
    coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
    updatedAt: '2026-06-21T00:00:00.000Z',
  };
}

describe('SceneForge pipeline completion audit', () => {
  it('excludes source_intake when entry path is topic_gate', () => {
    const required = listStagesRequiredForProjectCompletion('topic_gate');
    expect(required).not.toContain('source_intake');
    expect(required).toContain('publish');
  });

  it('fails audit when a core stage is not approved', () => {
    const audit = auditPipelineStageCompletion(
      stateWithStages({
        design: 'approved',
        storyboard: 'validated',
        video_prompts: 'approved',
        publish: 'completed',
      }),
      'topic_gate',
    );
    expect(audit.ok).toBe(false);
    expect(audit.stageAudits.find((item) => item.stage === 'storyboard')?.ok).toBe(false);
  });
});