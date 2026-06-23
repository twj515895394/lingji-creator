import type { RemixIpcContract } from '../../../../electron/sceneforge/remix/remix-ipc-types';
import { createMockRemixApi, remixMockApi } from '../mock/mock-api';

export type RemixApiClientMode = 'mock' | 'electron';

interface RemixApiGlobal {
  electronAPI?: {
    sceneForgeRemix?: RemixIpcContract;
  };
}

export interface CreateRemixApiClientOptions {
  mode?: RemixApiClientMode;
  electronApi?: RemixIpcContract | null;
}

function readConfiguredMode(): RemixApiClientMode | null {
  const mode = import.meta.env.VITE_SCENEFORGE_REMIX_API_MODE;
  if (mode === 'mock' || mode === 'electron') {
    return mode;
  }
  return null;
}

export function resolveRemixApiClientMode(
  globalObject: RemixApiGlobal = globalThis as RemixApiGlobal,
): RemixApiClientMode {
  const configuredMode = readConfiguredMode();
  if (configuredMode) {
    return configuredMode;
  }
  if (globalObject.electronAPI?.sceneForgeRemix) {
    return 'electron';
  }
  return 'mock';
}

export function createRemixApiClient(
  options: CreateRemixApiClientOptions = {},
  globalObject: RemixApiGlobal = globalThis as RemixApiGlobal,
): RemixIpcContract {
  const mode = options.mode ?? resolveRemixApiClientMode(globalObject);
  if (mode === 'mock') {
    return createMockRemixApi();
  }

  const electronApi = options.electronApi ?? globalObject.electronAPI?.sceneForgeRemix ?? null;
  if (!electronApi) {
    throw new Error('SceneForge Remix electron API is unavailable in electron mode.');
  }

  return electronApi;
}

export const remixApiClient = createRemixApiClient();
export const remixMockApiClient = remixMockApi;
