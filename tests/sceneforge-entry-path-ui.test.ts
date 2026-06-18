import { describe, expect, it } from 'vitest';
import { getEntryPathStageAside } from '../src/sceneforge/lib/scene-entry-path-ui';

describe('scene-entry-path-ui', () => {
  it('marks source_intake skippable on topic_gate entry', () => {
    expect(getEntryPathStageAside('source_intake', 'topic_gate')).toBe('可跳过');
  });

  it('marks source_intake as recommended start on intake entry', () => {
    expect(getEntryPathStageAside('source_intake', 'source_intake')).toBe('推荐起点');
  });

  it('returns null for unrelated stages', () => {
    expect(getEntryPathStageAside('topic_gate', 'topic_gate')).toBeNull();
    expect(getEntryPathStageAside('design', 'source_intake')).toBeNull();
  });
});