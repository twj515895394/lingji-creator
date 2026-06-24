import { describe, expect, it } from 'vitest';
import { MOCK_CREATION_WORKSPACE_SNAPSHOT } from '../src/sceneforge/remix/mock/mock-data';
import {
  buildCreationPublishChecklist,
  isPromptBundleReady,
} from '../src/sceneforge/remix/lib/remix-workspace-view-model';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('SceneForge Remix publish checklist', () => {
  it('requires all mandatory edited keyframes to be approved before bundle export is ready', () => {
    const snapshot = clone(MOCK_CREATION_WORKSPACE_SNAPSHOT);
    snapshot.keyframeEditPrompts = [
      {
        ...snapshot.keyframeEditPrompts[0],
        id: 'prompt-1',
        segmentId: 'segment-l-001',
        frameRole: 'first',
      },
      {
        ...snapshot.keyframeEditPrompts[1],
        id: 'prompt-2',
        segmentId: 'segment-l-002',
        frameRole: 'last',
      },
    ];
    snapshot.editedKeyframes = [
      {
        ...snapshot.editedKeyframes[0],
        segmentId: 'segment-l-001',
        frameRole: 'first',
        status: 'approved',
      },
      {
        ...snapshot.editedKeyframes[1],
        segmentId: 'segment-l-002',
        frameRole: 'last',
        status: 'needs_revision',
      },
    ];

    const checklist = buildCreationPublishChecklist(snapshot);
    expect(checklist.find((item) => item.id === 'edited-reviewed')?.passed).toBe(false);
    expect(isPromptBundleReady(checklist)).toBe(false);

    snapshot.editedKeyframes[1].status = 'approved';
    snapshot.creationStageStates.remix_strategy = 'approved';
    snapshot.creationStageStates.remix_design = 'approved';
    snapshot.seedancePrompts = [snapshot.seedancePrompts[0]];

    const readyChecklist = buildCreationPublishChecklist(snapshot);
    expect(readyChecklist.find((item) => item.id === 'edited-reviewed')?.passed).toBe(true);
  });
});
