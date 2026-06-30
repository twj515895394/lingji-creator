Status: ready-for-agent

# 保存入库升级为事务化 ingest 正式提交

Type: AFK

## 父问题

`.scratch/sceneforge-asset-library-sqlite-persistence/PRD.md`

## 要构建什么

将“保存入库”从单纯的 manifest 状态切换升级为资产库正式提交动作。

端到端行为：

- 点击“保存入库”时，系统会先校验必需工件存在，再解析资产级和片段级 JSON 工件。
- 系统把 Source Asset、Segment、Keyframe、Tag、Story Summary 与 Artifact Registry 一次性写入 SQLite。
- 只有当 SQLite 事务成功提交后，才允许将该资产标记为 `published_to_library`。
- 一旦事务失败，资产仍停留在未正式入库状态，不产生“文件显示已发布但数据库无记录”的脏状态。

## 验收标准

- [ ] “保存入库”会执行工件校验、JSON→DB 映射和单事务提交，而不是只切 manifest 状态
- [ ] manifest 进入 `published_to_library` 的前提是数据库提交成功
- [ ] 任一 DB 写入失败都会回滚事务，并阻止 published 状态误切
- [ ] 自动测试覆盖成功提交、失败回滚、重复保存幂等更新三类行为

## 被阻塞于

- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/01-asset-library-db-foundation-and-schema.md`
