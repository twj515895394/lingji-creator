import type { SceneStageContext } from '../pipeline/scene-context-builder';
import { loadSceneStagePack } from '../pipeline/scene-stage-pack';
import type { SceneStageRunner, SceneStageRunnerInput, SceneStageRunnerResult } from '../pipeline/scene-stage-runner';

export type SceneAcpRunnerErrorCode =
  | 'SCENE_ACP_NOT_CONFIGURED'
  | 'SCENE_ACP_UNSUPPORTED_STAGE';

export class SceneAcpStageRunnerError extends Error {
  code: SceneAcpRunnerErrorCode;

  constructor(code: SceneAcpRunnerErrorCode, message: string) {
    super(message);
    this.name = 'SceneAcpStageRunnerError';
    this.code = code;
  }
}

export interface SceneAcpRunnerDeps {
  isAcpAvailable: () => Promise<boolean>;
}

const CORE_RUN_STAGES = ['design', 'storyboard', 'video_prompts'] as const;

export function createAcpStageRunner(deps: SceneAcpRunnerDeps): SceneStageRunner {
  return {
    type: 'acp_agent',
    async run(input: SceneStageRunnerInput): Promise<SceneStageRunnerResult> {
      if (!CORE_RUN_STAGES.includes(input.stage as (typeof CORE_RUN_STAGES)[number])) {
        throw new SceneAcpStageRunnerError(
          'SCENE_ACP_UNSUPPORTED_STAGE',
          `acp_agent runner supports core stages only`,
        );
      }

      const available = await deps.isAcpAvailable();
      if (!available) {
        throw new SceneAcpStageRunnerError(
          'SCENE_ACP_NOT_CONFIGURED',
          'ACP Agent 未配置或不可用。请在设置中配置 Agent 后使用 acp_agent，或改用 direct_llm / manual_submit。',
        );
      }

      const stageContext = input.stageContext as SceneStageContext;
      const pack = await loadSceneStagePack(input.stage);

      // MVP: session orchestration is deferred; return structured briefing for Studio/MCP follow-up.
      return {
        runnerType: 'acp_agent',
        stage: input.stage,
        artifacts: {
          __acp_session_brief: JSON.stringify({
            status: 'briefing_only',
            stage: input.stage,
            projectDir: input.projectDir,
            agentInstructions: pack.agentInstructions.trim(),
            contextWarnings: stageContext.warnings,
            requiredArtifactKeys: pack.outputContract.requiredArtifacts,
            message:
              'ACP 会话启停将在后续版本接入；请使用外部 Claude Code + Scene MCP 按 agent-instructions 提交草案。',
          }),
        },
      };
    },
  };
}