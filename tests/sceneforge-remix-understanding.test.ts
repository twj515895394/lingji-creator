import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-understanding-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix understanding service', () => {
  it('writes overview and segment analysis artifacts', async () => {
    const service = new RemixService({
      readDurationMs: async () => 12000,
    });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });
    await service.runSourceKeyframes({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    const understood = await service.runSourceUnderstanding({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(understood.sourceAsset.status).toBe('ready_for_review');
    await expect(
      fs.readFile(path.join(projectDir, understood.sourceAsset.sourceOverviewMarkdownPath ?? ''), 'utf8'),
    ).resolves.toContain('# Source Overview');
    await expect(
      fs.readFile(path.join(projectDir, understood.sourceAsset.segmentAnalysisMarkdownPath ?? ''), 'utf8'),
    ).resolves.toContain('# Segment Analysis');
  });
});
