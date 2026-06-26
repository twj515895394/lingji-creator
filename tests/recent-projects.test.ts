import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addRecentProject, refreshRecentProjects } from '../electron/recent-projects';

let userDataPath: string;
let projectDir: string;

function baseProject(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

async function writeProject(data: unknown) {
  await fs.writeFile(
    path.join(projectDir, 'project.json'),
    JSON.stringify(data),
    'utf-8',
  );
}

beforeEach(async () => {
  userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'recent-projects-userdata-'));
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recent-projects-project-'));
});

afterEach(async () => {
  await fs.rm(userDataPath, { recursive: true, force: true });
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('recent projects identity', () => {
  it('does not let explicit remix identity override a script project', async () => {
    await writeProject(baseProject());

    const projects = await addRecentProject(userDataPath, projectDir, 'script-demo', {
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
      remixRoutePath: '/remix/assets',
    });

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      path: projectDir,
      name: 'script-demo',
      projectKind: 'script',
      remixEntryIntent: null,
      remixRoutePath: null,
    });
  });

  it('repairs a stale remix cache entry for a normal SceneForge project', async () => {
    await writeProject(baseProject({
      type: 'sceneforge',
      sceneforge: {
        version: 1,
        projectRoot: 'sceneforge',
        pipelineId: 'original_scene',
        entryPath: 'topic_gate',
        selectedStyleProfileId: null,
        selectedAssetIds: [],
        currentStage: 'topic_gate',
        status: 'ready',
        coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
        lastExportPath: null,
      },
    }));

    await fs.mkdir(userDataPath, { recursive: true });
    await fs.writeFile(
      path.join(userDataPath, 'recent-projects.json'),
      JSON.stringify([
        {
          path: projectDir,
          name: 'scene-demo',
          lastOpenedAt: 1,
          projectKind: 'remix',
          remixEntryIntent: 'asset-ingestion',
          remixRoutePath: '/remix/assets',
        },
      ]),
      'utf-8',
    );

    const refreshed = await refreshRecentProjects(userDataPath);

    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]).toMatchObject({
      path: projectDir,
      projectKind: 'sceneforge',
      remixEntryIntent: null,
      remixRoutePath: null,
      updatedAt: '2026-06-24T10:05:00.000Z',
    });
  });

  it('keeps remix identity for a source-intake SceneForge project', async () => {
    await writeProject(baseProject({
      type: 'sceneforge',
      sceneforge: {
        version: 1,
        projectRoot: 'sceneforge',
        pipelineId: 'reference_remake',
        entryPath: 'source_intake',
        selectedStyleProfileId: null,
        selectedAssetIds: [],
        currentStage: 'source_intake',
        status: 'ready',
        coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
        lastExportPath: null,
      },
    }));

    const projects = await addRecentProject(userDataPath, projectDir, 'remix-demo', {
      projectKind: 'remix',
      remixEntryIntent: 'creation',
      remixRoutePath: '/remix/projects/variant-001',
    });

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      path: projectDir,
      name: 'remix-demo',
      projectKind: 'remix',
      remixEntryIntent: 'creation',
      remixRoutePath: '/remix/projects/variant-001',
    });
  });

  it('keeps remix identity after refreshing recent projects', async () => {
    await writeProject(baseProject({
      type: 'sceneforge',
      sceneforge: {
        version: 1,
        projectRoot: 'sceneforge',
        pipelineId: 'reference_remake',
        entryPath: 'source_intake',
        selectedStyleProfileId: null,
        selectedAssetIds: [],
        currentStage: 'source_intake',
        status: 'ready',
        coreArtifacts: { design: null, storyboard: null, videoPrompts: null },
        lastExportPath: null,
      },
    }));

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

  it('corrects projectKind from sceneforge to remix when pipelineId is reference_remake', async () => {
    await writeProject(baseProject({
      type: 'sceneforge',
      sceneforge: {
        version: 1,
        projectRoot: 'sceneforge',
        pipelineId: 'reference_remake',
        entryPath: 'source_intake',
      },
    }));

    // 模拟被错误篡改成了普通的 sceneforge
    await addRecentProject(userDataPath, projectDir, 'remix-demo', {
      projectKind: 'sceneforge',
    });

    const refreshed = await refreshRecentProjects(userDataPath);
    expect(refreshed).toHaveLength(1);
    // 应该被物理文件纠正为 remix 且自动加载默认二创路由
    expect(refreshed[0]).toMatchObject({
      path: projectDir,
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
      remixRoutePath: '/remix/assets',
    });
  });
});
