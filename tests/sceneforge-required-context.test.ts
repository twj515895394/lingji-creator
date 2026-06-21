import { describe, expect, it } from 'vitest';
import {
  formatMissingRequiredInputsMessage,
  hasBlockingMissingRequiredInputs,
  listMissingRequiredStageInputs,
  normalizeRequiredInputsForBlocking,
} from '../src/sceneforge/lib/scene-required-context';

function ctx(requiredInputs: Parameters<typeof listMissingRequiredStageInputs>[0]['requiredInputs']) {
  return { requiredInputs };
}

describe('scene required context blocking', () => {
  it('blocks when a required input is not satisfied', () => {
    const context = ctx([
      {
        id: 'story_direction',
        fromStage: 'story',
        artifactKey: 'story_direction',
        satisfied: false,
      },
    ]);
    expect(listMissingRequiredStageInputs(context)).toEqual([
      {
        id: 'story_direction',
        fromStage: 'story',
        artifactKey: 'story_direction',
      },
    ]);
    expect(hasBlockingMissingRequiredInputs(context)).toBe(true);
  });

  it('does not block when all required inputs are satisfied', () => {
    expect(
      hasBlockingMissingRequiredInputs(
        ctx([
          {
            id: 'story_direction',
            fromStage: 'story',
            artifactKey: 'story_direction',
            satisfied: true,
          },
        ]),
      ),
    ).toBe(false);
  });

  it('formats a Chinese message for Studio', () => {
    const msg = formatMissingRequiredInputsMessage([
      { id: 'story_direction', fromStage: 'story', artifactKey: 'story_direction' },
    ]);
    expect(msg).toContain('无法运行');
    expect(msg).toContain('story');
    expect(msg).toContain('story_direction');
  });

  it('normalizes IPC requiredInputs with satisfied flags', () => {
    const normalized = normalizeRequiredInputsForBlocking([
      {
        policyInputId: 'script_draft',
        fromStage: 'script',
        artifactKey: 'script_draft',
        satisfied: false,
      },
      {
        policyInputId: 'design_master',
        fromStage: 'design',
        artifactKey: 'master_reference_prompt',
        satisfied: true,
      },
    ]);
    expect(hasBlockingMissingRequiredInputs({ requiredInputs: normalized })).toBe(true);
    expect(listMissingRequiredStageInputs({ requiredInputs: normalized })).toEqual([
      { id: 'script_draft', fromStage: 'script', artifactKey: 'script_draft' },
    ]);
  });
});