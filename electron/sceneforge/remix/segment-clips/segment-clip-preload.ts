import { contextBridge, ipcRenderer } from 'electron';
import type { RemixSourceAssetRefInput } from '../remix-ipc-types';

contextBridge.exposeInMainWorld('sceneForgeRemixSegmentClips', {
  exportSourceSegmentClips: (input: RemixSourceAssetRefInput) =>
    ipcRenderer.invoke('sceneForgeRemix:exportSourceSegmentClips', input),
  regenerateSourceSegmentClips: (input: RemixSourceAssetRefInput) =>
    ipcRenderer.invoke('sceneForgeRemix:regenerateSourceSegmentClips', input),
  openSourceSegmentClipFolder: (input: RemixSourceAssetRefInput & { segmentId?: string | null }) =>
    ipcRenderer.invoke('sceneForgeRemix:openSourceSegmentClipFolder', input),
});
