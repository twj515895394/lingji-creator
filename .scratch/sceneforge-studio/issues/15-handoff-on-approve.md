Status: ready-for-agent

# Handoff 在 Approve 时生成

Type: AFK

## 父问题

- 设计：`docs/sceneforge/2026-06-17-sceneforge-stage-context-and-handoff-design.md` §5
- 计划：Wave A3

## 要构建什么

在阶段 **approve**（及 `auto_if_valid` 等价进入 approved 路径）时，由 **`SceneHandoffWriter`** 根据各阶段 **`handoff-template.yaml`** 与 final artifacts 写入 `sceneforge/handoffs/<stage>.handoff.json`。`SceneContextBuilder` 在 policy 为 handoff/handoff_first 时 **优先** 读 handoff 切片。

P0 模板至少覆盖：**design、storyboard、audio、performance**（video 消费方依赖）。

## 验收标准

- [ ] `electron/sceneforge/pipeline/scene-handoff-writer.ts` 实现。
- [ ] `prompts/sceneforge/stages/{design,storyboard,audio,performance}/handoff-template.yaml`（或等价路径）存在。
- [ ] approve design 后存在 `sceneforge/handoffs/design.handoff.json`；builder 对下游 stage 的 design 输入 `source` 可为 `handoff`（有 handoff 时）。
- [ ] `tests/sceneforge-handoff.test.ts` 覆盖生成与读取优先。
- [ ] handoff 缺失时 builder fallback 不抛未处理异常。

## Review Checklist

- [ ] Agent 不可直接写 handoff；仅应用 approve 路径。
- [ ] handoff JSON 含 version、sourceStage、downstreamNotes、pointers（见设计 §5.4）。

## 被阻塞于

- Issue 14：SceneContextBuilder 与受控 Stage Context