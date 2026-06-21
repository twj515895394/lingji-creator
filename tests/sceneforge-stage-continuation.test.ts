import { describe, expect, it, vi } from 'vitest';
import { continueSceneStage } from '../src/sceneforge/hooks/useSceneStageContinuation';

describe('SceneForge stage continuation orchestration', () => {
  it.each([
    ['required', 'waiting_approval' as const, 1],
    ['optional', 'validated' as const, 1],
    ['auto_if_valid', 'completed' as const, 0],
  ])('keeps %s policy status behavior', async (_policy, currentStatus, approveCalls) => {
    const approve = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn().mockResolvedValue(undefined);
    const run = vi.fn().mockResolvedValue({ stage: 'storyboard', artifacts: {} });

    await continueSceneStage(
      {
        currentStage: 'performance',
        currentStatus,
        mode: 'navigate',
        runnerType: 'direct_llm',
      },
      { approve, navigate, run },
    );

    expect(approve).toHaveBeenCalledTimes(approveCalls);
    expect(navigate).toHaveBeenCalledWith('storyboard');
    expect(run).not.toHaveBeenCalled();
  });

  it('does not navigate or run when approval fails', async () => {
    const approve = vi.fn().mockRejectedValue(new Error('approve failed'));
    const navigate = vi.fn();
    const run = vi.fn();
    const busyStates: Array<string | null> = [];

    await expect(
      continueSceneStage(
        {
          currentStage: 'performance',
          currentStatus: 'waiting_approval',
          mode: 'navigate_and_run',
          runnerType: 'direct_llm',
        },
        {
          approve,
          navigate,
          run,
          onBusyChange: (state) => busyStates.push(state),
        },
      ),
    ).rejects.toThrow('approve failed');

    expect(navigate).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(busyStates).toEqual(['approving', null]);
  });

  it('runs the next stage exactly once after successful navigation', async () => {
    const runResult = {
      runnerType: 'direct_llm' as const,
      stage: 'storyboard' as const,
      artifacts: { storyboard_prompt_pack: '# draft' },
    };
    const run = vi.fn().mockResolvedValue(runResult);

    const result = await continueSceneStage(
      {
        currentStage: 'performance',
        currentStatus: 'completed',
        mode: 'navigate_and_run',
        runnerType: 'direct_llm',
      },
      {
        approve: vi.fn(),
        navigate: vi.fn().mockResolvedValue(undefined),
        run,
      },
    );

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('storyboard', 'direct_llm');
    expect(result).toEqual({ nextStage: 'storyboard', runResult });
  });

  it('returns the next stage and error when the runner fails', async () => {
    const result = await continueSceneStage(
      {
        currentStage: 'performance',
        currentStatus: 'completed',
        mode: 'navigate_and_run',
        runnerType: 'direct_llm',
      },
      {
        approve: vi.fn(),
        navigate: vi.fn().mockResolvedValue(undefined),
        run: vi.fn().mockRejectedValue(new Error('provider failed')),
      },
    );

    expect(result.nextStage).toBe('storyboard');
    expect(result.runResult).toBeUndefined();
    expect(result.runError).toBe('provider failed');
  });
});
