Status: ready-for-human

# Issue 08：台词纠偏后 understanding 失效策略分层（设计）

## 父问题

延续交接：[.handoff/handoff-20260629-170233.md](../../../.handoff/handoff-20260629-170233.md) · 问题 1（台词修正后整段理解被判失效过重）。

## 要构建什么

产出一份 **短设计说明**（建议路径：`docs/sceneforge-remix/` 下独立 md），定义：

- transcript 变更至少两档：**轻微文本纠偏** vs **语义级改写**，各自应使哪些理解子层失效
- segment understanding 内部分层建议：偏视觉稳定层（如 visual / camera / frameVision）与偏 transcript 依赖层（如 audio / story / remix / videoPrompt）
- 与现有 `inputHash` / `transcript_correction_changed` 的映射关系及迁移策略（避免 gate 行为 silent 漂移）
- UI 提示文案原则（避免「整段全失效」体感；可提示「剧情/音频推断已过期」等）

本 issue **不写生产代码**，仅设计 + 人工确认后再由 Issue 09 实现。

## 验收标准

- [ ] 设计文档包含上述四块且可被开发直接照着改 workbench
- [ ] 明确列出「不做」边界（例如是否首版就做自动严重度检测）
- [ ] 你（维护者）在 issue 评论或文档顶部记录 **已确认** 后再将 Issue 09 标为可开工

## 被阻塞于

无 - 可以立即开始

## 评论

- 2026-06-29：初稿已写入 [`docs/sceneforge-remix/transcript-stale-layering-design.md`](../../../docs/sceneforge-remix/transcript-stale-layering-design.md)，待维护者确认后 Issue 09 开工。