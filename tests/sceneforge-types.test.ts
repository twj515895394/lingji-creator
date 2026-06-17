import { describe, expect, it } from 'vitest';
import {
  SCENE_APPROVAL_POLICIES,
  SCENE_CORE_STAGES,
  isSceneApprovalPolicy,
  type SceneProjectMeta,
} from '../src/types/sceneforge';
import type { ProjectData } from '../src/lib/project-persistence';

describe('sceneforge domain types', () => {
  it('defines core stages and approval policies', () => {
    expect(SCENE_CORE_STAGES).toEqual(['design', 'storyboard', 'video_prompts']);
    expect(SCENE_APPROVAL_POLICIES).toEqual(['required', 'optional', 'auto_if_valid', 'skip']);
    expect(isSceneApprovalPolicy('required')).toBe(true);
    expect(isSceneApprovalPolicy('invalid')).toBe(false);
  });

  it('allows ProjectData to carry optional SceneForge metadata', () => {
    const meta: SceneProjectMeta = {
      version: 1,
      projectRoot: 'sceneforge',
      pipelineId: 'reference_remake',
      currentStage: 'design',
      status: 'in_progress',
      coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
      lastExportPath: null,
    };
    const data = {
      version: 1,
      createdAt: '2026-06-16T00:00:00.000Z',
      updatedAt: '2026-06-16T00:00:00.000Z',
      type: 'sceneforge',
      timeline: null,
      aiAnalysis: { analysisResult: null, coverCandidates: [] },
      script: {
        templateId: 'news-broadcast',
        annotations: [],
        reviewState: 'idle',
        lastReviewedDocVersion: 0,
      },
      sceneforge: meta,
    } satisfies ProjectData;

    expect(data.sceneforge?.pipelineId).toBe('reference_remake');
  });
});
