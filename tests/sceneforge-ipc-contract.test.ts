import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('SceneForge IPC contract', () => {
  it('wires main, preload and electron-api together', () => {
    const main = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf-8');
    const preload = readFileSync(new URL('../electron/preload.ts', import.meta.url), 'utf-8');
    const api = readFileSync(new URL('../src/lib/electron-api.ts', import.meta.url), 'utf-8');
    const ipc = readFileSync(new URL('../electron/sceneforge/ipc.ts', import.meta.url), 'utf-8');
    const mcp = readFileSync(
      new URL('../electron/sceneforge/mcp/register-scene-tools.ts', import.meta.url),
      'utf-8',
    );

    expect(main).toContain('registerSceneForgeIpc');
    expect(preload).toContain('sceneGetProjectState');
    expect(preload).toContain('sceneSetApprovalPolicy');
    expect(api).toContain('sceneGetProjectState');
    expect(api).toContain('sceneGetStageContext');
    expect(api).toContain('SceneGetStageContextOptions');
    expect(api).toContain('sceneSubmitStageDraft');
    expect(api).toContain('sceneValidateStage');
    expect(api).toContain('sceneApproveStage');
    expect(api).toContain('sceneSetApprovalPolicy');
    expect(api).toContain('sceneListArtifacts');
    expect(api).toContain('sceneReadArtifact');
    expect(api).toContain('sceneExportPromptPack');

    expect(ipc).toContain('sceneforge:get-stage-context');
    expect(ipc).toContain('SceneGetStageContextOptions');

    expect(preload).toContain('sceneforge:get-stage-context');
    expect(preload).toContain('SceneGetStageContextOptions');

    expect(mcp).toContain('scene_get_stage_context');
    expect(mcp).toContain('selectedAssetIds');
    expect(mcp).toContain('acp_agent');
  });
});