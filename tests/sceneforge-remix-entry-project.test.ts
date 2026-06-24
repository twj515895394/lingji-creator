import { describe, expect, it } from 'vitest';
import type { FileEntry } from '../src/lib/electron-api';
import { createDefaultProjectData } from '../src/lib/project-persistence';
import {
  canBootstrapRemixAssetIngestionProject,
  isUntouchedProjectShell,
} from '../src/sceneforge/remix/lib/remix-entry-project';

describe('remix entry project guards', () => {
  it('treats the default shell project as safe to bootstrap for asset ingestion', () => {
    const projectData = createDefaultProjectData();
    const entries: FileEntry[] = [{ name: 'project.json', type: 'file' }];

    expect(isUntouchedProjectShell(projectData)).toBe(true);
    expect(canBootstrapRemixAssetIngestionProject(projectData, entries)).toBe(true);
  });

  it('rejects directories that already carry non-default project content', () => {
    const projectData = createDefaultProjectData();
    projectData.timeline = { podcast: { audioPath: '/tmp/a.mp3', srtPath: '', durationMs: 1000 } } as any;

    expect(isUntouchedProjectShell(projectData)).toBe(false);
    expect(
      canBootstrapRemixAssetIngestionProject(projectData, [{ name: 'project.json', type: 'file' }]),
    ).toBe(false);
  });

  it('rejects directories that contain extra top-level content', () => {
    const projectData = createDefaultProjectData();
    const entries: FileEntry[] = [
      { name: 'inputs', type: 'directory', children: [] },
      { name: 'project.json', type: 'file' },
    ];

    expect(canBootstrapRemixAssetIngestionProject(projectData, entries)).toBe(false);
  });
});
