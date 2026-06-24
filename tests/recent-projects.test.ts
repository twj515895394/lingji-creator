import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addRecentProject, refreshRecentProjects } from '../electron/recent-projects';

let userDataPath: string;
let projectDir: string;

beforeEach(async () => {
  userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'recent-projects-userdata-'));
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recent-projects-project-'));
});

afterEach(async () => {
  await fs.rm(userDataPath, { recursive: true, force: true });
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('recent projects identity', () => {
  it('stores explicit remix project identity when adding a recent project', async () => {
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify({
        version: 1,
        createdAt: '2026-06-24T10:00:00.000Z',
        updatedAt: '2026-06-24T10:00:00.000Z',
        timeline: null,
        aiAnalysis: { analysisResult: null, coverCandidates: [] },
        script: {
          templateId: 'news-broadcast',
          annotations: [],
          reviewState: 'idle',
          lastReviewedDocVersion: 0,
        },
      }),
      'utf-8',
    );

    const projects = await addRecentProject(userDataPath, projectDir, 'remix-demo', {
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
    });

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      path: projectDir,
      name: 'remix-demo',
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
    });
  });

  it('keeps remix identity after refreshing recent projects', async () => {
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify({
        version: 1,
        createdAt: '2026-06-24T10:00:00.000Z',
        updatedAt: '2026-06-24T10:05:00.000Z',
        timeline: null,
        aiAnalysis: { analysisResult: null, coverCandidates: [] },
        script: {
          templateId: 'news-broadcast',
          annotations: [],
          reviewState: 'idle',
          lastReviewedDocVersion: 0,
        },
      }),
      'utf-8',
    );

    await addRecentProject(userDataPath, projectDir, 'remix-demo', {
      projectKind: 'remix',
      remixEntryIntent: 'creation',
      remixRoutePath: '/remix/projects/variant-001',
    });

    const refreshed = await refreshRecentProjects(userDataPath);

    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]).toMatchObject({
      path: projectDir,
      projectKind: 'remix',
      remixEntryIntent: 'creation',
      remixRoutePath: '/remix/projects/variant-001',
      updatedAt: '2026-06-24T10:05:00.000Z',
    });
  });
});
