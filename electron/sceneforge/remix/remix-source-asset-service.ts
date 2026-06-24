import fs from 'node:fs/promises';
import path from 'node:path';
import type { VideoImportTaskSnapshot } from '../../video-import/types';
import { getVideoImportService } from '../../video-import/import-service';
import { readVideoDurationMs } from '../../media-duration';
import type { CreateSourceAssetFromImportInput } from './remix-ipc-types';
import {
  getRemixSegmentAnalysisJsonPath,
  getRemixSegmentAnalysisMarkdownPath,
  getRemixSourceManifestPath,
  getRemixSourceOverviewJsonPath,
  getRemixSourceOverviewMarkdownPath,
} from './remix-artifact-paths';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, slugifyRemixId, writeStoredSourceAsset } from './remix-store';

interface CreateSourceAssetResult {
  document: StoredSourceAssetDocument;
}

export interface RemixSourceAssetServiceOptions {
  now?: () => Date;
  readDurationMs?: (filePath: string) => Promise<number>;
  getImportStatus?: (importId: string) => VideoImportTaskSnapshot | null;
}

export interface UpdateSourceAssetMetadataInput {
  projectDir: string;
  sourceAssetId: string;
  tags?: string[];
  annotationNote?: string | null;
  annotatedBy?: string | null;
  annotationSource?: string | null;
}

interface ResolvedImportSource {
  title: string;
  sourceVideoPath: string;
  transcriptPath?: string | null;
  srtPath?: string | null;
}

export class RemixSourceAssetService {
  private readonly now;

  private readonly readDurationMs;

  private readonly getImportStatus;

  constructor(options: RemixSourceAssetServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.readDurationMs = options.readDurationMs ?? ((filePath) => readVideoDurationMs(filePath));
    this.getImportStatus = options.getImportStatus ?? ((importId) => getVideoImportService().getImportStatus(importId));
  }

  private async resolveSource(input: CreateSourceAssetFromImportInput): Promise<ResolvedImportSource> {
    if (input.sourceVideoPath?.trim()) {
      const sourceVideoPath = input.sourceVideoPath.trim();
      return {
        title: input.title?.trim() || path.basename(sourceVideoPath, path.extname(sourceVideoPath)),
        sourceVideoPath,
      };
    }

    const importId = input.importId?.trim();
    if (!importId) {
      throw new Error('缺少 sourceVideoPath 或 importId，无法创建 Source Asset。');
    }

    const snapshot = this.getImportStatus(importId);
    if (!snapshot?.result) {
      throw new Error(`未找到可用的视频导入结果：${importId}`);
    }

    return {
      title: input.title?.trim() || snapshot.result.title,
      sourceVideoPath: snapshot.result.videoPath,
      transcriptPath: snapshot.result.transcriptPath,
      srtPath: snapshot.result.transcriptSrtPath,
    };
  }

  async createFromImport(input: CreateSourceAssetFromImportInput): Promise<CreateSourceAssetResult> {
    const resolved = await this.resolveSource(input);
    const createdAt = this.now().toISOString();
    const durationMs = await this.readDurationMs(resolved.sourceVideoPath);
    const sourceAssetId = [
      'source',
      slugifyRemixId(input.importId?.trim() || resolved.title, 'asset'),
      this.now().getTime().toString(36),
    ].join('-');

    const document: StoredSourceAssetDocument = {
      schema: 'sceneforge-remix-source-asset',
      version: 1,
      sourceAsset: {
        id: sourceAssetId,
        title: resolved.title,
        status: 'processing',
        createdAt,
        updatedAt: createdAt,
        sourceVideoPath: resolved.sourceVideoPath,
        sourceManifestPath: getRemixSourceManifestPath(sourceAssetId),
        transcriptPath: resolved.transcriptPath ?? null,
        srtPath: resolved.srtPath ?? null,
        videoMetadata: {
          durationMs,
          width: 1920,
          height: 1080,
          fps: 25,
          audioChannels: 2,
          hasAudio: true,
        },
        sourceOverviewMarkdownPath: getRemixSourceOverviewMarkdownPath(sourceAssetId),
        sourceOverviewJsonPath: getRemixSourceOverviewJsonPath(sourceAssetId),
        segmentAnalysisMarkdownPath: getRemixSegmentAnalysisMarkdownPath(sourceAssetId),
        segmentAnalysisJsonPath: getRemixSegmentAnalysisJsonPath(sourceAssetId),
        segments: [],
        variantCount: 0,
        tags: [],
        annotationNote: null,
        lastAnnotatedAt: null,
        annotatedBy: null,
        annotationSource: null,
      },
      processingStageStates: {
        remix_source_import: 'approved',
        remix_segmentation: 'not_started',
        remix_keyframes: 'not_started',
        remix_understanding: 'not_started',
      },
    };

    await fs.mkdir(path.join(input.projectDir, path.dirname(document.sourceAsset.sourceManifestPath)), {
      recursive: true,
    });
    await writeStoredSourceAsset(input.projectDir, document);
    return { document };
  }

  async updateMetadata(input: UpdateSourceAssetMetadataInput): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    const nowIso = this.now().toISOString();
    const tags = Array.from(
      new Set(
        (input.tags ?? document.sourceAsset.tags ?? [])
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
    document.sourceAsset = {
      ...document.sourceAsset,
      tags,
      annotationNote: input.annotationNote?.trim() || null,
      lastAnnotatedAt: nowIso,
      annotatedBy: input.annotatedBy?.trim() || null,
      annotationSource: input.annotationSource?.trim() || 'workspace_manual',
      updatedAt: nowIso,
    };
    await writeStoredSourceAsset(input.projectDir, document);
    return document;
  }
}
