import type { SourceAssetSummary } from '../../../src/sceneforge/remix/types';
import { createAssetLibraryDb } from './asset-library-db';
import type {
  AssetLibraryPublishedAssetSummary,
  SearchAssetLibraryInput,
  SearchAssetLibraryResult,
} from './asset-library-types';

interface AssetSummaryRow {
  id: string;
  title: string;
  status: SourceAssetSummary['status'];
  duration_ms: number;
  segment_count: number;
  keyframe_count: number;
  variant_count: number;
  updated_at: string;
  annotation_note?: string | null;
  published_at?: string | null;
  logline?: string | null;
  story_summary_short?: string | null;
  main_conflict?: string | null;
  visual_style?: string | null;
  dialogue_style?: string | null;
  thumbnail_path?: string | null;
}

export class AssetLibraryQueryService {
  async listPublishedAssetSummaries(projectDir: string): Promise<SourceAssetSummary[]> {
    const rows = await this.listPublishedAssetRows(projectDir);
    return rows.map((row) => this.toSummary(row));
  }

  async searchPublishedAssets(input: SearchAssetLibraryInput): Promise<SearchAssetLibraryResult> {
    const db = createAssetLibraryDb(input.projectDir);
    try {
      const query = input.query?.trim().toLowerCase() ?? '';
      const limit = Math.max(1, Math.min(input.limit ?? 20, 100));
      const rows = db.prepare(`
        SELECT
          assets.id,
          assets.title,
          assets.status,
          assets.duration_ms,
          assets.segment_count,
          assets.keyframe_count,
          assets.variant_count,
          assets.updated_at,
          assets.annotation_note,
          assets.published_at,
          assets.logline,
          assets.story_summary_short,
          assets.main_conflict,
          assets.visual_style,
          assets.dialogue_style,
          (
            SELECT image_path
            FROM source_keyframes
            WHERE source_asset_id = assets.id
            ORDER BY
              CASE frame_role
                WHEN 'first' THEN 0
                WHEN 'middle' THEN 1
                ELSE 2
              END,
              timestamp_ms ASC
            LIMIT 1
          ) AS thumbnail_path
        FROM source_assets AS assets
        LEFT JOIN source_asset_search AS search
          ON search.source_asset_id = assets.id
        WHERE assets.status = 'published_to_library'
          AND (
            ? = ''
            OR LOWER(assets.title) LIKE '%' || ? || '%'
            OR LOWER(COALESCE(search.search_text, '')) LIKE '%' || ? || '%'
          )
        ORDER BY assets.updated_at DESC
        LIMIT ?
      `).all(query, query, query, limit) as AssetSummaryRow[];

      return {
        sourceAssets: rows.map((row) => this.toPublishedSummary(db, row)),
      };
    } finally {
      db.close();
    }
  }

  private async listPublishedAssetRows(projectDir: string): Promise<AssetSummaryRow[]> {
    const db = createAssetLibraryDb(projectDir);
    try {
      return db.prepare(`
        SELECT
          assets.id,
          assets.title,
          assets.status,
          assets.duration_ms,
          assets.segment_count,
          assets.keyframe_count,
          assets.variant_count,
          assets.updated_at,
          assets.annotation_note,
          assets.published_at,
          assets.logline,
          assets.story_summary_short,
          assets.main_conflict,
          assets.visual_style,
          assets.dialogue_style,
          (
            SELECT image_path
            FROM source_keyframes
            WHERE source_asset_id = assets.id
            ORDER BY
              CASE frame_role
                WHEN 'first' THEN 0
                WHEN 'middle' THEN 1
                ELSE 2
              END,
              timestamp_ms ASC
            LIMIT 1
          ) AS thumbnail_path
        FROM source_assets AS assets
        WHERE assets.status = 'published_to_library'
        ORDER BY assets.updated_at DESC
      `).all() as AssetSummaryRow[];
    } finally {
      db.close();
    }
  }

  private toPublishedSummary(
    db: ReturnType<typeof createAssetLibraryDb>,
    row: AssetSummaryRow,
  ): AssetLibraryPublishedAssetSummary {
    const tagRows = db.prepare(`
      SELECT tag
      FROM source_asset_tags
      WHERE source_asset_id = ?
      ORDER BY id ASC
    `).all(row.id) as Array<{ tag: string }>;
    return {
      ...this.toSummary(row),
      tags: tagRows.map((tagRow) => tagRow.tag),
      annotationNote: row.annotation_note ?? null,
      publishedAt: row.published_at ?? null,
      thumbnailPath: row.thumbnail_path ?? null,
      logline: row.logline ?? null,
      storySummaryShort: row.story_summary_short ?? null,
      mainConflict: row.main_conflict ?? null,
      visualStyle: row.visual_style ?? null,
      dialogueStyle: row.dialogue_style ?? null,
    };
  }

  private toSummary(row: AssetSummaryRow): SourceAssetSummary {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      durationMs: row.duration_ms,
      segmentCount: row.segment_count,
      keyframeCount: row.keyframe_count,
      variantCount: row.variant_count,
      updatedAt: row.updated_at,
    };
  }
}
