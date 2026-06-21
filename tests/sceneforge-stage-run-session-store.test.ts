import { beforeEach, describe, expect, it } from 'vitest';
import {
  getSceneStageRunSessionKey,
  useSceneStageRunSessionStore,
} from '../src/sceneforge/store/scene-stage-run-session';
import { useTaskProgressStore } from '../src/store/task-progress';
import { createStorageMock } from './helpers/storage-mock';

describe('scene-stage-run-session store', () => {
  beforeEach(() => {
    const sessionStorage = createStorageMock();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: sessionStorage,
    });
    useSceneStageRunSessionStore.getState().reset();
    const taskStore = useTaskProgressStore.getState();
    taskStore.tasks.forEach((_, id) => taskStore.removeTask(id));
  });

  it('stores session state by projectDir and stage', () => {
    const store = useSceneStageRunSessionStore.getState();
    store.upsertSession({
      projectDir: '/tmp/project-a',
      stage: 'design',
      runnerType: 'direct_llm',
      status: 'running',
      lastHint: '运行中',
    });

    const session = useSceneStageRunSessionStore
      .getState()
      .sessions.get(getSceneStageRunSessionKey('/tmp/project-a', 'design'));

    expect(session).toMatchObject({
      projectDir: '/tmp/project-a',
      stage: 'design',
      runnerType: 'direct_llm',
      status: 'running',
      lastHint: '运行中',
    });
  });

  it('clears pending draft but keeps latest hint for the stage', () => {
    const store = useSceneStageRunSessionStore.getState();
    store.upsertSession({
      projectDir: '/tmp/project-a',
      stage: 'storyboard',
      runnerType: 'direct_llm',
      status: 'ready',
      pendingArtifacts: { storyboard_prompt_pack: '# draft' },
      pendingRequiredKeys: ['storyboard_prompt_pack'],
      refinementPrompt: '加强镜头语言',
      error: 'old error',
    });

    store.clearPendingDraft('/tmp/project-a', 'storyboard', '已提交 1 个产物到产物库。');

    const session = useSceneStageRunSessionStore
      .getState()
      .sessions.get(getSceneStageRunSessionKey('/tmp/project-a', 'storyboard'));

    expect(session).toMatchObject({
      status: 'idle',
      pendingArtifacts: null,
      pendingRequiredKeys: [],
      refinementPrompt: '',
      lastHint: '已提交 1 个产物到产物库。',
      error: null,
    });
  });

  it('keeps sessions isolated between stages', () => {
    const store = useSceneStageRunSessionStore.getState();
    store.upsertSession({
      projectDir: '/tmp/project-a',
      stage: 'reference',
      runnerType: 'direct_llm',
      status: 'ready',
      pendingArtifacts: { reference_notes: '# notes' },
      pendingRequiredKeys: ['reference_notes'],
    });
    store.upsertSession({
      projectDir: '/tmp/project-a',
      stage: 'story',
      runnerType: 'direct_llm',
      status: 'running',
    });

    const reference = useSceneStageRunSessionStore
      .getState()
      .sessions.get(getSceneStageRunSessionKey('/tmp/project-a', 'reference'));
    const story = useSceneStageRunSessionStore
      .getState()
      .sessions.get(getSceneStageRunSessionKey('/tmp/project-a', 'story'));

    expect(reference?.pendingArtifacts).toEqual({ reference_notes: '# notes' });
    expect(story?.status).toBe('running');
  });

  it('rehydrates cached sessions from sessionStorage and downgrades transient running state', () => {
    sessionStorage.setItem(
      'sceneforge-stage-run-sessions-v1',
      JSON.stringify([
        {
          key: getSceneStageRunSessionKey('/tmp/project-a', 'design'),
          projectDir: '/tmp/project-a',
          stage: 'design',
          runnerType: 'direct_llm',
          status: 'running',
          pendingArtifacts: { design_prompts: '# draft' },
          pendingRequiredKeys: ['design_prompts'],
          refinementPrompt: '',
          lastHint: null,
          error: null,
          updatedAt: Date.now(),
        },
      ]),
    );

    useSceneStageRunSessionStore.getState().rehydrateFromStorage();

    const session = useSceneStageRunSessionStore
      .getState()
      .sessions.get(getSceneStageRunSessionKey('/tmp/project-a', 'design'));

    expect(session).toMatchObject({
      status: 'ready',
      pendingArtifacts: { design_prompts: '# draft' },
      lastHint: '已恢复未提交草案，请确认后继续。',
    });
  });

  it('keeps running state when the linked global task is still active', () => {
    useTaskProgressStore.getState().startTask({
      id: 'scene-run-reference-active',
      category: 'ai-write',
      label: 'SceneForge · 参考分析',
      mode: 'indeterminate',
      progress: 0,
      phase: '调用 LLM',
      level: 2,
      canCancel: false,
    });

    sessionStorage.setItem(
      'sceneforge-stage-run-sessions-v1',
      JSON.stringify([
        {
          key: getSceneStageRunSessionKey('/tmp/project-a', 'reference'),
          projectDir: '/tmp/project-a',
          stage: 'reference',
          taskId: 'scene-run-reference-active',
          runnerType: 'direct_llm',
          status: 'running',
          pendingArtifacts: null,
          pendingRequiredKeys: [],
          refinementPrompt: '',
          lastHint: null,
          error: null,
          updatedAt: Date.now(),
        },
      ]),
    );

    useSceneStageRunSessionStore.getState().rehydrateFromStorage();

    const session = useSceneStageRunSessionStore
      .getState()
      .sessions.get(getSceneStageRunSessionKey('/tmp/project-a', 'reference'));

    expect(session).toMatchObject({
      status: 'running',
      taskId: 'scene-run-reference-active',
      lastHint: null,
    });
  });
});
