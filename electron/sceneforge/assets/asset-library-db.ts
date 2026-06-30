import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  ASSET_LIBRARY_DB_FILENAME,
  type AssetLibraryDatabase,
} from './asset-library-types';

const CURRENT_SCHEMA_VERSION = 1;
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (filePath: string) => AssetLibraryDatabase;
};

export function resolveAssetLibraryDbPath(projectDir: string): string {
  const targetDir = path.join(projectDir, 'sceneforge');
  mkdirSync(targetDir, { recursive: true });
  return path.join(targetDir, ASSET_LIBRARY_DB_FILENAME);
}

export function createAssetLibraryDb(projectDir: string): AssetLibraryDatabase {
  const db = new DatabaseSync(resolveAssetLibraryDbPath(projectDir));
  db.exec('PRAGMA foreign_keys = ON;');
  runAssetLibraryMigrations(db);
  return db;
}

export function withAssetLibraryTransaction<T>(
  db: AssetLibraryDatabase,
  action: () => T,
): T {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = action();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

export function runAssetLibraryMigrations(db: AssetLibraryDatabase): void {
  const schemaVersion = db.prepare('PRAGMA user_version;').get() as {
    user_version?: number;
  };
  const userVersion = schemaVersion.user_version ?? 0;
  if (userVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  if (userVersion < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_assets (
        id TEXT PRIMARY KEY,
        project_dir TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        source_video_path TEXT NOT NULL,
        source_manifest_path TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        fps REAL,
        segment_count INTEGER NOT NULL,
        keyframe_count INTEGER NOT NULL,
        variant_count INTEGER NOT NULL,
        annotation_note TEXT,
        last_annotated_at TEXT,
        annotated_by TEXT,
        annotation_source TEXT,
        logline TEXT,
        story_summary_short TEXT,
        main_conflict TEXT,
        visual_style TEXT,
        dialogue_style TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        published_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_source_assets_status_updated
        ON source_assets(status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS source_asset_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_asset_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        normalized_tag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(source_asset_id) REFERENCES source_assets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_source_asset_tags_asset
        ON source_asset_tags(source_asset_id);
      CREATE INDEX IF NOT EXISTS idx_source_asset_tags_normalized
        ON source_asset_tags(normalized_tag);

      CREATE TABLE IF NOT EXISTS source_segments (
        id TEXT PRIMARY KEY,
        source_asset_id TEXT NOT NULL,
        segment_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        boundary_type TEXT NOT NULL,
        review_status TEXT,
        source_clip_path TEXT NOT NULL,
        analysis_json_path TEXT,
        analysis_markdown_path TEXT,
        segment_transcript_json_path TEXT,
        transcript_correction_path TEXT,
        segment_audio_path TEXT,
        segment_audio_json_path TEXT,
        visual_summary TEXT,
        shot_type TEXT,
        motion TEXT,
        plot_function TEXT,
        emotion TEXT,
        video_prompt_excerpt TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(source_asset_id) REFERENCES source_assets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_source_segments_asset_index
        ON source_segments(source_asset_id, segment_index ASC);

      CREATE TABLE IF NOT EXISTS source_keyframes (
        id TEXT PRIMARY KEY,
        source_asset_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        frame_role TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(source_asset_id) REFERENCES source_assets(id) ON DELETE CASCADE,
        FOREIGN KEY(segment_id) REFERENCES source_segments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_source_keyframes_asset_segment
        ON source_keyframes(source_asset_id, segment_id);

      CREATE TABLE IF NOT EXISTS source_asset_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_asset_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        content_format TEXT NOT NULL,
        scope TEXT NOT NULL,
        segment_id TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(source_asset_id) REFERENCES source_assets(id) ON DELETE CASCADE,
        FOREIGN KEY(segment_id) REFERENCES source_segments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_source_asset_artifacts_asset
        ON source_asset_artifacts(source_asset_id);

      CREATE TABLE IF NOT EXISTS source_asset_story_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_asset_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        extra_json TEXT,
        FOREIGN KEY(source_asset_id) REFERENCES source_assets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_source_asset_story_entities_asset
        ON source_asset_story_entities(source_asset_id, entity_type, sort_order);

      CREATE TABLE IF NOT EXISTS source_asset_search (
        source_asset_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        tags_joined TEXT NOT NULL,
        logline TEXT,
        story_summary_short TEXT,
        annotation_note TEXT,
        character_text TEXT,
        event_chain_text TEXT,
        segment_excerpt_text TEXT,
        search_text TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(source_asset_id) REFERENCES source_assets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_source_asset_search_updated
        ON source_asset_search(updated_at DESC);
    `);
  }

  db.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
}
