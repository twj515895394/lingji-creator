import { create } from 'zustand';
import type {
  SceneStageRunProgress,
  SceneStageRunnerType,
} from '../../../electron/sceneforge/pipeline/scene-stage-runner';
import type { SceneStageId } from '../../types/sceneforge';
import { useTaskProgressStore } from '../../store/task-progress';

export type SceneStageRunSessionStatus =
  | 'idle'
  | 'running'
  | 'ready'
  | 'submitting'
  | 'error';

export interface SceneStageRunSession {
  key: string;
  projectDir: string;
  stage: SceneStageId;
  taskId?: string | null;
  runnerType: SceneStageRunnerType;
  status: SceneStageRunSessionStatus;
  pendingArtifacts: Record<string, string> | null;
  pendingRequiredKeys: string[];
  refinementPrompt: string;
  lastHint: string | null;
  error: string | null;
  progress: SceneStageRunProgress | null;
  updatedAt: number;
}

interface SceneStageRunSessionStore {
  sessions: Map<string, SceneStageRunSession>;
  upsertSession: (
    input: Pick<SceneStageRunSession, 'projectDir' | 'stage'> &
      Partial<Omit<SceneStageRunSession, 'key' | 'projectDir' | 'stage' | 'updatedAt'>>,
  ) => void;
  clearPendingDraft: (projectDir: string, stage: SceneStageId, hint?: string | null) => void;
  removeSession: (projectDir: string, stage: SceneStageId) => void;
  rehydrateFromStorage: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'sceneforge-stage-run-sessions-v1';

export function getSceneStageRunSessionKey(projectDir: string, stage: SceneStageId): string {
  return `${projectDir}::${stage}`;
}

function now(): number {
  return Date.now();
}

function getSessionStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis && globalThis.sessionStorage) {
    return globalThis.sessionStorage;
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

function createEmptySession(
  projectDir: string,
  stage: SceneStageId,
  runnerType: SceneStageRunnerType = 'direct_llm',
): SceneStageRunSession {
  return {
    key: getSceneStageRunSessionKey(projectDir, stage),
    projectDir,
    stage,
    taskId: null,
    runnerType,
    status: 'idle',
    pendingArtifacts: null,
    pendingRequiredKeys: [],
    refinementPrompt: '',
    lastHint: null,
    error: null,
    progress: null,
    updatedAt: now(),
  };
}

function hasActiveSceneTask(taskId?: string | null): boolean {
  if (!taskId) {
    return false;
  }
  const task = useTaskProgressStore.getState().tasks.get(taskId);
  return task?.status === 'active';
}

function normalizeHydratedSession(session: SceneStageRunSession): SceneStageRunSession {
  if (session.status !== 'running' && session.status !== 'submitting') {
    return session;
  }
  if (hasActiveSceneTask(session.taskId)) {
    return session;
  }
  if (session.pendingArtifacts && Object.keys(session.pendingArtifacts).length > 0) {
    return {
      ...session,
      status: 'ready',
      lastHint: session.lastHint ?? '已恢复未提交草案，请确认后继续。',
      error: session.error ?? null,
    };
  }
  return {
    ...session,
    status: 'idle',
    lastHint: '页面恢复时检测到该阶段曾在执行中；若当前未看到结果，请重新运行。',
    error: null,
  };
}

function serializeSessions(sessions: Map<string, SceneStageRunSession>): string {
  return JSON.stringify(Array.from(sessions.values()));
}

function readSessionsFromStorage(): Map<string, SceneStageRunSession> {
  const storage = getSessionStorage();
  if (!storage) {
    return new Map();
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Map();
    }
    const parsed = JSON.parse(raw) as SceneStageRunSession[];
    if (!Array.isArray(parsed)) {
      return new Map();
    }
    return new Map(
      parsed.map((session) => {
        const normalized = normalizeHydratedSession(session);
        return [normalized.key, normalized] as const;
      }),
    );
  } catch {
    return new Map();
  }
}

function persistSessions(sessions: Map<string, SceneStageRunSession>): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    if (sessions.size === 0) {
      storage.removeItem(STORAGE_KEY);
      return;
    }
    storage.setItem(STORAGE_KEY, serializeSessions(sessions));
  } catch {
    // ignore storage failures and keep in-memory state usable
  }
}

export const useSceneStageRunSessionStore = create<SceneStageRunSessionStore>((set, get) => ({
  sessions: readSessionsFromStorage(),

  upsertSession: (input) => {
    const key = getSceneStageRunSessionKey(input.projectDir, input.stage);
    const current =
      get().sessions.get(key) ??
      createEmptySession(input.projectDir, input.stage, input.runnerType ?? 'direct_llm');
    const next = new Map(get().sessions);
    next.set(key, {
      ...current,
      ...input,
      key,
      updatedAt: now(),
    });
    persistSessions(next);
    set({ sessions: next });
  },

  clearPendingDraft: (projectDir, stage, hint = null) => {
    const key = getSceneStageRunSessionKey(projectDir, stage);
    const current =
      get().sessions.get(key) ?? createEmptySession(projectDir, stage);
    const next = new Map(get().sessions);
    next.set(key, {
      ...current,
      status: 'idle',
      pendingArtifacts: null,
      pendingRequiredKeys: [],
      refinementPrompt: '',
      lastHint: hint,
      error: null,
      progress: null,
      updatedAt: now(),
    });
    persistSessions(next);
    set({ sessions: next });
  },

  removeSession: (projectDir, stage) => {
    const key = getSceneStageRunSessionKey(projectDir, stage);
    const next = new Map(get().sessions);
    next.delete(key);
    persistSessions(next);
    set({ sessions: next });
  },

  rehydrateFromStorage: () => {
    set({ sessions: readSessionsFromStorage() });
  },

  reset: () => {
    persistSessions(new Map());
    set({ sessions: new Map() });
  },
}));
