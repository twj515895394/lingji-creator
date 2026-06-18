Status: completed-local

# 阶段审批策略可配置闭环

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

实现 SceneForge 阶段审批策略模型：默认策略来自内置 pipeline definition，项目级覆盖写入 `sceneforge/approval_policy.yaml`，运行时统一解析。UI 和 MCP 后续都通过同一服务读取/修改策略。

## 验收标准

- [x] 定义 `required / optional / auto_if_valid / skip` 四种策略。
- [x] SceneForge 项目创建时写入默认 `approval_policy.yaml`。
- [x] `resolveSceneApprovalPolicy(projectDir, stage)` 支持默认策略和项目覆盖。
- [x] 核心阶段默认 `required`，支撑阶段默认 `optional` 或 `auto_if_valid`。
- [x] 提供更新单阶段策略的服务方法，并拒绝非法 stage/policy。
- [x] 覆盖默认策略、项目覆盖、非法配置降级或报错测试。

## Review Checklist

- [x] 审批策略没有写死在 UI 或状态机分支里。
- [x] 解析优先级为“项目覆盖 > pipeline 默认值”。
- [x] 核心阶段改为 `auto_if_valid/skip` 的风险提示已在 UI 切片中预留或实现。
- [x] Validator failed 时无论策略如何都不能自动推进。
- [x] `approval_policy.yaml` 解析失败时行为明确，不会导致静默错误推进。
- [x] 测试覆盖至少一个核心阶段和一个支撑阶段的覆盖配置。

## 被阻塞于

- Issue 01：需要 SceneForge 项目目录和 `sceneforge/` 初始化。

## Implementation Notes

- 已实现审批策略定义、默认策略、项目覆盖解析、单阶段策略更新和非法配置校验。
- 对应执行记录：`.planning/tasks/sceneforge-issue-02/`。

## Verification

- 覆盖默认策略、项目覆盖、非法 stage/policy、核心/支撑阶段策略差异。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- UI 风险确认在 Issue 07 中接入；本票侧只负责策略模型与服务能力。
