import { readStoredSourceAsset } from '../remix-store';

export const SEGMENT_CLIP_MAINTENANCE_MODULE_READY = true;

export async function loadSourceAssetForClipMaintenance(input: { projectDir: string; sourceAssetId: string }) {
  return readStoredSourceAsset(input.projectDir, input.sourceAssetId);
}
