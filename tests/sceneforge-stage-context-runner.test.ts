import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-runner-ctx-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge stage context runner options', () => {
  it('applies runner override budget and echoes runner on context', async () => {
    const context = await service.getStageContext(tmpDir, 'design', {
      runner: 'acp_agent',
    });

    expect(context.runner).toBe('acp_agent');
    expect(context.contextCharBudget).toBe(120000);
    expect(Array.isArray(context.warnings)).toBe(true);
  });

  it('accepts selectedAssetIds without adding undeclared policy artifacts', async () => {
    const context = await service.getStageContext(tmpDir, 'storyboard', {
      selectedAssetIds: ['style.pixar_like', 'adaptation.idea_seed'],
    });

    expect(context.assetLibrary?.selectedAssets).toEqual(['style.pixar_like']);
    expect(context.requiredInputs.map((input) => input.policyInputId)).toEqual([
      'performance_sheet',
    ]);
    expect(context.requiredInputs[0]?.satisfied).toBe(false);
    expect(context.optionalInputs).toEqual([]);
  });
});
