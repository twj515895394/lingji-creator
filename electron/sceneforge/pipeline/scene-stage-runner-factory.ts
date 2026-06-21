import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';
import { generateText } from '../../../src/lib/llm';
import { HeadlessAcpProvider } from '../../acp/headless-provider';
import { loadFullHeadlessAISettings } from '../../pipeline/headless-settings';
import type { SceneStageContext } from './scene-context-builder';
import { createAcpAgentStageRunner } from '../runners/scene-acp-agent-runner';
import { createDirectLlmStageRunner } from '../runners/scene-direct-llm-runner';
import {
  createManualStageRunner,
  createSceneStageRunner,
  type SceneStageRunner,
  type SceneStageRunnerInput,
  type SceneStageRunnerType,
} from './scene-stage-runner';

const ACP_CONFIG_PATH = path.join(os.homedir(), '.lingji', 'agent-config.json');

async function isAcpConfigured(): Promise<boolean> {
  try {
    const { AgentConfig } = await import('../../acp/config');
    const config = await new AgentConfig(ACP_CONFIG_PATH).load();
    const agent = config.agents?.['claude-acp'];
    return Boolean(agent && agent.enabled !== false);
  } catch {
    return false;
  }
}

export function createDefaultSceneStageRunner(type: SceneStageRunnerType): SceneStageRunner {
  if (type === 'manual_submit') {
    return createManualStageRunner();
  }
  if (type === 'direct_llm') {
    return createDirectLlmStageRunner({
      loadSettings: async () => {
        try {
          return await loadFullHeadlessAISettings(app.getPath('userData'));
        } catch {
          return null;
        }
      },
      generateText,
    });
  }
  if (type === 'acp_agent') {
    const provider = new HeadlessAcpProvider({
      eventSink: () => undefined,
    });
    return {
      type: 'acp_agent',
      run: async (input: SceneStageRunnerInput) => {
        const acpRunner = createAcpAgentStageRunner({
          isAgentConfigured: isAcpConfigured,
          runAgentTurn: async (prompt) => {
            const result = await provider.runPrompt({
              requestId: `sceneforge-acp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              model: 'claude-code-default',
              messages: [{ role: 'user', content: prompt }],
              projectDir: input.projectDir,
              jsonMode: true,
            });
            return result.text;
          },
        });
        return acpRunner.run({
          projectDir: input.projectDir,
          stage: input.stage,
          stageContext: input.stageContext as SceneStageContext,
          submitStageDraft: input.submitStageDraft,
          manualArtifacts: input.manualArtifacts,
        });
      },
    };
  }
  return createSceneStageRunner(type);
}
