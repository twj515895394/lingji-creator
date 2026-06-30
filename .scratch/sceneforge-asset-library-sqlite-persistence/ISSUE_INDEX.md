Status: ready-for-agent

# SceneForge 资产库 SQLite 正式持久化 — Issue 总索引

> 上级入口：[`PRD.md`](PRD.md) · [`EXECUTION_ORDER.md`](EXECUTION_ORDER.md)

## 1. 垂直切片一览

| ID | 文件 | 标题 | 类型 | 阻塞于 | 覆盖重点 |
|----|------|------|------|--------|----------|
| 01 | [`issues/01-asset-library-db-foundation-and-schema.md`](issues/01-asset-library-db-foundation-and-schema.md) | 资产库数据库基建与 schema 落地 | AFK | 无 | DB 文件位置、建库、建表、迁移、事务封装 |
| 02 | [`issues/02-publish-to-library-transactional-ingest.md`](issues/02-publish-to-library-transactional-ingest.md) | 保存入库升级为事务化 ingest 正式提交 | AFK | 01 | 工件校验、JSON 解析、DB 写入、published 切换 |
| 03 | [`issues/03-published-asset-rebuild-and-backfill.md`](issues/03-published-asset-rebuild-and-backfill.md) | 已入库资产重建与回填入口 | AFK | 01, 02 | published 扫描、回填、结果报告 |
| 04 | [`issues/04-shared-asset-query-surface-and-search.md`](issues/04-shared-asset-query-surface-and-search.md) | SceneForge / Remix 共用资产查询与搜索面 | AFK | 01, 02 | 列表、筛选、模糊搜索、详情摘要、IPC 契约 |
| 05 | [`issues/05-regression-docs-and-acceptance-closure.md`](issues/05-regression-docs-and-acceptance-closure.md) | 回归测试、文档同步与验收收口 | AFK | 02, 03, 04 | 自动测试、文档、重建与查询回归 |

## 2. 推荐执行顺序

`01` → `02` → `03` → `04` → `05`

## 3. 说明

- 本组切片优先围绕“资产库域正式持久化”构建，不扩散到 Variant 和 SceneForge 工作流草稿域。
- 所有 issue 都要求覆盖端到端行为，不接受单纯“只加表”或“只改 UI”的水平切片。
- 本组切片默认 AFK，可由代理独立推进；若实现中发现需要改变资产库域边界或 DB 位置，应先回到 PRD 与设计文档统一。
