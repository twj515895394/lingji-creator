import { ipcMain } from 'electron';
import type { RemixSourceAssetRefInput } from '../remix-ipc-types';
import { regenerateSourceSegmentClips } from './segment-clip-maintenance';

export function registerSceneForgeRemixSegmentClipIpc(): void {
  ipcMain.handle(
    'sceneForgeRemix:regenerateSourceSegmentClips',
    async (_event, input: RemixSourceAssetRefInput) => regenerateSourceSegmentClips(input),
  );
}
