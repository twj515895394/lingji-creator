# SceneForge Issue 02 Findings

## Requirements

- 定义 `required / optional / auto_if_valid / skip` 四种审批策略。
- SceneForge 项目创建时写入默认 `approval_policy.yaml`。
- `resolveSceneApprovalPolicy(projectDir, stage)` 支持默认策略和项目覆盖。
- 核心阶段默认 `required`，支撑阶段默认 `optional` 或 `auto_if_valid`。
- 提供更新单阶段策略的服务方法，并拒绝非法 stage/policy。
- YAML 解析失败不能静默推进。

## Research Findings

- Issue 01 已在 `src/types/sceneforge.ts` 定义策略枚举和 stage ids。
- Issue 01 的 `createSceneForgeProject()` 当前用手写 YAML 字符串生成 `approval_policy.yaml`，Issue 02 应收敛到统一 writer。
- 项目已有 `yaml` 依赖，可以用结构化 parser/writer，避免手写 YAML 字符串解析。
- 当前不需要改 renderer UI；后续 Issue 06/07 会通过同一服务面接 IPC/MCP 和控件。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 新增 `SceneApprovalPolicyError` 并带 `code` | 调用方后续可稳定展示错误类型 |
| `setSceneApprovalPolicy(projectDir, stage, policy)` 只写合法覆盖 | 防止非法配置污染项目文件 |
| `readApprovalPolicyFile` 缺文件返回空覆盖，解析坏文件抛错 | 新项目有默认文件；缺文件可兼容，坏文件必须显式暴露 |

## Resources

- `.scratch/sceneforge-studio/issues/02-configurable-approval-policy.md`
- `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`
- `electron/sceneforge/project/scene-project-file.ts`
- `src/types/sceneforge.ts`
