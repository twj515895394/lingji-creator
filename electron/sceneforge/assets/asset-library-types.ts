import type { SourceAssetSummary } from '../../../src/sceneforge/remix/types';

export const ASSET_LIBRARY_DB_FILENAME = 'asset-library.db';

export interface AssetLibraryDatabase {
  exec(sql: string): unknown;
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): unknown;
  };
  close(): void;
}

export interface AssetLibraryPublishedAssetSummary extends SourceAssetSummary {
  tags: string[];
  annotationNote: string | null;
  publishedAt: string | null;
  thumbnailPath: string | null;
  logline: string | null;
  storySummaryShort: string | null;
  mainConflict: string | null;
  visualStyle: string | null;
  dialogueStyle: string | null;
}

export interface SearchAssetLibraryInput {
  projectDir: string;
  query?: string | null;
  limit?: number;
}

export interface SearchAssetLibraryResult {
  sourceAssets: AssetLibraryPublishedAssetSummary[];
}

export interface RebuildAssetLibraryInput {
  projectDir: string;
  sourceAssetIds?: string[] | null;
}

export interface RebuildAssetLibraryResult {
  rebuiltAssetIds: string[];
  skippedAssetIds: string[];
}
