Status: completed

## 父问题

`.scratch/sceneforge-next-batch/PRD.md` · [设计](../../docs/sceneforge/2026-06-18-sceneforge-next-batch-design.md) §2.2

## 要构建什么

扩展 core **MVP 占位**至 `storyboard`（4 核心 key）与 `video_prompts`（2 核心 key）；补充 Vitest 断言占位提交后校验通过；更新 handoff 全链验收清单（gate → assets → design → script/performance/audio → storyboard → video → export 占位说明）。

## 验收标准

- [x] storyboard / video 阶段可见「填充 MVP 占位」且提交后 validate 逻辑与 design 一致
- [x] 测试覆盖 storyboard、video 占位提交
- [x] handoff 含完整链路人工验收项

## 被阻塞于

无

## 类型说明

AFK

## 评论

- 2026-06-18：`tests/sceneforge-core-mvp-placeholder.test.ts` 覆盖 storyboard 4 keys 与 video_prompts 2 keys，提交后均通过校验。
- 2026-06-18：`.handoff/handoff-20260618-next-batch.md` 已包含 gate → export 的完整人工验收顺序。
- 2026-06-18：`npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts` 通过，33 files / 122 tests。
