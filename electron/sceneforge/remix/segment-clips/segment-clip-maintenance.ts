import {
  buildSourceAssetSnapshot,
  readStoredSourceAsset,
  readStoredSourceAssetJobs,
  writeStoredSourceAsset,
} from '../remix-store';
import { writeSegmentArtifacts } from '../remix-segmentation-service';

export const SEGMENT_CLIP_MAINTENANCE_MODULE_READY = true;

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
