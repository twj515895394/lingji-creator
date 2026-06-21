import { describe, expect, it, vi } from 'vitest';
import { continueSceneStage } from '../src/sceneforge/hooks/useSceneStageContinuation';

describe('SceneForge publish terminal continuation', () => {
  it('finalizes project instead of navigating when on publish', async () => {
    const approve = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    const finalizeProject = vi.fn().mockResolvedValue(undefined);

    const result = await continueSceneStage(
      {
        currentStage: 'publish',
        currentStatus: 'completed',
        mode: 'navigate',
        runnerType: 'direct_llm',
      },
      { approve, navigate, run: vi.fn(), finalizeProject },
    );

    expect(result.nextStage).toBeNull();
    expect(finalizeProject).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});