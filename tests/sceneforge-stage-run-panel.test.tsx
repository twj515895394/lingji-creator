import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { SceneRunDraftReview } from '../src/sceneforge/components/stage-run/SceneRunDraftReview';

const hookState: unknown[] = [];
let hookCursor = 0;

function resetHookCursor() {
  hookCursor = 0;
}

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: <S,>(init: S | (() => S)) => {
      const index = hookCursor++;
      if (!(index in hookState)) {
        hookState[index] =
          typeof init === 'function' ? (init as () => S)() : init;
      }
      const setState = (value: S | ((prev: S) => S)) => {
        const previous = hookState[index] as S;
        hookState[index] =
          typeof value === 'function' ? (value as (prev: S) => S)(previous) : value;
      };
      return [hookState[index] as S, setState] as const;
    },
    useEffect: () => undefined,
    useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
    useMemo: <T,>(factory: () => T) => factory(),
    useRef: <T,>(value: T) => ({ current: value }),
  };
});

vi.mock('../src/sceneforge/store/scene-stage-run-session', () => {
  let sessions = new Map<string, {
    key: string;
    projectDir: string;
    stage: string;
    runnerType: string;
    status: string;
    pendingArtifacts: Record<string, string> | null;
    pendingRequiredKeys: string[];
    refinementPrompt: string;
    lastHint: string | null;
    error: string | null;
    progress: {
      projectDir: string;
      stage: string;
      runnerType: string;
      phaseKey: string;
      phaseLabel: string;
      current: number;
      total: number;
    } | null;
    updatedAt: number;
  }>();

  const getKey = (projectDir: string, stage: string) => `${projectDir}::${stage}`;

  const store = {
    sessions,
    upsertSession: (input: Record<string, unknown>) => {
      const key = getKey(input.projectDir as string, input.stage as string);
      const current = sessions.get(key) ?? {
        key,
        projectDir: input.projectDir as string,
        stage: input.stage as string,
        runnerType: 'direct_llm',
        status: 'idle',
        pendingArtifacts: null,
        pendingRequiredKeys: [],
        refinementPrompt: '',
        lastHint: null,
        error: null,
        progress: null,
        updatedAt: 0,
      };
      sessions.set(key, {
        ...current,
        ...input,
        key,
        updatedAt: Date.now(),
      });
    },
    clearPendingDraft: (projectDir: string, stage: string, hint: string | null = null) => {
      const key = getKey(projectDir, stage);
      const current = sessions.get(key);
      sessions.set(key, {
        ...(current ?? {
          key,
          projectDir,
          stage,
          runnerType: 'direct_llm',
        }),
        status: 'idle',
        pendingArtifacts: null,
        pendingRequiredKeys: [],
        refinementPrompt: '',
        lastHint: hint,
        error: null,
        progress: null,
        updatedAt: Date.now(),
      });
    },
    removeSession: (projectDir: string, stage: string) => {
      sessions.delete(getKey(projectDir, stage));
    },
    reset: () => {
      sessions = new Map();
      store.sessions = sessions;
    },
  };

  const useSceneStageRunSessionStore = ((selector?: (state: typeof store) => unknown) =>
    selector ? selector(store) : store) as unknown as {
    (selector?: (state: typeof store) => unknown): unknown;
    getState: () => typeof store;
  };
  useSceneStageRunSessionStore.getState = () => store;

  return {
    getSceneStageRunSessionKey: getKey,
    useSceneStageRunSessionStore,
  };
});

import { StageRunPanel } from '../src/sceneforge/components/stage-run/StageRunPanel';
import { useSceneStageRunSessionStore } from '../src/sceneforge/store/scene-stage-run-session';

function clearHookState() {
  hookState.length = 0;
  resetHookCursor();
}

function renderStageRunPanel(props: Parameters<typeof StageRunPanel>[0]): ReactElement {
  resetHookCursor();
  return StageRunPanel(props) as ReactElement;
}

function findElement(
  node: unknown,
  predicate: (el: ReactElement) => boolean,
): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;
  const props = node.props as { children?: ReactNode };
  return findElement(props.children, predicate);
}

describe('StageRunPanel draft submit protection', () => {
  beforeEach(() => {
    clearHookState();
    vi.unstubAllGlobals();
    useSceneStageRunSessionStore.getState().reset();
  });

  it('keeps pending draft review visible when submit returns validation failure', async () => {
    const sceneSubmitStageDraft = vi.fn().mockResolvedValue({
      validation: {
        status: 'failed',
        errors: [{ code: 'SCENE_BAD_DRAFT', message: '草案校验失败' }],
      },
    });

    vi.stubGlobal('window', {
      electronAPI: {
        sceneSubmitStageDraft,
      },
    });

    const baseProps = {
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard' as const,
      stageTitle: '分镜提示词',
      initialRunResult: {
        runnerType: 'direct_llm' as const,
        stage: 'storyboard' as const,
        artifacts: {
          storyboard_prompt_pack: '# 自动生成草案',
        },
        requiredArtifacts: ['storyboard_prompt_pack'],
      },
    };

    const firstTree = renderStageRunPanel(baseProps);
    const draftReviewNode = findElement(
      firstTree,
      (el) =>
        el.type === SceneRunDraftReview,
    );
    expect(draftReviewNode).not.toBeNull();

    await (draftReviewNode!.props as { onSubmit: () => Promise<void> }).onSubmit();

    const rerenderedTree = renderStageRunPanel(baseProps);
    const draftReview = findElement(
      rerenderedTree,
      (el) => el.type === SceneRunDraftReview,
    );
    const errorAlert = findElement(
      rerenderedTree,
      (el) =>
        (el.props as { description?: string }).description === '草案校验失败',
    );

    expect(sceneSubmitStageDraft).toHaveBeenCalledTimes(1);
    expect(draftReview).not.toBeNull();
    expect(errorAlert).not.toBeNull();
  });

  it('restores pending draft review from the stage run session store after rerender', () => {
    vi.stubGlobal('window', {
      electronAPI: {},
    });

    useSceneStageRunSessionStore.getState().upsertSession({
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard',
      runnerType: 'direct_llm',
      status: 'ready',
      pendingArtifacts: {
        storyboard_prompt_pack: '# 已缓存草案',
      },
      pendingRequiredKeys: ['storyboard_prompt_pack'],
      lastHint: '已恢复上次草案',
    });

    const tree = renderStageRunPanel({
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard',
      stageTitle: '分镜提示词',
      initialRunResult: null,
    });

    const draftReview = findElement(tree, (el) => el.type === SceneRunDraftReview);
    const restoredHint = findElement(
      tree,
      (el) => typeof el.props?.children === 'string' && el.props.children.includes('已恢复上次草案'),
    );

    expect(draftReview).not.toBeNull();
    expect(restoredHint).not.toBeNull();
  });

  it('restores runnerType from the cached stage session', () => {
    vi.stubGlobal('window', {
      electronAPI: {},
    });

    useSceneStageRunSessionStore.getState().upsertSession({
      projectDir: '/tmp/sceneforge-project',
      stage: 'reference',
      runnerType: 'manual_submit',
      status: 'ready',
      lastHint: '恢复手动提交模式',
    });

    const tree = renderStageRunPanel({
      projectDir: '/tmp/sceneforge-project',
      stage: 'reference',
      stageTitle: '参考分析',
      initialRunResult: null,
    });

    const select = findElement(
      tree,
      (el) => (el.props as { 'data-testid'?: string })['data-testid'] === 'scene-runner-select',
    );

    expect(select).not.toBeNull();
    expect((select!.props as { value: string }).value).toBe('manual_submit');
  });

  it('shows a live run signal card while the stage session is running', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage: vi.fn(),
      },
    });

    useSceneStageRunSessionStore.getState().upsertSession({
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard',
      runnerType: 'direct_llm',
      status: 'running',
      lastHint: null,
      progress: {
        projectDir: '/tmp/sceneforge-project',
        stage: 'storyboard',
        runnerType: 'direct_llm',
        phaseKey: 'phase-2-control-board',
        phaseLabel: '生成控制板提示词',
        current: 2,
        total: 4,
      },
    });

    const tree = renderStageRunPanel({
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard',
      stageTitle: '分镜提示词',
      initialRunResult: null,
    });

    const signalCard = findElement(
      tree,
      (el) => (el.props as { 'data-testid'?: string })['data-testid'] === 'scene-run-signal-card',
    );

    expect(signalCard).not.toBeNull();
    expect((signalCard!.props as { 'aria-live'?: string })['aria-live']).toBe('polite');
  });

  it('renders storyboard phase progress copy when direct_llm reports multi-phase progress', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage: vi.fn(),
      },
    });

    useSceneStageRunSessionStore.getState().upsertSession({
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard',
      runnerType: 'direct_llm',
      status: 'running',
      lastHint: null,
      progress: {
        projectDir: '/tmp/sceneforge-project',
        stage: 'storyboard',
        runnerType: 'direct_llm',
        phaseKey: 'phase-3-style-board',
        phaseLabel: '生成风格板提示词',
        current: 3,
        total: 4,
      },
    });

    const tree = renderStageRunPanel({
      projectDir: '/tmp/sceneforge-project',
      stage: 'storyboard',
      stageTitle: '分镜提示词',
      initialRunResult: null,
    });

    const phaseCopy = findElement(
      tree,
      (el) => typeof el.props?.children === 'string' && el.props.children.includes('生成风格板提示词（3/4）'),
    );
    const stepCopy = findElement(
      tree,
      (el) => typeof el.props?.children === 'string' && el.props.children.includes('第 3 / 4 段'),
    );

    expect(phaseCopy).not.toBeNull();
    expect(stepCopy).not.toBeNull();
  });

  it('disables rerun after the draft has already been submitted', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage: vi.fn(),
      },
    });

    const tree = renderStageRunPanel({
      projectDir: '/tmp/sceneforge-project',
      stage: 'reference',
      stageTitle: '参考分析',
      currentStatus: 'draft_submitted',
      initialRunResult: null,
    });

    const runButton = findElement(
      tree,
      (el) => (el.props as { 'data-testid'?: string })['data-testid'] === 'scene-run-stage-button',
    );

    expect(runButton).not.toBeNull();
    expect((runButton!.props as { disabled?: boolean }).disabled).toBe(true);
    expect((runButton!.props as { title?: string }).title).toContain('草案已提交');
  });

  it('offers a reopen-and-regenerate path for submitted stages across the shared panel', async () => {
    const sceneRequestRevision = vi.fn().mockResolvedValue(undefined);
    const sceneRunStage = vi.fn().mockResolvedValue({
      runnerType: 'direct_llm',
      stage: 'reference',
      artifacts: {
        reference_notes: '# 新草案',
      },
      requiredArtifacts: ['reference_notes'],
    });
    vi.stubGlobal('window', {
      electronAPI: {
        sceneRunStage,
        sceneRequestRevision,
      },
    });

    const baseProps = {
      projectDir: '/tmp/sceneforge-project',
      stage: 'reference' as const,
      stageTitle: '参考分析',
      currentStatus: 'approved' as const,
      initialRunResult: null,
      onRevisionRequested: vi.fn(),
    };

    const firstTree = renderStageRunPanel(baseProps);
    const reopenButton = findElement(
      firstTree,
      (el) => (el.props as { 'data-testid'?: string })['data-testid'] === 'scene-reopen-regenerate-button',
    );
    expect(reopenButton).not.toBeNull();

    (reopenButton!.props as { onClick: () => void }).onClick();

    const secondTree = renderStageRunPanel(baseProps);
    const confirmButton = findElement(
      secondTree,
      (el) => (el.props as { 'data-testid'?: string })['data-testid'] === 'scene-confirm-reopen-button',
    );
    expect(confirmButton).not.toBeNull();

    await (confirmButton!.props as { onClick: () => Promise<void> }).onClick();

    expect(sceneRequestRevision).toHaveBeenCalledTimes(1);
    expect(sceneRequestRevision).toHaveBeenCalledWith(
      '/tmp/sceneforge-project',
      'reference',
      expect.stringContaining('重新生成一版新草案'),
    );
    expect(sceneRunStage).toHaveBeenCalledTimes(1);
    expect(sceneRunStage).toHaveBeenCalledWith({
      projectDir: '/tmp/sceneforge-project',
      stage: 'reference',
      runnerType: 'direct_llm',
      currentDraftArtifacts: undefined,
      refinementPrompt: undefined,
    });
    expect(baseProps.onRevisionRequested).toHaveBeenCalledTimes(1);
  });
});
