import fs from 'node:fs/promises';
import path from 'node:path';
import type { StoredSourceAssetDocument } from '../remix/remix-store';
import { resolveProjectFile } from '../remix/remix-validators';
import {
  createAssetLibraryDb,
  withAssetLibraryTransaction,
} from './asset-library-db';

interface ArtifactRow {
  artifactType: string;
  relativePath: string;
  contentFormat: string;
  scope: 'asset' | 'segment';
  segmentId: string | null;
  metadataJson: string | null;
}

interface StoryEntityRow {
  entityType: 'character' | 'event' | 'turning_point' | 'remix_direction';
  sortOrder: number;
  title: string | null;
  description: string | null;
  extraJson: string | null;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function inferContentFormat(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  return ext || 'unknown';
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function toJson(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return JSON.stringify(value);
}

async function readJsonFile<T>(projectDir: string, relativePath: string | null | undefined, label: string): Promise<T> {
  if (!relativePath?.trim()) {
    throw new Error(`${label} 路径缺失。`);
  }
  return JSON.parse(await fs.readFile(resolveProjectFile(projectDir, relativePath), 'utf8')) as T;
}

type OverviewDocument = {
  overall?: {
    logline?: string;
    storySummaryShort?: string;
    mainConflict?: string;
    visualStyle?: string;
    dialogueStyle?: string;
    eventChain?: string[];
    characterMap?: Array<{
      nameOrRole?: string;
      description?: string;
      relation?: string | null;
    }>;
    keyTurns?: string[];
  };
  remixStrategy?: {
    rewriteDirections?: Array<{
      title?: string;
      idea?: string;
      suitableStyle?: string;
      requiredSegments?: string[];
      risk?: string;
    }>;
  };
};

type SegmentAnalysisItem = {
  segmentId?: string;
  visual?: { mainAction?: string };
  camera?: { shotSize?: string };
  story?: { plotFunction?: string; emotion?: string };
  videoPrompt?: string | { fullChinesePrompt?: string };
};

export interface AssetLibraryIngestOptions {
  publishedAt?: string | null;
  status?: string;
}

export class AssetLibraryIngestService {
  async upsertSourceAsset(
    projectDir: string,
    document: StoredSourceAssetDocument,
    options: AssetLibraryIngestOptions = {},
  ): Promise<void> {
    const overview = await readJsonFile<OverviewDocument>(
      projectDir,
      document.sourceAsset.sourceOverviewJsonPath,
      'source_overview.json',
    );
    const segmentAnalysis = await readJsonFile<SegmentAnalysisItem[]>(
      projectDir,
      document.sourceAsset.segmentAnalysisJsonPath,
      'segment_analysis.json',
    );

    const db = createAssetLibraryDb(projectDir);
    try {
      const existingRow = db
        .prepare('SELECT published_at FROM source_assets WHERE id = ?')
        .get(document.sourceAsset.id) as { published_at?: string | null } | undefined;
      const publishedAt =
        options.publishedAt ??
        existingRow?.published_at ??
        (document.sourceAsset.status === 'published_to_library' ? document.sourceAsset.updatedAt : null);
      const status = options.status ?? document.sourceAsset.status;
      const tags = Array.from(new Set((document.sourceAsset.tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
      const segmentAnalysisById = new Map(
        (segmentAnalysis ?? [])
          .filter((item) => typeof item?.segmentId === 'string' && item.segmentId.trim())
          .map((item) => [item.segmentId!.trim(), item]),
      );

      withAssetLibraryTransaction(db, () => {
        db.prepare(`
          INSERT INTO source_assets (
            id, project_dir, title, status, source_video_path, source_manifest_path, duration_ms, width, height, fps,
            segment_count, keyframe_count, variant_count, annotation_note, last_annotated_at, annotated_by, annotation_source,
            logline, story_summary_short, main_conflict, visual_style, dialogue_style, created_at, updated_at, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            project_dir = excluded.project_dir,
            title = excluded.title,
            status = excluded.status,
            source_video_path = excluded.source_video_path,
            source_manifest_path = excluded.source_manifest_path,
            duration_ms = excluded.duration_ms,
            width = excluded.width,
            height = excluded.height,
            fps = excluded.fps,
            segment_count = excluded.segment_count,
            keyframe_count = excluded.keyframe_count,
            variant_count = excluded.variant_count,
            annotation_note = excluded.annotation_note,
            last_annotated_at = excluded.last_annotated_at,
            annotated_by = excluded.annotated_by,
            annotation_source = excluded.annotation_source,
            logline = excluded.logline,
            story_summary_short = excluded.story_summary_short,
            main_conflict = excluded.main_conflict,
            visual_style = excluded.visual_style,
            dialogue_style = excluded.dialogue_style,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            published_at = excluded.published_at
        `).run(
          document.sourceAsset.id,
          projectDir,
          document.sourceAsset.title,
          status,
          document.sourceAsset.sourceVideoPath,
          document.sourceAsset.sourceManifestPath,
          document.sourceAsset.videoMetadata.durationMs,
          document.sourceAsset.videoMetadata.width,
          document.sourceAsset.videoMetadata.height,
          document.sourceAsset.videoMetadata.fps ?? null,
          document.sourceAsset.segments.length,
          document.sourceAsset.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0),
          document.sourceAsset.variantCount,
          document.sourceAsset.annotationNote ?? null,
          document.sourceAsset.lastAnnotatedAt ?? null,
          document.sourceAsset.annotatedBy ?? null,
          document.sourceAsset.annotationSource ?? null,
          safeString(overview?.overall?.logline),
          safeString(overview?.overall?.storySummaryShort),
          safeString(overview?.overall?.mainConflict),
          safeString(overview?.overall?.visualStyle),
          safeString(overview?.overall?.dialogueStyle),
          document.sourceAsset.createdAt,
          document.sourceAsset.updatedAt,
          publishedAt,
        );

        this.replaceTags(db, document.sourceAsset.id, tags, document.sourceAsset.updatedAt);
        this.replaceSegments(db, document, segmentAnalysisById);
        this.replaceArtifacts(db, document);
        this.replaceStoryEntities(db, document.sourceAsset.id, overview);
        this.replaceSearch(db, document, overview, segmentAnalysisById, tags);
      });
    } finally {
      db.close();
    }
  }

  async removeSourceAsset(projectDir: string, sourceAssetId: string): Promise<void> {
    const db = createAssetLibraryDb(projectDir);
    try {
      db.prepare('DELETE FROM source_assets WHERE id = ?').run(sourceAssetId);
    } finally {
      db.close();
    }
  }

  private replaceTags(
    db: ReturnType<typeof createAssetLibraryDb>,
    sourceAssetId: string,
    tags: string[],
    createdAt: string,
  ): void {
    db.prepare('DELETE FROM source_asset_tags WHERE source_asset_id = ?').run(sourceAssetId);
    const statement = db.prepare(`
      INSERT INTO source_asset_tags (
        source_asset_id, tag, normalized_tag, created_at
      ) VALUES (?, ?, ?, ?)
    `);
    for (const tag of tags) {
      statement.run(sourceAssetId, tag, normalizeTag(tag), createdAt);
    }
  }

  private replaceSegments(
    db: ReturnType<typeof createAssetLibraryDb>,
    document: StoredSourceAssetDocument,
    segmentAnalysisById: Map<string, SegmentAnalysisItem>,
  ): void {
    db.prepare('DELETE FROM source_keyframes WHERE source_asset_id = ?').run(document.sourceAsset.id);
    db.prepare('DELETE FROM source_segments WHERE source_asset_id = ?').run(document.sourceAsset.id);

    const segmentStatement = db.prepare(`
      INSERT INTO source_segments (
        id, source_asset_id, segment_index, title, start_ms, end_ms, duration_ms, boundary_type, review_status,
        source_clip_path, analysis_json_path, analysis_markdown_path, segment_transcript_json_path, transcript_correction_path,
        segment_audio_path, segment_audio_json_path, visual_summary, shot_type, motion, plot_function, emotion,
        video_prompt_excerpt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const keyframeStatement = db.prepare(`
      INSERT INTO source_keyframes (
        id, source_asset_id, segment_id, frame_role, timestamp_ms, image_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const segment of document.sourceAsset.segments) {
      const analysis = segmentAnalysisById.get(segment.id);
      const videoPromptRaw = analysis?.videoPrompt;
      const promptExcerpt =
        typeof videoPromptRaw === 'string'
          ? videoPromptRaw.trim()
          : safeString(videoPromptRaw?.fullChinesePrompt) ?? null;
      segmentStatement.run(
        segment.id,
        document.sourceAsset.id,
        segment.index,
        segment.title,
        segment.timeRange.startMs,
        segment.timeRange.endMs,
        segment.timeRange.durationMs,
        segment.boundaryType,
        segment.reviewStatus ?? null,
        segment.sourceClipPath,
        segment.analysisJsonPath ?? null,
        segment.analysisMarkdownPath ?? null,
        segment.segmentTranscriptJsonPath ?? null,
        segment.transcriptCorrectionPath ?? null,
        segment.segmentAudioPath ?? null,
        segment.segmentAudioJsonPath ?? null,
        safeString(analysis?.visual?.mainAction) ?? safeString(segment.semantic?.visualSummary),
        safeString(analysis?.camera?.shotSize) ?? safeString(segment.semantic?.shotType),
        safeString(segment.semantic?.motion),
        safeString(analysis?.story?.plotFunction),
        safeString(analysis?.story?.emotion),
        promptExcerpt,
        document.sourceAsset.createdAt,
        document.sourceAsset.updatedAt,
      );

      for (const keyframe of segment.keyframes) {
        keyframeStatement.run(
          keyframe.id,
          document.sourceAsset.id,
          segment.id,
          keyframe.frameRole,
          keyframe.timestampMs,
          keyframe.imagePath,
          document.sourceAsset.updatedAt,
        );
      }
    }
  }

  private replaceArtifacts(
    db: ReturnType<typeof createAssetLibraryDb>,
    document: StoredSourceAssetDocument,
  ): void {
    db.prepare('DELETE FROM source_asset_artifacts WHERE source_asset_id = ?').run(document.sourceAsset.id);
    const statement = db.prepare(`
      INSERT INTO source_asset_artifacts (
        source_asset_id, artifact_type, relative_path, content_format, scope, segment_id, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const rows = this.buildArtifactRows(document);
    for (const row of rows) {
      statement.run(
        document.sourceAsset.id,
        row.artifactType,
        row.relativePath,
        row.contentFormat,
        row.scope,
        row.segmentId,
        row.metadataJson,
        document.sourceAsset.createdAt,
        document.sourceAsset.updatedAt,
      );
    }
  }

  private replaceStoryEntities(
    db: ReturnType<typeof createAssetLibraryDb>,
    sourceAssetId: string,
    overview: OverviewDocument,
  ): void {
    db.prepare('DELETE FROM source_asset_story_entities WHERE source_asset_id = ?').run(sourceAssetId);
    const statement = db.prepare(`
      INSERT INTO source_asset_story_entities (
        source_asset_id, entity_type, sort_order, title, description, extra_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const rows = this.buildStoryEntityRows(overview);
    for (const row of rows) {
      statement.run(
        sourceAssetId,
        row.entityType,
        row.sortOrder,
        row.title,
        row.description,
        row.extraJson,
      );
    }
  }

  private replaceSearch(
    db: ReturnType<typeof createAssetLibraryDb>,
    document: StoredSourceAssetDocument,
    overview: OverviewDocument,
    segmentAnalysisById: Map<string, SegmentAnalysisItem>,
    tags: string[],
  ): void {
    const characterText = safeStringArray(overview?.overall?.characterMap?.map((item) => {
      const name = safeString(item?.nameOrRole);
      const description = safeString(item?.description);
      const relation = safeString(item?.relation);
      return [name, description, relation].filter(Boolean).join(' ');
    }) ?? []).join(' ');
    const eventChainText = safeStringArray(overview?.overall?.eventChain).join(' ');
    const segmentExcerptText = document.sourceAsset.segments
      .map((segment) => {
        const analysis = segmentAnalysisById.get(segment.id);
        const prompt = analysis?.videoPrompt;
        const promptText =
          typeof prompt === 'string'
            ? prompt
            : safeString(prompt?.fullChinesePrompt) ?? '';
        return [
          segment.title,
          safeString(analysis?.visual?.mainAction),
          safeString(analysis?.story?.plotFunction),
          promptText,
        ]
          .filter(Boolean)
          .join(' ');
      })
      .filter(Boolean)
      .join(' ');

    const searchParts = [
      document.sourceAsset.title,
      tags.join(' '),
      safeString(overview?.overall?.logline),
      safeString(overview?.overall?.storySummaryShort),
      document.sourceAsset.annotationNote ?? null,
      characterText,
      eventChainText,
      segmentExcerptText,
    ].filter(Boolean);

    db.prepare(`
      INSERT INTO source_asset_search (
        source_asset_id, title, tags_joined, logline, story_summary_short, annotation_note,
        character_text, event_chain_text, segment_excerpt_text, search_text, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_asset_id) DO UPDATE SET
        title = excluded.title,
        tags_joined = excluded.tags_joined,
        logline = excluded.logline,
        story_summary_short = excluded.story_summary_short,
        annotation_note = excluded.annotation_note,
        character_text = excluded.character_text,
        event_chain_text = excluded.event_chain_text,
        segment_excerpt_text = excluded.segment_excerpt_text,
        search_text = excluded.search_text,
        updated_at = excluded.updated_at
    `).run(
      document.sourceAsset.id,
      document.sourceAsset.title,
      tags.join(' '),
      safeString(overview?.overall?.logline),
      safeString(overview?.overall?.storySummaryShort),
      document.sourceAsset.annotationNote ?? null,
      characterText || null,
      eventChainText || null,
      segmentExcerptText || null,
      searchParts.join(' '),
      document.sourceAsset.updatedAt,
    );
  }

  private buildArtifactRows(document: StoredSourceAssetDocument): ArtifactRow[] {
    const rows: ArtifactRow[] = [];
    const pushArtifact = (
      artifactType: string,
      relativePath: string | null | undefined,
      scope: 'asset' | 'segment',
      segmentId: string | null,
      metadata?: Record<string, unknown>,
    ) => {
      if (!relativePath?.trim()) {
        return;
      }
      rows.push({
        artifactType,
        relativePath,
        contentFormat: inferContentFormat(relativePath),
        scope,
        segmentId,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      });
    };

    pushArtifact('source_manifest', document.sourceAsset.sourceManifestPath, 'asset', null);
    pushArtifact('source_video', document.sourceAsset.sourceVideoPath, 'asset', null);
    pushArtifact('source_overview_json', document.sourceAsset.sourceOverviewJsonPath, 'asset', null);
    pushArtifact('segment_analysis_json', document.sourceAsset.segmentAnalysisJsonPath, 'asset', null);
    pushArtifact('source_transcript', document.sourceAsset.transcriptPath, 'asset', null);
    pushArtifact('source_srt', document.sourceAsset.srtPath, 'asset', null);
    pushArtifact('source_audio', document.sourceAsset.sourceAudioPath, 'asset', null);
    pushArtifact('source_audio_json', document.sourceAsset.sourceAudioJsonPath, 'asset', null);

    for (const segment of document.sourceAsset.segments) {
      pushArtifact('segment_clip', segment.sourceClipPath, 'segment', segment.id);
      pushArtifact('segment_analysis_json', segment.analysisJsonPath, 'segment', segment.id);
      pushArtifact('segment_analysis_markdown', segment.analysisMarkdownPath, 'segment', segment.id);
      pushArtifact('segment_transcript_json', segment.segmentTranscriptJsonPath, 'segment', segment.id);
      pushArtifact('segment_transcript_correction', segment.transcriptCorrectionPath, 'segment', segment.id);
      pushArtifact('segment_audio', segment.segmentAudioPath, 'segment', segment.id);
      pushArtifact('segment_audio_json', segment.segmentAudioJsonPath, 'segment', segment.id);
      for (const keyframe of segment.keyframes) {
        pushArtifact(
          `keyframe_${keyframe.frameRole}`,
          keyframe.imagePath,
          'segment',
          segment.id,
          { keyframeId: keyframe.id, frameRole: keyframe.frameRole, timestampMs: keyframe.timestampMs },
        );
      }
    }

    return rows;
  }

  private buildStoryEntityRows(overview: OverviewDocument): StoryEntityRow[] {
    const rows: StoryEntityRow[] = [];
    const characters = overview?.overall?.characterMap ?? [];
    characters.forEach((character, index) => {
      rows.push({
        entityType: 'character',
        sortOrder: index,
        title: safeString(character?.nameOrRole),
        description: safeString(character?.description),
        extraJson: toJson({ relation: safeString(character?.relation) }),
      });
    });

    const events = overview?.overall?.eventChain ?? [];
    events.forEach((event, index) => {
      rows.push({
        entityType: 'event',
        sortOrder: index,
        title: event,
        description: null,
        extraJson: null,
      });
    });

    const turns = overview?.overall?.keyTurns ?? [];
    turns.forEach((turn, index) => {
      rows.push({
        entityType: 'turning_point',
        sortOrder: index,
        title: turn,
        description: null,
        extraJson: null,
      });
    });

    const directions = overview?.remixStrategy?.rewriteDirections ?? [];
    directions.forEach((direction, index) => {
      rows.push({
        entityType: 'remix_direction',
        sortOrder: index,
        title: safeString(direction?.title),
        description: safeString(direction?.idea),
        extraJson: toJson({
          suitableStyle: safeString(direction?.suitableStyle),
          requiredSegments: safeStringArray(direction?.requiredSegments),
          risk: safeString(direction?.risk),
        }),
      });
    });

    return rows;
  }
}
