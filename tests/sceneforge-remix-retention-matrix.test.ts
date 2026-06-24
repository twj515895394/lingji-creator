import { describe, expect, it } from 'vitest';
import {
  getRetentionChoiceValue,
  getRetentionMatrixChoiceLabel,
  getRetentionMatrixValueIndex,
  RETENTION_MATRIX_DIMENSIONS,
} from '../src/sceneforge/remix/lib/remix-workspace-view-model';

describe('SceneForge Remix retention matrix helpers', () => {
  it('keeps the matrix fixed at nine dimensions', () => {
    expect(RETENTION_MATRIX_DIMENSIONS).toHaveLength(9);
    expect(RETENTION_MATRIX_DIMENSIONS.map((item) => item.key)).toEqual([
      'plotStructure',
      'characterRelationship',
      'dialogueMeaning',
      'dialogueRhythm',
      'performanceAction',
      'cameraComposition',
      'sceneEnvironment',
      'visualStyle',
      'memeMechanism',
    ]);
  });

  it('round-trips slider indexes and labels for representative choices', () => {
    expect(getRetentionMatrixValueIndex('plotStructure', 'rewrite')).toBe(2);
    expect(getRetentionChoiceValue('plotStructure', 1)).toBe('soft_keep');
    expect(getRetentionMatrixChoiceLabel('visualStyle', 'hybrid')).toBe('混合');
    expect(getRetentionChoiceValue('memeMechanism', 2)).toBe('replace_hot_meme');
  });
});
