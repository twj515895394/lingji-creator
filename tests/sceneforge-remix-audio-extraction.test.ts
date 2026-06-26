import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-audio-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix audio extraction service', () => {
  it('writes source and segment audio artifacts for assets with audio', async () => {
    const service = new RemixService({ readDurationMs: async () => 12000 });
    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });

    const extracted = await service.runSourceAudio({
      projectDir,
      sourceAssetId: imported.sourceAsset.id,
    });

    expect(extracted.sourceAsset.sourceAudioPath).toContain('audio/source_audio.wav');
    expect(extracted.sourceAsset.segments[0].segmentAudioPath).toContain('segment_audio.wav');
    await expect(
      fs.readFile(path.join(projectDir, extracted.sourceAsset.sourceAudioJsonPath ?? ''), 'utf8'),
    ).resolves.toContain('"hasAudio": true');
    await expect(
      fs.readFile(
        path.join(projectDir, extracted.sourceAsset.segments[0].segmentAudioJsonPath ?? ''),
        'utf8',
      ),
    ).resolves.toContain('"status": "ready"');
  });
});
