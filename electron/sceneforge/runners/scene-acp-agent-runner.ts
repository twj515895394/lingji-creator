import type { SceneStageContext } from '../pipeline/scene-context-builder';
import type { SceneStageId } from '../types';
import { stageSupportsRunner } from '../../../src/sceneforge/lib/scene-stage-run-capabilities';

export type SceneAcpAgentRunnerErrorCode =
  | 'SCENE_ACP_NO_AGENT'
  | 'SCENE_ACP_UNSUPPORTED_STAGE'
  | 'SCENE_ACP_PARSE_FAILED'
  | 'SCENE_ACP_MISSING_ARTIFACTS';

export class SceneAcpAgentRunnerError extends Error {
  code: SceneAcpAgentRunnerErrorCode;

  constructor(code: SceneAcpAgentRunnerErrorCode, message: string) {
    super(message);
    this.name = 'SceneAcpAgentRunnerError';
    this.code = code;
  }
}

export interface SceneAcpAgentRunInput {
  projectDir: string;
  stage: SceneStageId;
  stageContext: SceneStageContext;
  submitStageDraft: (args: unknown) => Promise<unknown>;
  manualArtifacts?: Record<string, string>;
}

export interface SceneAcpAgentRunResult {
  runnerType: 'acp_agent';
  stage: SceneStageId;
  artifacts: Record<string, string>;
}

export interface SceneAcpAgentRunnerDeps {
  /** 单轮：返回与 direct_llm 相同的 JSON 对象字符串 */
  runAgentTurn: (prompt: string) => Promise<string>;
  isAgentConfigured: () => Promise<boolean>;
  buildPrompt?: (ctx: SceneStageContext) => string;
}

function parseArtifactsJson(
  raw: string,
  requiredKeys: readonly string[],
): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SceneAcpAgentRunnerError(
      'SCENE_ACP_PARSE_FAILED',
      'ACP 返回内容不是合法 JSON。',
    );
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new SceneAcpAgentRunnerError(
      'SCENE_ACP_PARSE_FAILED',
      'ACP 返回 JSON 必须是对象。',
    );
  }
  const record = parsed as Record<string, unknown>;
  const artifacts: Record<string, string> = {};
  for (const key of requiredKeys) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new SceneAcpAgentRunnerError(
        'SCENE_ACP_MISSING_ARTIFACTS',
        `ACP 返回缺少或为空：${key}`,
      );
    }
    artifacts[key] = value.trim();
  }
  return artifacts;
}

function defaultBuildPrompt(ctx: SceneStageContext): string {
  const keys = ctx.outputContract.requiredArtifacts.join(', ');
  return [
    `Stage: ${ctx.stage}`,
    `Return a single JSON object with keys: ${keys}.`,
    'Each value is full Markdown for that artifact.',
    'Do not wrap in markdown fences.',
  ].join('\n');
}

export function createAcpAgentStageRunner(deps: SceneAcpAgentRunnerDeps) {
  return {
    async run(input: SceneAcpAgentRunInput): Promise<SceneAcpAgentRunResult> {
      const { stage, stageContext, submitStageDraft } = input;

      if (!stageSupportsRunner(stage, 'acp_agent')) {
        throw new SceneAcpAgentRunnerError(
          'SCENE_ACP_UNSUPPORTED_STAGE',
          `Stage ${stage} does not support acp_agent.`,
        );
      }

      if (!(await deps.isAgentConfigured())) {
        throw new SceneAcpAgentRunnerError(
          'SCENE_ACP_NO_AGENT',
          '未配置 Agent，请在设置中完成 Agent / API 配置。',
        );
      }

      const prompt = (deps.buildPrompt ?? defaultBuildPrompt)(stageContext);
      const raw = await deps.runAgentTurn(prompt);
      const artifacts = parseArtifactsJson(
        raw,
        stageContext.outputContract.requiredArtifacts,
      );

      // 与 direct_llm 一致：仅返回草案，不写盘
      void submitStageDraft;

      return { runnerType: 'acp_agent', stage, artifacts };
    },
  };
}
