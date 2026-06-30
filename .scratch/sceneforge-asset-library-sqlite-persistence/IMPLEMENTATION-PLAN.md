# SceneForge 资产库 SQLite 正式持久化 Implementation Plan

> **For agentic workers:** 本包将修改运行时代码与测试。未经用户同意不提交 Git。

**Goal:** 为 SceneForge / Remix 共用资产库引入项目级 SQLite 正式持久化层，建立稳定的入库事务、回填能力与统一查询入口。

**Architecture:** 以 `sceneforge/asset-library.db` 作为项目级结构化持久化主层，保留现有 `sceneforge/remix/source-assets/` 目录作为详细工件层；通过 DB foundation、ingest、rebuild、query 四个深模块收口写入与读取。

**Tech Stack:** TypeScript、Electron、SQLite、React 19、Vitest、本地 Markdown issue tracker、现有 Remix Source Asset 工件目录。

---

## 文件结构

- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/PRD.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/ISSUE_INDEX.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/EXECUTION_ORDER.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/issues/01-asset-library-db-foundation-and-schema.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/issues/02-publish-to-library-transactional-ingest.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/issues/03-published-asset-rebuild-and-backfill.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/issues/04-shared-asset-query-surface-and-search.md`
- Create: `.scratch/sceneforge-asset-library-sqlite-persistence/issues/05-regression-docs-and-acceptance-closure.md`
- Create: `docs/asset-library/2026-06-30-sqlite-persistence-design.md`
- Create: `electron/sceneforge/assets/asset-library-db.ts`
- Create: `electron/sceneforge/assets/asset-library-types.ts`
- Create: `electron/sceneforge/assets/asset-library-ingest-service.ts`
- Create: `electron/sceneforge/assets/asset-library-rebuild-service.ts`
- Create: `electron/sceneforge/assets/asset-library-query-service.ts`
- Modify: `electron/sceneforge/remix/remix-service.ts`
- Modify: `electron/sceneforge/remix/remix-ipc.ts`
- Modify: `electron/sceneforge/remix/remix-ipc-types.ts`
- Modify: `src/sceneforge/remix/services/remix-api-client.ts`
- Modify: `tests/sceneforge-remix-publish-persistence.test.ts`
- Create: `tests/sceneforge-asset-library-db.test.ts`
- Create: `tests/sceneforge-asset-library-ingest.test.ts`
- Create: `tests/sceneforge-asset-library-rebuild.test.ts`
- Create: `tests/sceneforge-asset-library-query.test.ts`
- Modify: `tests/sceneforge-remix-ipc-contract.test.ts`

## Task 1：建立资产库数据库基建

- [ ] 在 `electron/sceneforge/assets/asset-library-types.ts` 定义资产库表级类型、查询输入输出与 schema version 常量。
- [ ] 在 `electron/sceneforge/assets/asset-library-db.ts` 封装数据库路径解析、初始化、建表、迁移、事务运行器与基础 helper。
- [ ] 固定数据库位置为项目目录下的 `sceneforge/asset-library.db`，并确保逻辑不依赖 `sceneforge/remix/` 私有路径。
- [ ] 为 `source_assets`、`source_asset_tags`、`source_segments`、`source_keyframes`、`source_asset_artifacts`、`source_asset_story_entities`、`source_asset_search` 落地 schema。
- [ ] 为建库、重复初始化、schema version 与事务回滚编写 `tests/sceneforge-asset-library-db.test.ts`。

验证方式：

- `npx vitest run tests/sceneforge-asset-library-db.test.ts`

预期结果：

- 测试通过
- 新建临时项目目录时会生成 `sceneforge/asset-library.db`
- 重复初始化不会破坏已有 schema

## Task 2：把保存入库升级为事务化 ingest

- [ ] 在 `electron/sceneforge/assets/asset-library-ingest-service.ts` 实现 JSON / 工件解析与 DB 写入，统一处理 manifest、overview、segment analysis、segment manifest、keyframe 与 tags。
- [ ] 在 ingest 服务中实现单 asset 的幂等写入策略：主表 upsert，从表按 `source_asset_id` 先删后插，FTS 重建。
- [ ] 在 `electron/sceneforge/remix/remix-service.ts` 升级 `publishSourceAssetToLibrary`：先校验工件和 JSON，再调用 ingest，只有 DB 成功后再切 `published_to_library`。
- [ ] 必要时在 `electron/sceneforge/remix/remix-ipc-types.ts` / `electron/sceneforge/remix/remix-ipc.ts` 中补齐新的返回信息或错误语义。
- [ ] 在 `tests/sceneforge-asset-library-ingest.test.ts` 与 `tests/sceneforge-remix-publish-persistence.test.ts` 中覆盖成功写入、失败回滚、重复保存幂等三类行为。

验证方式：

- `npx vitest run tests/sceneforge-asset-library-ingest.test.ts tests/sceneforge-remix-publish-persistence.test.ts`

预期结果：

- DB 写入成功后 asset 才会变成 `published_to_library`
- DB 失败时 manifest 不误切 published
- 旧的 JSON / 工件仍被保留，不因失败删除

## Task 3：实现 published 资产重建 / 回填

- [ ] 在 `electron/sceneforge/assets/asset-library-rebuild-service.ts` 扫描 `sceneforge/remix/source-assets/*/source_manifest.json`。
- [ ] 识别 `status = published_to_library` 的资产，并复用 ingest 服务回填 SQLite。
- [ ] 产出结构化重建结果：成功数、失败数、跳过项、缺失工件摘要。
- [ ] 在 `electron/sceneforge/remix/remix-service.ts` 增加重建入口，并通过 IPC 暴露给后续 UI 或调试命令使用。
- [ ] 在 `tests/sceneforge-asset-library-rebuild.test.ts` 覆盖“已有 published 资产可被补建进入 DB”的行为。

验证方式：

- `npx vitest run tests/sceneforge-asset-library-rebuild.test.ts`

预期结果：

- 对已有 published 资产执行重建后，SQLite 中能看到对应记录
- 缺失工件的资产不会 silently success

## Task 4：建立 SceneForge / Remix 共用查询面

- [ ] 在 `electron/sceneforge/assets/asset-library-query-service.ts` 实现资产列表、按状态筛选、按标签筛选、关键字模糊搜索、详情摘要读取。
- [ ] 统一 SceneForge 与 Remix 的资产查询输出模型，保证选择器和详情读取先依赖 DB，再按需回读详细工件。
- [ ] 在 `electron/sceneforge/remix/remix-ipc-types.ts`、`electron/sceneforge/remix/remix-ipc.ts` 与 `src/sceneforge/remix/services/remix-api-client.ts` 增加共享查询契约。
- [ ] 根据现有职责评估是否需要在 `electron/sceneforge/ipc.ts` 或相关 SceneForge 侧契约中补出共用资产查询入口。
- [ ] 在 `tests/sceneforge-asset-library-query.test.ts` 和 `tests/sceneforge-remix-ipc-contract.test.ts` 覆盖列表、筛选、搜索、详情摘要和 IPC 暴露。

验证方式：

- `npx vitest run tests/sceneforge-asset-library-query.test.ts tests/sceneforge-remix-ipc-contract.test.ts`

预期结果：

- 查询层不再依赖目录扫描作为主入口
- 搜索能按标题、标签、梗概、摘要命中
- SceneForge / Remix 都能消费同一查询输出模型

## Task 5：回归测试与文档收口

- [ ] 核对 `docs/asset-library/2026-06-30-sqlite-persistence-design.md`、PRD、issues 与实现范围一致。
- [ ] 在 `.scratch/sceneforge-asset-library-sqlite-persistence/issues/*.md` 回填完成状态与验证记录。
- [ ] 补齐本包需要的代表性命令清单，确保后续 handoff 可直接复用。
- [ ] 运行资产库相关代表性回归：
  - `tests/sceneforge-asset-library-db.test.ts`
  - `tests/sceneforge-asset-library-ingest.test.ts`
  - `tests/sceneforge-asset-library-rebuild.test.ts`
  - `tests/sceneforge-asset-library-query.test.ts`
  - `tests/sceneforge-remix-publish-persistence.test.ts`
  - `tests/sceneforge-remix-ipc-contract.test.ts`
- [ ] 视情况补跑 `npx tsc --noEmit`

验证方式：

- `npx vitest run tests/sceneforge-asset-library-db.test.ts tests/sceneforge-asset-library-ingest.test.ts tests/sceneforge-asset-library-rebuild.test.ts tests/sceneforge-asset-library-query.test.ts tests/sceneforge-remix-publish-persistence.test.ts tests/sceneforge-remix-ipc-contract.test.ts`
- `npx tsc --noEmit`

预期结果：

- 资产库 DB 基建、入库、回填、查询主链全部通过
- 文档、PRD、issue tracker 与实现边界一致

## 风险提示

- 如果当前仓库尚未引入稳定 SQLite 运行时依赖，Task 1 需要先确认复用现有依赖还是新增依赖；未经用户明确同意，不自动引入新的持久化包。
- 如果 SceneForge 侧现有 `scene-asset-library` 命名与新资产库查询层产生概念冲突，优先以“共用资产库查询层”命名收口，避免覆盖现有 style profile 资产语义。
- 如果已有 published 资产存在缺失工件，Task 3 应以“报告失败并跳过”优先，不做隐式修复。
