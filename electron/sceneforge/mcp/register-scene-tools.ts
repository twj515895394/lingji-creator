import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SceneForgeService } from '../service';

const SUBMIT_VALIDATE_APPROVE_STAGES = [
  'design',
  'storyboard',
  'video_prompts',
  'source_intake',
  'topic_gate',
  'reference',
  'story',
  'assets',
  'script',
  'performance',
  'audio',
  'publish',
] as const;

const service = new SceneForgeService();

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          code: typeof code === 'string' ? code : 'SCENE_TOOL_ERROR',
          message: error instanceof Error ? error.message : String(error),
        }, null, 2),
      },
    ],
    isError: true,
  };
}

export function registerSceneForgeMcpTools(server: McpServer): void {
  server.registerTool(
    'scene_get_project_state',
    {
      title: '查询 SceneForge 项目状态',
      description: '读取 SceneForge state、artifact manifest 和审批策略。',
      inputSchema: { projectDir: z.string().describe('SceneForge 项目目录') },
    },
    async ({ projectDir }) => {
      try {
        return jsonResult(await service.getProjectState(projectDir));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_get_stage_context',
    {
      title: '读取受控阶段上下文',
      description: '只返回程序允许下游读取的 approved/final 产物和授权支撑产物。',
      inputSchema: {
        projectDir: z.string().describe('SceneForge 项目目录'),
        stage: z.enum(['design', 'storyboard', 'video_prompts', 'publish']),
        runner: z
          .enum(['manual_submit', 'direct_llm', 'acp_agent'])
          .optional()
          .describe('执行方式，用于应用 context-policy runnerOverrides'),
        selectedAssetIds: z
          .array(z.string())
          .optional()
          .describe('资产库选中 id（如 style.pixar_like）'),
      },
    },
    async ({ projectDir, stage, runner, selectedAssetIds }) => {
      try {
        return jsonResult(
          await service.getStageContext(projectDir, stage, {
            runner,
            selectedAssetIds,
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_submit_stage_draft',
    {
      title: '提交 SceneForge 阶段草案',
      description: '提交单个阶段产物草案。工具不接受任意文件路径，产物由 Artifact Store 写入。',
      inputSchema: {
        projectDir: z.string().describe('SceneForge 项目目录'),
        stage: z.enum(SUBMIT_VALIDATE_APPROVE_STAGES),
        artifactKey: z.string().describe('阶段产物 key'),
        content: z.string().describe('Markdown 内容'),
      },
    },
    async ({ projectDir, stage, artifactKey, content }) => {
      try {
        return jsonResult(await service.submitStageDraft({
          projectDir,
          stage,
          artifacts: [{ artifactKey, content }],
        }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_validate_stage',
    {
      title: '校验 SceneForge 阶段',
      description: '运行阶段 Validator，并按审批策略推进状态。',
      inputSchema: {
        projectDir: z.string(),
        stage: z.enum(SUBMIT_VALIDATE_APPROVE_STAGES),
      },
    },
    async ({ projectDir, stage }) => {
      try {
        return jsonResult(await service.validateStage(projectDir, stage));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_approve_stage',
    {
      title: '审批 SceneForge 阶段',
      description: '审批已通过校验且等待人工审批的阶段。',
      inputSchema: {
        projectDir: z.string(),
        stage: z.enum(SUBMIT_VALIDATE_APPROVE_STAGES),
      },
    },
    async ({ projectDir, stage }) => {
      try {
        return jsonResult(await service.approveStage(projectDir, stage));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_set_approval_policy',
    {
      title: '设置 SceneForge 审批策略',
      description: '更新项目级审批策略 overrides。',
      inputSchema: {
        projectDir: z.string(),
        stage: z.enum(['design', 'storyboard', 'video_prompts', 'publish']),
        policy: z.enum(['required', 'optional', 'auto_if_valid', 'skip']),
      },
    },
    async ({ projectDir, stage, policy }) => {
      try {
        return jsonResult(await service.setApprovalPolicy(projectDir, stage, policy));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_list_artifacts',
    {
      title: '列出 SceneForge 产物',
      description: '读取 artifact manifest。',
      inputSchema: { projectDir: z.string() },
    },
    async ({ projectDir }) => {
      try {
        return jsonResult(await service.listArtifacts(projectDir));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_read_artifact',
    {
      title: '读取 SceneForge 产物',
      description: '按 artifact id 读取 manifest 中登记的产物。',
      inputSchema: {
        projectDir: z.string(),
        artifactId: z.string(),
      },
    },
    async ({ projectDir, artifactId }) => {
      try {
        return jsonResult(await service.readArtifact(projectDir, artifactId));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'scene_run_stage',
    {
      title: '运行 SceneForge 阶段 Runner',
      description:
        'manual_submit 返回草稿 map 不写盘；direct_llm 调 LLM 生成草案；acp_agent MVP 返回会话简报或配置错误。',
      inputSchema: {
        projectDir: z.string(),
        stage: z.enum(SUBMIT_VALIDATE_APPROVE_STAGES),
        runnerType: z.enum(['manual_submit', 'direct_llm', 'acp_agent']),
        selectedAssetIds: z.array(z.string()).optional(),
        manualArtifacts: z.record(z.string(), z.string()).optional(),
      },
    },
    async ({ projectDir, stage, runnerType, selectedAssetIds, manualArtifacts }) => {
      try {
        return jsonResult(
          await service.runStage({
            projectDir,
            stage,
            runnerType,
            selectedAssetIds,
            manualArtifacts,
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

}
