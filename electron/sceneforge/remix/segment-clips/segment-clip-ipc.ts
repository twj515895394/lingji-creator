import { ipcMain } from 'electron';
import type { RemixSourceAssetRefInput } from '../remix-ipc-types';
import {
  exportSourceSegmentClips,
  regenerateSourceSegmentClips,
  resolveSourceSegmentClipFolder,
} from './segment-clip-maintenance';

export function registerSceneForgeRemixSegmentClipIpc(): void {
  ipcMain.handle(
    'sceneForgeRemix:exportSourceSegmentClips',
    async (_event, input: RemixSourceAssetRefInput) => exportSourceSegmentClips(input),
  );
  ipcMain.handle(
    'sceneForgeRemix:regenerateSourceSegmentClips',
    async (_event, input: RemixSourceAssetRefInput) => regenerateSourceSegmentClips(input),
  );
  ipcMain.handle(
    'sceneForgeRemix:openSourceSegmentClipFolder',
    async (_event, input: RemixSourceAssetRefInput & { segmentId?: string | null }) =>
      resolveSourceSegmentClipFolder(input),
  );
}
