import fs from 'node:fs/promises';
import path from 'node:path';
import type { SourceSegment } from '../../../../src/sceneforge/remix/types';
import { getRemixSourceAssetDir, getRemixSourceSegmentsDir } from '../remix-artifact-paths';
import { resolveProjectFile } from '../remix-validators';
import {
  buildSourceAssetSnapshot,
  readStoredSourceAsset,
  readStoredSourceAssetJobs,
  writeStoredSourceAsset,
} from '../remix-store';
import { writeSegmentArtifacts } from '../remix-segmentation-service';
import { SegmentClipService } from './segment-clip-service';
import type { ExportSegmentClipsResult } from './segment-clip-exporter';

export const SEGMENT_CLIP_MAINTENANCE_MODULE_READY = true;

function timeLabel(ms: number): string {
  const value = Math.max(0, Math.round(ms));
  const seconds = Math.floor(value / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}-${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}-${String(seconds % 60).padStart(2, '0')}-${String(value % 1000).padStart(3, '0')}`;
}

export function getSourceSegmentClipPackageDir(sourceAssetId: string): string {
  return path.posix.join(getRemixSourceAssetDir(sourceAssetId), 'exported_clips');
}

export function getSourceSegmentPackageClipPath(sourceAssetId: string, segment: SourceSegment): string {
  return path.posix.join(
    getSourceSegmentClipPackageDir(sourceAssetId),
    `${String(segment.index).padStart(3, '0')}_${timeLabel(segment.timeRange.startMs)}_${timeLabel(segment.timeRange.endMs)}_${segment.id}.mp4`,
  );
}

export async function loadSourceAssetForClipMaintenance(input: { projectDir: string; sourceAssetId: string }) {
  return readStoredSourceAsset(input.projectDir, input.sourceAssetId);
}

export async function exportSourceSegmentClips(input: { projectDir: string; sourceAssetId: string }): Promise<ExportSegmentClipsResult> {
  const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
  if (document.sourceAsset.segments.length === 0) throw new Error('没有可导出的分镜片段，请先运行切片。');
  const outputDir = resolveProjectFile(input.projectDir, getSourceSegmentClipPackageDir(input.sourceAssetId));
  await fs.rm(outputDir, { recursive: true, force: true });
  const exportSegments = document.sourceAsset.segments.map((segment) => ({ ...segment, sourceClipPath: getSourceSegmentPackageClipPath(input.sourceAssetId, segment) }));
  await new SegmentClipService().generateClips({ projectDir: input.projectDir, sourceVideoPath: document.sourceAsset.sourceVideoPath, sourceAssetId: input.sourceAssetId, segments: exportSegments, mode: 'reencode_accurate', overwrite: true });
  const items = exportSegments.map((segment) => ({ segmentId: segment.id, fileName: path.posix.basename(segment.sourceClipPath), exportedPath: resolveProjectFile(input.projectDir, segment.sourceClipPath), startMs: segment.timeRange.startMs, endMs: segment.timeRange.endMs, durationMs: segment.timeRange.durationMs }));
  const manifestPath = path.join(outputDir, 'clips_manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify({ sourceAssetId: input.sourceAssetId, exportedAt: new Date().toISOString(), items }, null, 2)}\n`, 'utf8');
  return { outputDir, manifestPath, totalCount: document.sourceAsset.segments.length, exportedCount: items.length, items };
}

export async function regenerateSourceSegmentClips(input: { projectDir: string; sourceAssetId: string }) {
  const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
  const clipGeneration = await writeSegmentArtifacts(
    input.projectDir,
    document.sourceAsset.sourceVideoPath,
    input.sourceAssetId,
    document.sourceAsset.segments,
  );
  document.sourceAsset.updatedAt = new Date().toISOString();
  document.sourceAsset.segmentationDiagnostics = document.sourceAsset.segmentationDiagnostics
    ? {
        ...document.sourceAsset.segmentationDiagnostics,
        clipGeneration,
        generatedAt: document.sourceAsset.updatedAt,
      }
    : null;
  await writeStoredSourceAsset(input.projectDir, document);
  const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
  return { clipGeneration, snapshot: buildSourceAssetSnapshot(document, jobsDocument.jobs) };
}

export async function resolveSourceSegmentClipFolder(input: { projectDir: string; sourceAssetId: string; segmentId?: string | null }) {
  const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
  const segment = input.segmentId ? document.sourceAsset.segments.find((item) => item.id === input.segmentId) : null;
  const targetPath = segment
    ? resolveProjectFile(input.projectDir, segment.sourceClipPath)
    : resolveProjectFile(input.projectDir, getRemixSourceSegmentsDir(input.sourceAssetId));
  return { openedPath: segment ? path.dirname(targetPath) : targetPath, targetPath };
}
