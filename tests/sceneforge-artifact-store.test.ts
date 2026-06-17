import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import {
  SceneArtifactStoreError,
  listSceneArtifacts,
  readSceneArtifact,
  writeSceneArtifact,
} from '../electron/sceneforge/artifacts/scene-artifact-store';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-artifact-'));
  await createSceneForgeProject(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge artifact store', () => {
  it('writes a core artifact under stage outputs and registers it in manifest', async () => {
    const artifact = await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'design',
      artifactKey: 'design_prompts',
      kind: 'final',
      title: '设定图提示词',
      content: '# 设定图提示词\n\n## 角色提示词\nok',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });

    expect(artifact).toMatchObject({
      id: 'design.design_prompts',
      stage: 'design',
      kind: 'final',
      role: 'core_generation_asset',
      title: '设定图提示词',
      path: 'sceneforge/stages/design/outputs/design_prompts.md',
      coreAsset: true,
      readableByDownstream: true,
      usedBy: ['storyboard', 'video_prompts', 'export'],
      viewModes: ['preview', 'structure', 'trace', 'raw'],
    });
    expect(artifact.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const absoluteArtifactPath = path.join(tmpDir, ...artifact.path.split('/'));
    await expect(fs.access(absoluteArtifactPath)).resolves.toBeUndefined();
    expect(await fs.readFile(absoluteArtifactPath, 'utf-8')).toContain('角色提示词');

    const artifacts = await listSceneArtifacts(tmpDir);
    expect(artifacts.map((item) => item.id)).toEqual(['design.design_prompts']);

    const result = await readSceneArtifact(tmpDir, artifact.id);
    expect(result.artifact.id).toBe(artifact.id);
    expect(result.content).toContain('设定图提示词');
  });

  it('updates an existing manifest entry instead of appending duplicates', async () => {
    await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'storyboard',
      artifactKey: 'storyboard_prompt_pack',
      kind: 'final',
      title: '故事板提示词 v1',
      content: '# v1',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });

    const updated = await writeSceneArtifact({
      projectDir: tmpDir,
      stage: 'storyboard',
      artifactKey: 'storyboard_prompt_pack',
      kind: 'final',
      title: '故事板提示词 v2',
      content: '# v2',
      role: 'core_generation_asset',
      coreAsset: true,
      readableByDownstream: true,
    });

    const artifacts = await listSceneArtifacts(tmpDir);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].id).toBe('storyboard.storyboard_prompt_pack');
    expect(artifacts[0].title).toBe('故事板提示词 v2');
    expect((await readSceneArtifact(tmpDir, updated.id)).content).toBe('# v2');
  });

  it('rejects invalid stages, unsafe artifact keys and unknown artifact reads', async () => {
    await expect(
      writeSceneArtifact({
        projectDir: tmpDir,
        stage: 'not_a_stage' as never,
        artifactKey: 'design_prompts',
        kind: 'final',
        title: 'bad',
        content: 'bad',
        role: 'core_generation_asset',
        coreAsset: true,
        readableByDownstream: true,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STAGE' });

    await expect(
      writeSceneArtifact({
        projectDir: tmpDir,
        stage: 'design',
        artifactKey: '../escape',
        kind: 'final',
        title: 'bad',
        content: 'bad',
        role: 'core_generation_asset',
        coreAsset: true,
        readableByDownstream: true,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ARTIFACT_KEY' });

    await expect(readSceneArtifact(tmpDir, 'missing.artifact')).rejects.toBeInstanceOf(
      SceneArtifactStoreError,
    );
    await expect(readSceneArtifact(tmpDir, 'missing.artifact')).rejects.toMatchObject({
      code: 'ARTIFACT_NOT_FOUND',
    });
  });

  it('rejects invalid writable artifact metadata before touching the manifest', async () => {
    await expect(
      writeSceneArtifact({
        projectDir: tmpDir,
        stage: 'design',
        artifactKey: 'bad_metadata',
        kind: 'unknown_kind' as never,
        title: 'bad',
        content: 'bad',
        role: 'core_generation_asset',
        coreAsset: true,
        readableByDownstream: true,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ARTIFACT_METADATA' });

    await expect(listSceneArtifacts(tmpDir)).resolves.toEqual([]);
  });

  it('throws a structured error when manifest YAML is invalid', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'sceneforge', 'artifact_manifest.yaml'),
      'version: 1\nartifacts:\n  - [broken\n',
      'utf-8',
    );

    await expect(listSceneArtifacts(tmpDir)).rejects.toMatchObject({
      code: 'INVALID_MANIFEST_FILE',
    });
  });

  it('rejects manifest entries with missing required metadata', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'sceneforge', 'artifact_manifest.yaml'),
      [
        'version: 1',
        'artifacts:',
        '  - id: design.design_prompts',
        '    stage: design',
        '    path: sceneforge/stages/design/outputs/design_prompts.md',
        '',
      ].join('\n'),
      'utf-8',
    );

    await expect(listSceneArtifacts(tmpDir)).rejects.toMatchObject({
      code: 'INVALID_MANIFEST_FILE',
    });
  });

  it('rejects manifest entries that point outside the project directory', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'sceneforge', 'artifact_manifest.yaml'),
      [
        'version: 1',
        'artifacts:',
        '  - id: design.design_prompts',
        '    stage: design',
        '    kind: final',
        '    role: core_generation_asset',
        '    title: bad',
        '    path: ../../escape.md',
        '    coreAsset: true',
        '    readableByDownstream: true',
        '    usedBy: []',
        '    viewModes: [preview, structure, trace, raw]',
        '    createdAt: 2026-06-16T00:00:00.000Z',
        '',
      ].join('\n'),
      'utf-8',
    );

    await expect(listSceneArtifacts(tmpDir)).rejects.toMatchObject({
      code: 'ARTIFACT_PATH_OUTSIDE_PROJECT',
    });
  });
});
