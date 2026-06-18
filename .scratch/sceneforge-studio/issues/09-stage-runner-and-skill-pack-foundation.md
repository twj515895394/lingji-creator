Status: completed-local

# Stage Runner 与 Stage Skill Pack 基座

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

实现 SceneForge 阶段执行器和阶段能力包基座。流程推进必须由程序控制；每个阶段应读取的规则、prompt、输出契约、artifact 模板和 review checklist 由程序从 Stage Skill Pack 加载，并提供给 direct LLM 或 ACP Agent。模型不能自行扫描 `.agents/skills`，也不能自行决定阶段推进。

## 验收标准

- [x] 定义 `manual_submit / direct_llm / acp_agent` 三种 runner type。
- [x] 第一版实现 `manual_submit` runner，并为 `direct_llm`、`acp_agent` 保留接口与结构化 not implemented 返回。
- [x] 新增 Stage Skill Pack loader，能读取 `prompts/sceneforge/stages/<stage>/` 下的 system、user、agent-instructions、output-contract、review-checklist。
- [x] Design 阶段落地最小 Stage Skill Pack。
- [x] Stage Context 包含程序加载后的 stage pack 摘要和当前阶段 output contract。
- [x] 无论 runner 类型如何，最终提交路径都必须走 `submitStageDraft -> Artifact Store -> Manifest -> Validator -> Approval`。
- [x] 覆盖 stage pack loader 和 runner 抽象测试。

## Review Checklist

- [x] 没有在运行时直接依赖 `.agents/skills/<stage>/SKILL.md`。
- [x] 旧 SceneForge skill 只作为迁移素材来源，不作为产品运行时主控。
- [x] direct LLM prompt 由程序渲染，不由模型自行选择规则。
- [x] ACP Agent 只接收程序提供的 Stage Context 和 agent instructions。
- [x] Runner 不能直接写 `project.json`、`sceneforge/state.json` 或 `sceneforge/artifact_manifest.yaml`。
- [x] Stage Skill Pack 中的 review checklist 能被 issue / UI / 人工审批复用。

## 被阻塞于

- Issue 05：需要 Stage Context。
- Issue 06：需要 IPC/MCP 服务面。

## Implementation Notes

- 已实现 runner 类型、`manual_submit` runner、`direct_llm/acp_agent` 结构化未实现返回、Stage Skill Pack loader 和 Design 阶段最小能力包。
- `manual_submit` runner 只返回待提交草案，不直接写项目状态；最终提交仍必须显式调用 `submitStageDraft`，用于避免 runner 绕过 Artifact Store/Validator/Approval。
- 对应执行记录：`.planning/tasks/sceneforge-issue-09/`。

## Verification

- 已运行 Issue 09 targeted tests：`npx vitest run tests/sceneforge-stage-pack.test.ts tests/sceneforge-stage-runner.test.ts tests/sceneforge-stage-pack-context.test.ts`，3 个测试文件共 5 tests passed。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。
- `git diff --check` 已通过。

## Remaining Risk

- `direct_llm` 与 `acp_agent` 当前是接口基座和结构化未实现返回，真实模型/Agent 执行链路留给后续 issue。
- Stage Skill Pack 目前只落地 Design 阶段最小包；Storyboard / Video Prompts 的完整包可在后续阶段扩展。
