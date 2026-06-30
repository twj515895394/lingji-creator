Status: ready-for-agent

# 资产库数据库基建与 schema 落地

Type: AFK

## 父问题

`.scratch/sceneforge-asset-library-sqlite-persistence/PRD.md`

## 要构建什么

建立项目级资产库数据库基础设施，使 SceneForge 与 Remix 有统一的资产库结构化持久化底座。

端到端行为：

- 项目目录内固定存在 `sceneforge/asset-library.db` 这一资产库数据库位置约定。
- 系统能够初始化资产库数据库、建表并应用 schema 版本迁移。
- 资产库域具备稳定的事务封装与基础 CRUD 接口，供后续 ingest、rebuild 和 query 共用。
- 当前 schema 明确只覆盖资产库域，不纳入 Variant 和 SceneForge 工作流草稿域。

## 验收标准

- [ ] 数据库文件位置固定为 `sceneforge/asset-library.db`，且初始化逻辑不依赖 Remix 私有目录
- [ ] `source_assets`、`source_asset_tags`、`source_segments`、`source_keyframes`、`source_asset_artifacts`、`source_asset_story_entities`、`source_asset_search` 具备稳定 schema
- [ ] 提供统一的建库、建表、schema version 与事务封装能力，后续服务无需各自直接拼接 SQL 生命周期
- [ ] 自动测试覆盖建库、重复初始化与事务回滚基础行为

## 被阻塞于

- 无 - 可以立即开始
