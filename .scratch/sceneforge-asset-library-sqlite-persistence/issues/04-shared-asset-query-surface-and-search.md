Status: ready-for-agent

# SceneForge / Remix 共用资产查询与搜索面

Type: AFK

## 父问题

`.scratch/sceneforge-asset-library-sqlite-persistence/PRD.md`

## 要构建什么

建立 SceneForge 与 Remix 共用的资产查询层，使列表、筛选、模糊搜索和详情摘要统一从 SQLite 读取。

端到端行为：

- 资产列表与详情摘要不再以目录扫描作为主入口。
- 系统能够按状态、标签和关键词检索已入库资产。
- 系统能够为资产选择器提供适合下拉和搜索面板消费的轻量摘要。
- SceneForge 与 Remix 都通过同一查询契约读取资产主记录和必要摘要，再按需回读详细工件。

## 验收标准

- [ ] 提供统一的资产列表、筛选、搜索与详情摘要查询能力
- [ ] 搜索面支持标题、标签、梗概、摘要等高频文本字段的模糊匹配
- [ ] SceneForge 与 Remix 可以通过统一契约读取资产选择摘要，而不是各自扫描目录
- [ ] 自动测试覆盖列表、筛选、搜索和详情摘要四类核心读取行为

## 被阻塞于

- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/01-asset-library-db-foundation-and-schema.md`
- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/02-publish-to-library-transactional-ingest.md`
