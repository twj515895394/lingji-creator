# SceneForge 流程硬化 + Support Pack — 交接摘要

> 2026-06-19 · Flow Hardening 01–04 与 Support Pack Wave 自动化均已完成（维护者确认）

## 完整流程（当前工程能力）

```text
上游产物齐全（required satisfied）
  → 选手写 / Direct LLM / ACP Agent（单轮）
  → 草案审阅
  → 显式 submit
  → 语义 + prep validator（失败 = failed，禁止推进）
  → approve / handoff
  → Continue & Continue & Run（能力表）
```

## 本阶段交付

- **Support Pack**：reference / story / assets / script / performance / audio Direct LLM + Packs
- **Flow Hardening**：上下文阻塞、四类语义校验、ACP 最小路径
- **测试**：continue-run story→assets 边界、semantic validators、acp happy path

## 提交建议（按包 selective staging）

1. Support Pack（Packs + capabilities + tests）
2. Flow Hardening（required-context、semantic-support-stages、acp runner、validators 接线）
3. 勿默认提交 `.planning/`

## 下一代理

- 用户 **Issue 07** Electron 验收
- 或立项 **Style 选择器** / **Regenerate**
- 全量回归命令见 `.scratch/sceneforge-flow-hardening/progress.md`