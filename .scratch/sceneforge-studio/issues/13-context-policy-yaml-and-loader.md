Status: ready-for-agent

# Context Policy 与 YAML 加载

Type: AFK

## 父问题

- `.scratch/sceneforge-studio/PRD.md`
- 设计：`docs/sceneforge/2026-06-17-sceneforge-stage-context-and-handoff-design.md` §3
- 计划：`docs/superpowers/plans/2026-06-17-sceneforge-phase2-implementation-plan.md` Wave A1

## 要构建什么

为 SceneForge 引入声明式 **context-policy.yaml**（每阶段消费者策略）及 **default-context-policy.yaml**，并实现主进程 **Policy loader**（解析 delivery、forbidden、runnerOverrides）。本票只交付「能加载、能校验、能单测」；**不**替换 `getStageContext` 行为（属 Issue 14）。

MVP 必须先落盘 **design / storyboard / video_prompts** 三份 policy，其中 **video_prompts** 按已定稿表：含 audio、performance、master_reference full；**禁止**默认 9 文件全文策略。

## 验收标准

- [ ] `prompts/sceneforge/pipeline/default-context-policy.yaml` 存在且可被 loader 读取。
- [ ] `prompts/sceneforge/stages/design|storyboard|video_prompts/context-policy.yaml` 存在，字段符合设计 §3.2 schema（version、inputs、delivery、forbidden 等）。
- [ ] `electron/sceneforge/pipeline/scene-context-policy.ts` 提供加载与类型化结构；非法 YAML 抛稳定错误码。
- [ ] `tests/sceneforge-context-policy.test.ts`：video policy 含 audio/performance 输入项；无「全量 design+storyboard keys 全文」默认规则。
- [ ] 符合 `docs/sceneforge/2026-06-17-sceneforge-engineering-constraints.md`（新文件 SRP、≤800 行）。

## Review Checklist

- [ ] policy 仅描述「生成上下文」，与 `scene-stage-definitions` 的校验用 requiredArtifacts 分离。
- [ ] 不修改 Cut 主链路代码。
- [ ] 未实现 handoff/builder（留给 14/15）。

## 被阻塞于

无 - 可以立即开始