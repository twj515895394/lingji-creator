import { describe, expect, it } from 'vitest';
import {
  getPreferredStageArtifactId,
  resolveStageArtifactSelection,
  shouldClearAutoSelectedStageArtifact,
} from '../src/sceneforge/lib/scene-artifact-selection';
import type { SceneArtifact } from '../src/lib/electron-api';

const ARTIFACTS: SceneArtifact[] = [
  {
    id: 'design.design_prompts',
    stage: 'design',
    kind: 'final',
    title: '设定图提示词',
    path: 'x',
    createdAt: '2026-06-18T00:00:00.000Z',
    coreAsset: true,
  },
  {
    id: 'design.scene_prompts',
    stage: 'design',
    kind: 'final',
    title: '场景提示词',
    path: 'x',
    createdAt: '2026-06-18T00:00:00.000Z',
    coreAsset: true,
  },
  {
    id: 'script.script_draft',
    stage: 'script',
    kind: 'final',
    title: '剧本草案',
    path: 'x',
    createdAt: '2026-06-18T00:00:00.000Z',
    coreAsset: false,
  },
];

describe('scene artifact selection', () => {
  it('prefers the primary core artifact for core stages', () => {
    expect(getPreferredStageArtifactId(ARTIFACTS, 'design')).toBe('design.design_prompts');
  });

  it('falls back to the first stage artifact for support stages', () => {
    expect(getPreferredStageArtifactId(ARTIFACTS, 'script')).toBe('script.script_draft');
  });

  it('keeps the current selection when it still belongs to the current stage', () => {
    expect(
      resolveStageArtifactSelection({
        artifacts: ARTIFACTS,
        stage: 'design',
        selectedArtifactId: 'design.scene_prompts',
      }),
    ).toBe('design.scene_prompts');
  });

  it('switches back to the preferred artifact when the current selection belongs to another stage', () => {
    expect(
      resolveStageArtifactSelection({
        artifacts: ARTIFACTS,
        stage: 'design',
        selectedArtifactId: 'script.script_draft',
      }),
    ).toBe('design.design_prompts');
  });

  it('clears the default stage artifact selection when the stage has a pending draft', () => {
    expect(
      shouldClearAutoSelectedStageArtifact({
        artifacts: ARTIFACTS,
        stage: 'script',
        selectedArtifactId: 'script.script_draft',
        hasPendingDraft: true,
        stageStatus: 'revision_requested',
      }),
    ).toBe(true);
  });

  it('keeps a manual non-default selection during revision mode', () => {
    expect(
      shouldClearAutoSelectedStageArtifact({
        artifacts: ARTIFACTS,
        stage: 'design',
        selectedArtifactId: 'design.scene_prompts',
        hasPendingDraft: true,
        stageStatus: 'revision_requested',
      }),
    ).toBe(false);
  });
});
