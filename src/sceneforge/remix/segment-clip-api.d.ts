import type { RemixSourceAssetRefInput } from '../../../electron/sceneforge/remix/remix-ipc-types';
import type { ExportSegmentClipsResult } from '../../../electron/sceneforge/remix/segment-clips/segment-clip-exporter';
import type { SegmentClipGenerationSummary } from '../../../electron/sceneforge/remix/segment-clips/segment-clip-service';
import type { RemixAssetProcessingSnapshot } from './types';

export interface RemixSegmentClipFolderResult {
  openedPath: string;
  targetPath: string;
}

export interface RemixSegmentClipApi {
  exportSourceSegmentClips(input: RemixSourceAssetRefInput): Promise<ExportSegmentClipsResult>;
  regenerateSourceSegmentClips(input: RemixSourceAssetRefInput): Promise<{
    clipGeneration: SegmentClipGenerationSummary;
    snapshot: RemixAssetProcessingSnapshot;
  }>;
  openSourceSegmentClipFolder(
    input: RemixSourceAssetRefInput & { segmentId?: string | null },
  ): Promise<RemixSegmentClipFolderResult>;
}

declare global {
  interface Window {
    sceneForgeRemixSegmentClips?: RemixSegmentClipApi;
  }
}

export {};
