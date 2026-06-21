Status: completed-local

## 父问题

`.scratch/sceneforge-regenerate-revision/PRD.md`

## 要构建什么

定义 regenerate 与 revision 各自进入现有 service 的 seam，保持单一写盘出口。

## 验收标准

- [ ] 两种动作职责清晰
- [ ] 不新增旁路写盘
- [ ] 不破坏审批链

## 类型

AFK

## 评论

- 2026-06-18：现有 `SceneForgeService.requestRevision()` / `sceneforge:request-revision` seam 已确认为首版唯一修订写盘出口，无需新增旁路状态写入。
- 2026-06-18：Regenerate 首版不新增 service 方法，直接复用当前阶段 `runStage`，仅在 renderer 端明确动作语义。
- 2026-06-18：修订请求后的回到草案流程仍是统一链路：重新生成草案 -> 提交 -> 校验 -> 审批。
