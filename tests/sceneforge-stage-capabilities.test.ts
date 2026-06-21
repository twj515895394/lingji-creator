import { describe, expect, it } from 'vitest';
import { getSceneStageRunCapability } from '../src/sceneforge/lib/scene-stage-run-capabilities';
import { stageUsesFlowActions } from '../src/sceneforge/lib/scene-stage-capabilities';

describe('SceneForge stage run capabilities', () => {
  it('keeps draft refinement commit strategy fixed at the stage level', () => {
    expect(getSceneStageRunCapability('design').draftCommitStrategy).toBe(
      'manual_submit_required',
    );
    expect(getSceneStageRunCapability('reference').draftCommitStrategy).toBe(
      'manual_submit_required',
    );
    expect(getSceneStageRunCapability('publish').draftCommitStrategy).toBe(
      'manual_submit_required',
    );
  });

  it('keeps topic_gate inside the Validate / Continue flow action path', () => {
    expect(stageUsesFlowActions('topic_gate')).toBe(true);
    expect(stageUsesFlowActions('source_intake')).toBe(true);
    expect(stageUsesFlowActions('reference')).toBe(true);
    expect(stageUsesFlowActions('design')).toBe(false);
    expect(stageUsesFlowActions('storyboard')).toBe(false);
    expect(stageUsesFlowActions('video_prompts')).toBe(false);
    expect(stageUsesFlowActions('publish')).toBe(true);
  });
});
