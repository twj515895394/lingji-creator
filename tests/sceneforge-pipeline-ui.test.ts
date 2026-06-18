import { describe, expect, it } from 'vitest';
import {
  buildScenePipelineGroups,
  listAllPipelineStageIds,
  SCENE_PIPELINE_GROUP_LABELS,
} from '../src/sceneforge/lib/scene-pipeline-ui';

describe('scene-pipeline-ui', () => {
  it('lists 13 engine stages', () => {
    expect(listAllPipelineStageIds()).toHaveLength(13);
  });

  it('groups stages into prep, production, delivery', () => {
    const groups = buildScenePipelineGroups();
    expect(groups.map((g) => g.id)).toEqual(['prep', 'production', 'delivery']);
    expect(groups[0].label).toBe(SCENE_PIPELINE_GROUP_LABELS.prep);
    expect(groups[0].stages).toHaveLength(5);
    expect(groups[1].stages).toHaveLength(5);
    expect(groups[2].stages).toHaveLength(3);
  });

  it('merges runtime status from project state', () => {
    const groups = buildScenePipelineGroups({ design: 'approved' });
    const design = groups
      .flatMap((g) => g.stages)
      .find((s) => s.definition.id === 'design');
    expect(design?.status).toBe('approved');
  });
});