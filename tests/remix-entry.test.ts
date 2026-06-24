import { describe, expect, it } from 'vitest';
import { decideRemixEntryPlan, remixEntryFailureMessage } from '../src/lib/remix-entry';
import type { ProjectData } from '../src/lib/project-persistence';

function shellProject(): ProjectData {
  return {
    version: 1,
    timeline: null,
    script: {
      templateId: 'news-broadcast',
      reviewState: 'idle',
      lastReviewedDocVersion: 0,
      annotations: [],
      doc: '',
    },
    aiAnalysis: { analysisResult: null, coverCandidates: [] },
  } as ProjectData;
}

describe('remix entry planning', () => {
  it('opens sceneforge project directly for both intents', () => {
    const projectData = { ...shellProject(), type: 'sceneforge' as const };
    expect(
      decideRemixEntryPlan({
        intent: 'creation',
        projectData,
        projectDir: '/tmp/sf',
        topLevelEntries: [{ name: 'project.json', type: 'file' }],
      }),
    ).toMatchObject({ kind: 'open', projectDir: '/tmp/sf' });
  });

  it('bootstraps untouched shell for asset ingestion', () => {
    expect(
      decideRemixEntryPlan({
        intent: 'asset-ingestion',
        projectData: shellProject(),
        projectDir: '/tmp/empty',
        topLevelEntries: [{ name: 'project.json', type: 'file' }],
      }).kind,
    ).toBe('bootstrap-then-open');
  });

  it('fails creation on non-sceneforge project', () => {
    expect(
      decideRemixEntryPlan({
        intent: 'creation',
        projectData: shellProject(),
        projectDir: '/tmp/script',
        topLevelEntries: [{ name: 'project.json', type: 'file' }],
      }),
    ).toEqual({ kind: 'fail', reason: 'creation-requires-sceneforge' });
  });

  it('maps failure reasons to user-facing copy', () => {
    expect(remixEntryFailureMessage('creation-requires-sceneforge')).toContain('SceneForge');
  });
});
