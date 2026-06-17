import path from 'node:path';
import { app } from 'electron';
import { generateText } from '../../../src/lib/llm';
import { loadHeadlessAISettings } from '../../pipeline/headless-settings';
import { createAcpStageRunner } from '../runners/scene-acp-stage-runner';
import { createDirectLlmStageRunner } from '../runners/scene-direct-llm-runner';
import {
  createManualStageRunner,
  createSceneStageRunner,
  type SceneStageRunner,
  type SceneStageRunnerType,
} from './scene-stage-runner';

async function isAcpConfigured(): Promise<boolean> {
  try {
    const configPath = path.join(app.getPath('userData'), 'agent-config.json');
    const { AgentConfig } = await import('../../acp/config');
    const config = await new AgentConfig(configPath).load();
    return Object.keys(config.agents ?? {}).length > 0;
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
      loadSettings: async () => loadHeadlessAISettings(app.getPath('userData')),
      generateText,
    });
  }
  if (type === 'acp_agent') {
    return createAcpStageRunner({ isAcpAvailable: isAcpConfigured });
  }
  return createSceneStageRunner(type);
}