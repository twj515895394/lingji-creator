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

/** 产品默认 electron；仅显式 VITE_SCENEFORGE_REMIX_API_MODE=mock 或 createRemixApiClient({ mode: 'mock' }) 走 mock。 */
export function resolveRemixApiClientMode(
  globalObject: RemixApiGlobal = globalThis as RemixApiGlobal,
): RemixApiClientMode {
  const configuredMode = readConfiguredMode();
  if (configuredMode) {
    return configuredMode;
  }
  return 'electron';
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

let cachedRemixApiClient: RemixIpcContract | null = null;

/** 惰性创建，避免在非 Electron 环境（单测 import）时模块加载即抛错。 */
export function getRemixApiClient(
  globalObject: RemixApiGlobal = globalThis as RemixApiGlobal,
): RemixIpcContract {
  if (!cachedRemixApiClient) {
    cachedRemixApiClient = createRemixApiClient({}, globalObject);
  }
  return cachedRemixApiClient;
}

export const remixMockApiClient = remixMockApi;
