import { describe, expect, it } from 'vitest';
import { getNextPipelineStage } from '../src/sceneforge/lib/scene-stage-nav';

describe('scene-stage-nav', () => {
  it('returns reference after topic_gate', () => {
    expect(getNextPipelineStage('topic_gate')).toBe('reference');
  });
});