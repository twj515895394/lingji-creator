Status: completed

## 父问题

`.scratch/sceneforge-next-batch/PRD.md` · [ADR-0002 附录](../../docs/adr/0002-appendix-production-support-mvp.md)

## 要构建什么

对 **剧本 / 表演指导 / 声音设计** 实施与 reference 相同的 MVP 闭环：`script_draft`、`performance_direction`、`audio_design`；submit + validator + MCP 枚举 + Studio `ScenePrepSupportWorkspace` + Validate/Continue；工坊就绪标签。

## 验收标准

- [x] 三阶段可提交占位并通过结构校验
- [x] storyboard 依赖 performance 时，占位 performance 后可进入 storyboard 占位测试
- [x] sceneforge 测试扩展通过

## 被阻塞于

- 06（建议先完成 core 占位，非硬依赖）

## 类型说明

AFK

## 评论

- 2026-06-18：`tests/sceneforge-support-submit.test.ts` 覆盖 script、performance、audio 提交与结构校验。
- 2026-06-18：上下文与 Phase 2 集成测试覆盖 performance → storyboard 依赖；Core 占位测试覆盖 storyboard 提交。
- 2026-06-18：TypeScript 通过；SceneForge 回归 33 files / 122 tests 通过。
