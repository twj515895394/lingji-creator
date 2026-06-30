import { afterEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import {
  createAssetLibraryDb,
  resolveAssetLibraryDbPath,
} from '../electron/sceneforge/assets/asset-library-db';

function listTables(db: { prepare: (sql: string) => { all: () => Array<{ name: string }> } }): string[] {
  const rows = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type='table'
    ORDER BY name ASC
  `).all();
  return rows.map((row) => row.name);
}

describe('asset library db migrations', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('resolves db path under sceneforge directory', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'asset-library-db-'));
    tempDirs.push(tempDir);

    const dbPath = resolveAssetLibraryDbPath(tempDir);
    expect(dbPath).toBe(path.join(tempDir, 'sceneforge', 'asset-library.db'));
  });

  it('creates asset library tables with required columns', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'asset-library-db-'));
    tempDirs.push(tempDir);
    const db = createAssetLibraryDb(tempDir);

    const tables = listTables(db);
    expect(tables).toEqual(expect.arrayContaining([
      'source_assets',
      'source_asset_tags',
      'source_segments',
      'source_keyframes',
      'source_asset_artifacts',
      'source_asset_story_entities',
      'source_asset_search',
    ]));

    const assetColumns = db.prepare('PRAGMA table_info(source_assets);').all() as Array<{
      name: string;
      notnull: number;
    }>;
    expect(assetColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      'id',
      'project_dir',
      'title',
      'status',
      'segment_count',
      'keyframe_count',
      'variant_count',
      'logline',
      'story_summary_short',
      'published_at',
    ]));
    expect(assetColumns.find((column) => column.name === 'project_dir')?.notnull).toBe(1);
    expect(assetColumns.find((column) => column.name === 'status')?.notnull).toBe(1);

    const segmentColumns = db.prepare('PRAGMA table_info(source_segments);').all() as Array<{
      name: string;
    }>;
    expect(segmentColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      'id',
      'source_asset_id',
      'segment_index',
      'visual_summary',
      'plot_function',
      'video_prompt_excerpt',
    ]));

    const searchColumns = db.prepare('PRAGMA table_info(source_asset_search);').all() as Array<{
      name: string;
    }>;
    expect(searchColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      'source_asset_id',
      'title',
      'tags_joined',
      'search_text',
    ]));

    db.close();
  });
});
