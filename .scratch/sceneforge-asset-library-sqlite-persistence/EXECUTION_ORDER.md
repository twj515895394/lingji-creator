Status: ready-for-agent

# SceneForge 资产库 SQLite 正式持久化 — 执行顺序

## 主线

1. `01-asset-library-db-foundation-and-schema`
2. `02-publish-to-library-transactional-ingest`
3. `03-published-asset-rebuild-and-backfill`
4. `04-shared-asset-query-surface-and-search`
5. `05-regression-docs-and-acceptance-closure`

## 依赖理由

1. 必须先固定数据库位置、schema、迁移与事务封装，后续所有 ingest / query / rebuild 才有稳定基础。
2. “保存入库”事务升级是资产正式进入数据库的主入口，后续回填与查询都建立在它定义的数据契约之上。
3. 已有 published 资产的回填逻辑需要复用正式 ingest 契约，否则新旧资产会产生两套数据规则。
4. 共享查询面必须建立在“新资产入库”和“旧资产回填”都已能生成稳定记录的前提上。
5. 回归测试、文档同步与验收收口应最后执行，避免因为前置表结构、事务边界和查询接口调整反复返工。
