import type { AISettings } from '../../../src/types/ai';
import { parseLLMJsonResponse } from '../../../src/lib/llm';
import type { SceneStageId } from '../types';
import type { SceneStageContext } from '../pipeline/scene-context-builder';
import { loadSceneStagePack } from '../pipeline/scene-stage-pack';
import {
  buildDirectLlmArtifactJsonInstruction,
  renderSceneStagePrompts,
} from '../pipeline/scene-prompt-renderer';
import type { SceneStageRunner, SceneStageRunnerInput, SceneStageRunnerResult } from '../pipeline/scene-stage-runner';

export type SceneDirectLlmGenerateText = (
  settings: AISettings,
  systemPrompt: string,
  userMessage: string,
) => Promise<string>;

export type SceneDirectLlmLoadSettings = () => Promise<AISettings | null>;

export interface SceneDirectLlmRunnerDeps {
  loadSettings: SceneDirectLlmLoadSettings;
  generateText: SceneDirectLlmGenerateText;
}

export class SceneDirectLlmRunnerError extends Error {
  code: 'SCENE_DIRECT_LLM_NO_SETTINGS' | 'SCENE_DIRECT_LLM_PARSE_FAILED' | 'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE';

  constructor(
    code: 'SCENE_DIRECT_LLM_NO_SETTINGS' | 'SCENE_DIRECT_LLM_PARSE_FAILED' | 'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE',
    message: string,
  ) {
    super(message);
    this.name = 'SceneDirectLlmRunnerError';
    this.code = code;
  }
}

const CORE_RUN_STAGES: SceneStageId[] = ['design', 'storyboard', 'video_prompts'];

function assertCoreRunStage(stage: SceneStageId): void {
  if (!CORE_RUN_STAGES.includes(stage)) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_UNSUPPORTED_STAGE',
      `direct_llm runner supports core stages only: ${CORE_RUN_STAGES.join(', ')}`,
    );
  }
}

function parseArtifactsFromLlm(
  raw: string,
  requiredKeys: string[],
): Record<string, string> {
  const parsed = parseLLMJsonResponse(raw) as Record<string, unknown>;
  const artifacts: Record<string, string> = {};
  for (const key of requiredKeys) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim()) {
      artifacts[key] = value;
    }
  }
  if (Object.keys(artifacts).length === 0) {
    throw new SceneDirectLlmRunnerError(
      'SCENE_DIRECT_LLM_PARSE_FAILED',
      'LLM JSON did not contain any required artifact keys',
    );
  }
  return artifacts;
}

export function createDirectLlmStageRunner(deps: SceneDirectLlmRunnerDeps): SceneStageRunner {
  return {
    type: 'direct_llm',
    async run(input: SceneStageRunnerInput): Promise<SceneStageRunnerResult> {
      assertCoreRunStage(input.stage);
      const stageContext = input.stageContext as SceneStageContext;
      const pack = await loadSceneStagePack(input.stage);
      const { systemPrompt, userPrompt } = renderSceneStagePrompts(pack, stageContext);
      const jsonHint = buildDirectLlmArtifactJsonInstruction(pack.outputContract.requiredArtifacts);

      const settings = await deps.loadSettings();
      if (!settings) {
        throw new SceneDirectLlmRunnerError(
          'SCENE_DIRECT_LLM_NO_SETTINGS',
          '未找到应用 LLM 设置，请先在设置中配置 Provider。',
        );
      }

      const raw = await deps.generateText(settings, systemPrompt, `${userPrompt}\n\n${jsonHint}`);
      const artifacts = parseArtifactsFromLlm(raw, pack.outputContract.requiredArtifacts);

      return {
        runnerType: 'direct_llm',
        stage: input.stage,
        artifacts,
      };
    },
  };
}