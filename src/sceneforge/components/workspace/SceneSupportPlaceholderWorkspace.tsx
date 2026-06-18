import type { SceneStageId } from '../../../types/sceneforge';
import { getSceneStageDefinitionLite } from '../../lib/scene-pipeline-ui';
import { getStageReadiness, readinessLabel } from '../../lib/scene-stage-capabilities';
import styles from './SceneSupportPlaceholderWorkspace.module.css';

const COMMON_MCP_TOOLS = [
  'scene_get_project_state',
  'scene_run_stage',
  'scene_list_artifacts',
  'scene_read_artifact',
] as const;

const STAGE_HINTS: Partial<Record<SceneStageId, string>> = {
  reference: '参考与风格包通常在 topic_gate 确认后，由 Agent 写入支撑产物。',
  story: '故事结构阶段建议通过 ACP Agent 运行 scene_run_stage（acp_agent / direct_llm）。',
  assets: '资产登记与选型可通过 MCP 读取 manifest，并在下游 core 阶段引用 selectedAssetIds。',
  script: '剧本阶段产物为支撑向内容，请使用 Agent 提交后在此刷新产物列表。',
  performance: '表演/口播节奏阶段当前无 Studio 表单，请用 Agent 推进。',
  audio: '音频规划阶段请通过 Agent 与外部工具链完成。',
  publish: '发布元数据与平台适配尚未提供 Studio 表单。',
};

export interface SceneSupportPlaceholderWorkspaceProps {
  stage: SceneStageId;
  stageTitle: string;
}

export function SceneSupportPlaceholderWorkspace({
  stage,
  stageTitle,
}: SceneSupportPlaceholderWorkspaceProps) {
  const definition = getSceneStageDefinitionLite(stage);
  const readiness = getStageReadiness(stage);
  const hint = STAGE_HINTS[stage] ?? '本阶段暂无工坊内表单，请通过已连接的 Agent 与 lingji-editor MCP 推进。';

  return (
    <section className={styles.root} data-testid="scene-support-placeholder">
      <p className={styles.lead}>{hint}</p>
      <dl className={styles.meta}>
        <div>
          <dt>阶段</dt>
          <dd>
            {stageTitle} <span className={styles.mono}>({stage})</span>
          </dd>
        </div>
        <div>
          <dt>就绪</dt>
          <dd>{readinessLabel(readiness)}</dd>
        </div>
        <div>
          <dt>类别</dt>
          <dd className={styles.mono}>{definition.category}</dd>
        </div>
        <div>
          <dt>默认审批</dt>
          <dd className={styles.mono}>{definition.defaultApprovalPolicy}</dd>
        </div>
      </dl>
      <div className={styles.mcpBlock}>
        <h3>推荐 MCP 工具</h3>
        <ul>
          {COMMON_MCP_TOOLS.map((tool) => (
            <li key={tool}>
              <code>{tool}</code>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          在 Claude Code / Codex 等会话中注册 <strong>lingji-editor</strong> 后，可对当前项目目录调用上述工具。
          提交草案目前仅开放 <code>source_intake</code> / <code>topic_gate</code> 与 core 三阶段。
        </p>
      </div>
    </section>
  );
}