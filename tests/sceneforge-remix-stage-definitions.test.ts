import { describe, expect, it } from 'vitest';
import {
  getRemixStageDefinition,
  getRemixStageOrder,
  isRemixStageId,
  REMIX_STAGE_DEFINITIONS,
} from '../electron/sceneforge/remix/remix-stage-definitions';

function assertAcyclic(): boolean {
  const graph = new Map(
    REMIX_STAGE_DEFINITIONS.map((definition) => [definition.id, definition.dependencies]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(stage: string): boolean {
    if (visited.has(stage)) {
      return true;
    }
    if (visiting.has(stage)) {
      return false;
    }
    visiting.add(stage);
    for (const dependency of graph.get(stage) ?? []) {
      if (!visit(dependency)) {
        return false;
      }
    }
    visiting.delete(stage);
    visited.add(stage);
    return true;
  }

  return REMIX_STAGE_DEFINITIONS.every((definition) => visit(definition.id));
}

describe('sceneforge remix stage definitions', () => {
  it('defines a single acyclic long-running Remix stage chain', () => {
    expect(REMIX_STAGE_DEFINITIONS).toHaveLength(10);
    expect(assertAcyclic()).toBe(true);
    expect(REMIX_STAGE_DEFINITIONS.every((definition) => definition.requiredArtifacts.length > 0)).toBe(true);
  });

  it('exposes runtime helpers for id checks and ordering', () => {
    expect(isRemixStageId('remix_design')).toBe(true);
    expect(isRemixStageId('remix_variant_create')).toBe(false);
    expect(getRemixStageDefinition('remix_video_prompts').dependencies).toEqual([
      'edited_keyframes_review',
    ]);
    expect(getRemixStageOrder('remix_publish')).toBe(10);
  });
});
