import path from 'node:path';
import type { SourceSegment } from '../../../../src/sceneforge/remix/types';
import { getRemixSourceAssetDir } from '../remix-artifact-paths';
import {
  buildSourceAssetSnapshot,
  readStoredSourceAsset,
  readStoredSourceAssetJobs,
  writeStoredSourceAsset,
} from '../remix-store';
import { writeSegmentArtifacts } from '../remix-segmentation-service';

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
