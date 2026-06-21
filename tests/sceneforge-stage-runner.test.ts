import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSceneForgeProject } from '../electron/sceneforge/project/scene-project-file';
import { createAcpAgentStageRunner } from '../electron/sceneforge/runners/scene-acp-agent-runner';
import { createDirectLlmStageRunner } from '../electron/sceneforge/runners/scene-direct-llm-runner';
import { MOCK_LLM_SETTINGS } from './sceneforge-mock-llm-settings';
import { SceneForgeService } from '../electron/sceneforge/service';

let tmpDir: string;
let service: SceneForgeService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-run-stage-'));
  await createSceneForgeProject(tmpDir);
  service = new SceneForgeService();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('SceneForge stage runner', () => {
  it('manual runner returns draft and does not submit by itself', async () => {
    const submitStageDraft = vi.fn();
    const result = await service.runStage({
      projectDir: tmpDir,
      stage: 'design',
      runnerType: 'manual_submit',
      manualArtifacts: { design_prompts: '# Design' },
    });

    expect(result.runnerType).toBe('manual_submit');
    expect(result.artifacts).toEqual({ design_prompts: '# Design' });
    expect(submitStageDraft).not.toHaveBeenCalled();
    const state = await service.getProjectState(tmpDir);
    expect(state.artifacts).toEqual([]);
  });

  it('direct_llm via runStage uses injectable runner and does not write manifest', async () => {
    const generateText = vi.fn().mockResolvedValue(
      JSON.stringify({
        design_prompts: '# D',
        character_prompts: '# C',
        scene_prompts: '# S',
        prop_prompts: '# P',
        master_reference_prompt: '# M',
      }),
    );

    const runner = createDirectLlmStageRunner({
      loadSettings: async () => MOCK_LLM_SETTINGS,
      generateText,
    });

    const submitStageDraft = vi.fn();
    const result = await runner.run({
      projectDir: tmpDir,
      stage: 'design',
      stageContext: await service.getStageContext(tmpDir, 'design', { runner: 'direct_llm' }),
      submitStageDraft,
    });

    expect(result.artifacts.design_prompts).toBe('# D');
    expect(submitStageDraft).not.toHaveBeenCalled();
    expect((await service.getProjectState(tmpDir)).artifacts).toEqual([]);
  });

  it('acp_agent returns structured draft when ACP is available', async () => {
    const runner = createAcpAgentStageRunner({
      isAgentConfigured: async () => true,
      runAgentTurn: vi.fn().mockResolvedValue(
        JSON.stringify({
          design_prompts: '# D',
          character_prompts: '# C',
          scene_prompts: '# S',
          prop_prompts: '# P',
          master_reference_prompt: '# M',
        }),
      ),
    });
    const result = await runner.run({
      projectDir: tmpDir,
      stage: 'design',
      stageContext: await service.getStageContext(tmpDir, 'design', { runner: 'acp_agent' }),
      submitStageDraft: vi.fn(),
    });

    expect(result.runnerType).toBe('acp_agent');
    expect(result.artifacts.design_prompts).toBe('# D');
  });

  it('acp_agent throws friendly error when ACP is not configured', async () => {
    const runner = createAcpAgentStageRunner({
      isAgentConfigured: async () => false,
      runAgentTurn: vi.fn(),
    });
    await expect(
      runner.run({
        projectDir: tmpDir,
        stage: 'design',
        stageContext: await service.getStageContext(tmpDir, 'design', { runner: 'acp_agent' }),
        submitStageDraft: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: 'SCENE_ACP_NO_AGENT' });
  });
});
