import { describe, expect, it } from 'vitest';
import {
  getRecommendedStartStage,
  getStageDependencyBlockReason,
  getStageNavBlockReason,
  isStageDependencySatisfied,
  normalizeSceneEntryPath,
} from '../src/sceneforge/lib/scene-entry-path';

describe('scene-entry-path', () => {
  it('defaults unknown entryPath to topic_gate', () => {
    expect(normalizeSceneEntryPath(undefined)).toBe('topic_gate');
    expect(normalizeSceneEntryPath('invalid')).toBe('topic_gate');
  });

  it('recommends start stage from entryPath', () => {
    expect(getRecommendedStartStage('source_intake')).toBe('source_intake');
    expect(getRecommendedStartStage('topic_gate')).toBe('topic_gate');
  });

  it('allows topic_gate entry to skip source_intake dependency', () => {
    const completed = new Set<import('../src/types/sceneforge').SceneStageId>();
    expect(isStageDependencySatisfied('topic_gate', completed, 'topic_gate')).toBe(true);
    expect(isStageDependencySatisfied('topic_gate', completed, 'source_intake')).toBe(false);
  });

  it('blocks reference until topic_gate done when intake path', () => {
    const completed = new Set<import('../src/types/sceneforge').SceneStageId>(['source_intake']);
    expect(getStageDependencyBlockReason('reference', completed, 'source_intake')).toMatch(
      /选题闸门/,
    );
  });

  it('blocks reference when gate style not confirmed', () => {
    const completed = new Set<import('../src/types/sceneforge').SceneStageId>(['topic_gate']);
    const reason = getStageNavBlockReason('reference', completed, 'topic_gate', {
      topicBrief: '# brief',
      gateConfirmations: null,
    });
    expect(reason).toMatch(/风格确认/);
  });
});