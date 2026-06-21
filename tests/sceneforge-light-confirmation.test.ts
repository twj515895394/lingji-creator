import { describe, expect, it } from 'vitest';
import { shouldAutoAdvanceAfterSupportSubmit } from '../src/sceneforge/lib/scene-light-confirmation';

describe('SceneForge light confirmation', () => {
  it('auto-advances non-core support submit stages when policy is not required', () => {
    expect(shouldAutoAdvanceAfterSupportSubmit('reference', 'optional')).toBe(true);
    expect(shouldAutoAdvanceAfterSupportSubmit('story', 'auto_if_valid')).toBe(true);
    expect(shouldAutoAdvanceAfterSupportSubmit('audio', 'skip')).toBe(true);
  });

  it('keeps required approval on support stages as manual confirmation', () => {
    expect(shouldAutoAdvanceAfterSupportSubmit('reference', 'required')).toBe(false);
    expect(shouldAutoAdvanceAfterSupportSubmit('performance', 'required')).toBe(false);
  });

  it('does not auto-advance source intake, topic gate, or core stages', () => {
    expect(shouldAutoAdvanceAfterSupportSubmit('source_intake', 'optional')).toBe(false);
    expect(shouldAutoAdvanceAfterSupportSubmit('topic_gate', 'optional')).toBe(false);
    expect(shouldAutoAdvanceAfterSupportSubmit('storyboard', 'optional')).toBe(false);
  });
});
