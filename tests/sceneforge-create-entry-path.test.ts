import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createSceneForgeProject,
  readSceneProjectEntryPath,
} from '../electron/sceneforge/project/scene-project-file';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-entry-create-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('createSceneForgeProject entryPath', () => {
  it('defaults to topic_gate', async () => {
    const data = await createSceneForgeProject(tmpDir);
    expect(data.sceneforge?.entryPath).toBe('topic_gate');
    expect(data.sceneforge?.currentStage).toBe('topic_gate');
    expect(await readSceneProjectEntryPath(tmpDir)).toBe('topic_gate');
  });

  it('persists source_intake entry', async () => {
    const data = await createSceneForgeProject(tmpDir, 'source_intake');
    expect(data.sceneforge?.entryPath).toBe('source_intake');
    expect(data.sceneforge?.currentStage).toBe('source_intake');
    expect(await readSceneProjectEntryPath(tmpDir)).toBe('source_intake');
  });
});