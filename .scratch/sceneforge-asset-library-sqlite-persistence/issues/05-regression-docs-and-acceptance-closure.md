Status: ready-for-agent

# 回归测试、文档同步与验收收口

Type: AFK

## 父问题

`.scratch/sceneforge-asset-library-sqlite-persistence/PRD.md`

## 要构建什么

为资产库 SQLite 持久化提供回归测试、文档同步和验收收口，确保新旧资产、保存入库、查询层和回填逻辑形成闭环。

端到端行为：

- 自动测试能够覆盖建库、事务、回填和查询主链。
- 设计文档、PRD、issue tracker 与 implementation plan 之间的名词和范围保持一致。
- 资产库 SQLite 引入后的关键验证命令和人工验收步骤可被后续代理或开发者直接复用。

## 验收标准

- [ ] 自动测试完整覆盖 DB foundation、ingest、rebuild、query 四类主链
- [ ] 设计文档、PRD、issue tracker 与 implementation plan 的术语、边界和数据库位置保持一致
- [ ] 提供清晰的验证命令和人工验收步骤，能验证新资产入库、旧资产回填和查询可见性
- [ ] 本 issue 完成后，整个资产库 SQLite 包可作为后续实现与 handoff 的稳定入口

## 被阻塞于

- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/02-publish-to-library-transactional-ingest.md`
- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/03-published-asset-rebuild-and-backfill.md`
- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/04-shared-asset-query-surface-and-search.md`
