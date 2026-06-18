Status: ready-for-agent

# Phase 2 端到端回归与 Handoff 文档

Type: AFK

## 父问题

- 设计：`docs/sceneforge/2026-06-17-sceneforge-phase2-gap-analysis.md` §4
- 计划：Wave D2

## 要构建什么

串联 Phase 2 行为测试与文档收尾：video context 无 9 全文、handoff 存在、direct_llm mock 路径 submit+validate、SceneForge 测试套件通过。更新 `docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md` 实施状态；生成 `.handoff/handoff-YYYYMMDD-HHMMSS.md` 供接力。

可选：`.scratch/sceneforge-studio/PRD-phase2-runners.md` 一页摘要链到已定稿设计。

## 验收标准

- [ ] `npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts` 通过（或文档写明排除项与原因）。
- [ ] `npx tsc --noEmit` 通过。
- [ ] 新增或更新集成测试：approve → handoff → video context 含 audio 项（可用 writeSceneArtifact 模拟支撑产物）。
- [ ] handoff 文档含验证命令、未完成 P2 项（支撑链 SOP 等）。

## Review Checklist

- [ ] 不误报 Issue 01–12 已完成范围。
- [ ] git 提交由维护者决定，本票不强制 commit。

## 被阻塞于

- Issue 15：Handoff 在 Approve 时生成
- Issue 18：direct_llm Runner 与 Prompt 渲染
- Issue 19：sceneRunStage IPC/MCP 与 acp_agent Runner MVP