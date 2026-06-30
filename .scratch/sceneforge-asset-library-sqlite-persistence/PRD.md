Status: ready-for-agent

# PRD: SceneForge 资产库 SQLite 正式持久化

## 问题陈述

当前项目已经具备较稳定的资产入库产物链路：原片、切片、关键帧、理解结果、标签与备注都会落到项目目录中的 `sceneforge/remix/source-assets/<sourceAssetId>/` 下面，`source_manifest.json` 也能表达资产状态、路径引用和基础元数据。这让“保存入库”从产品上已经基本成立。

但从用户与系统的双重视角看，资产库仍然缺少一层真正可持续演进的正式持久化基础设施：

1. **资产列表与选择入口仍没有统一查询层。** 无论是 Remix 二创后续要做的“资产列表 + 模糊搜索下拉选择”，还是 SceneForge 的 `source_intake` 将来改成“从资产库选择已存在资产”，都不能继续依赖目录扫描和临时拼装读取。
2. **SceneForge 与 Remix 都要消费同一套资产，但当前没有共用结构化持久化模型。** 当前稳定事实源主要还是 JSON 工件；虽然它们足够详细，但并不适合作为高频列表、筛选、搜索、下拉和跨模块读取的主入口。
3. **“已入库”状态目前仍主要由文件状态表达。** 一旦后续引入资产库列表、搜索和选择器，就会出现一个明显风险：文件显示 `published_to_library`，但查询层并没有完整记录，导致资产在 UI 上“不存在”。
4. **当前项目里真正适合正式持久化建模的只有资产库域。** Variant、SceneForge 工作流草稿态、运行态上下文都还在快速变化，不适合现在一起拉进数据库。

如果继续只依赖现有 JSON 目录结构，而不把资产库域正式提升为结构化持久化层，后续 SceneForge 与 Remix 会各自长出不同的读取逻辑、路径拼装逻辑与搜索逻辑。这样不仅会让资产选择、模糊查询和后续复用越来越难，也会让未来迁移、回填、校验和测试成本迅速抬升。

## 解决方案

为项目级资产库引入 **SQLite 正式持久化主层**，但只覆盖资产库域，不扩散到 Variant 域和 SceneForge 工作流草稿域。

SQLite 的角色不是“未来可选增强”，而是现在就进入的正式结构化持久化层，用来承载：

- Source Asset 主记录
- Source Segment 片段记录
- Source Keyframe 关键帧索引
- Asset Tag 标签关系
- Asset Story Summary / Entity 摘要与故事实体
- Artifact Registry 工件路径登记
- Search Index / FTS 查询层

同时，现有 JSON / Markdown / 媒体目录继续保留，作为详细正文、原始分析结果和大对象工件层。系统通过数据库中的结构化主记录与工件路径引用，将两层连接起来。

系统在“保存入库”时执行新的正式事务边界：

1. 校验前置门禁与必要工件存在
2. 解析 `source_manifest.json`、`source_overview.json`、`segment_analysis.json`、`segment_manifest.json` 等结构化工件
3. 以事务方式写入 SQLite
4. 只有当 SQLite 提交成功后，才将 manifest 状态切换为 `published_to_library`

这样，资产库会变成：

- 对 SceneForge 与 Remix 都稳定可读的结构化持久化层
- 对资产列表、搜索下拉和后续复用都可靠的查询入口
- 与现有目录工件兼容、且支持对已入库资产执行一次性回填重建的正式基础设施

## 用户故事

1. 作为 Remix 二创创作者，我想在开始二创前看到一个可搜索的已入库资产列表，以便快速找到合适素材。
2. 作为 Remix 二创创作者，我想用标题、标签、剧情摘要等关键词模糊搜索资产，以便不需要记住具体文件名。
3. 作为 Remix 二创创作者，我想在选择资产时直接读取 segment、关键帧和 prompt 摘要，以便快速判断这条资产是否适合改编。
4. 作为 Remix 二创创作者，我想让二创入口依赖稳定的结构化资产记录，而不是重新扫目录和拼路径，以便后续资产选择体验一致。
5. 作为 SceneForge 创作者，我想在 `source_intake` 阶段直接加载已有资产内容，而不是再次从视频或链接解析开始，以便复用已经处理完成的素材。
6. 作为 SceneForge 创作者，我想从资产库读取全片梗概、剧情摘要、人物关系和冲突结构，以便更快进入改编。
7. 作为 SceneForge 创作者，我想在加载资产时保留按需回读详细 JSON 工件的能力，以便在需要时获得完整上下文，而不是只有一层扁平摘要。
8. 作为素材处理操作员，我想在点击“保存入库”后，系统不仅写文件，还正式登记结构化资产记录，以便后续列表和搜索一定能找到这条资产。
9. 作为素材处理操作员，我想在数据库写入失败时，资产不要被错误标记为已入库，以便避免“状态看起来成功、实际资产查不到”的问题。
10. 作为素材处理操作员，我想在已有 published 资产的项目上执行一次性回填重建，以便让旧资产也进入新的结构化查询层。
11. 作为项目维护者，我想把资产库数据库放在 `sceneforge/asset-library.db`，以便 SceneForge 和 Remix 共读，同时保持项目目录整体可移动、可备份。
12. 作为项目维护者，我想采用“每个项目一个库”，以便避免多个项目资产混存造成的隔离和迁移问题。
13. 作为架构维护者，我想让当前只有资产库域进入 SQLite，以便先把最稳定、最可建模的部分结构化，而不把 Variant 和工作流草稿域过早锁死。
14. 作为架构维护者，我想让 SQLite 承担正式结构化持久化与查询入口，而让 JSON / Markdown / 媒体文件继续承担详细工件层，以便职责清晰、迁移平滑。
15. 作为后端开发者，我想把资产库相关写入逻辑收口到稳定服务模块中，以便减少 UI / IPC / service 各层自行拼路径和散落事务逻辑的风险。
16. 作为测试维护者，我想对建库、schema、事务回滚、JSON→SQLite 映射、重建回填和查询层建立自动测试，以便未来改动不会破坏已入库资产的可读性。
17. 作为资产库 UI 维护者，我想让列表页、筛选器、搜索框和下拉选择器统一查数据库，以便减少 Renderer 侧直接碰文件系统的复杂度。
18. 作为项目负责人，我想先把资产库正式持久化建好，再去设计 SceneForge intake 资产选择与 Remix 二创资产下拉交互，以便后续交互建立在稳定的数据地基上。

## 实现决策

- SQLite 现在进入项目，而不是作为未来可选增强。
- SQLite 只覆盖资产库域，不覆盖 Variant 域、SceneForge stage draft 或工作流运行态。
- 资产库数据库文件固定放在 `sceneforge/asset-library.db`，不放在 `sceneforge/remix/` 下，因为它是 SceneForge 与 Remix 共用的资产基础设施。
- 采用“每个项目一个库”的隔离策略，不做全局跨项目混库。
- 数据职责分层固定为：
  - SQLite：正式结构化持久化层、列表与查询入口
  - JSON：详细结构正文与原始分析结果
  - Markdown：人读友好展示，不作为唯一机器事实源
  - 媒体文件：视频、clip、关键帧、音频等大对象
- Source Asset 继续作为资产库主实体；现有 `source_manifest.json`、`source_overview.json`、`segment_analysis.json`、`segment_manifest.json` 继续保留并作为 ingest 输入。
- 资产库数据库最小落地 7 张表：
  - `source_assets`
  - `source_asset_tags`
  - `source_segments`
  - `source_keyframes`
  - `source_asset_artifacts`
  - `source_asset_story_entities`
  - `source_asset_search`（FTS）
- “保存入库”升级为正式事务边界：
  - 先校验工件
  - 再写 SQLite
  - 只有 SQLite 成功提交后，才把 manifest 切成 `published_to_library`
- 为保证幂等性，单个 asset 的入库写入采用：
  - 主表 `upsert`
  - 从表按 `source_asset_id` 先删后插
  - 搜索索引重建当前 asset 条目
- 已有 published 资产必须支持“重建资产数据库索引”能力，通过扫描现有目录工件回填 SQLite。
- SceneForge 与 Remix 后续统一先通过 SQLite 进行列表、筛选、模糊搜索和资产选择，再按需回读详细工件。
- 推荐抽出以下深模块：
  - `Asset Library DB Foundation`：建库、建表、迁移、事务封装
  - `Asset Library Ingest Service`：JSON / 工件解析并写入 SQLite
  - `Asset Library Rebuild Service`：扫描 published 资产并回填数据库
  - `Asset Library Query Service`：列表、搜索、详情摘要读取
  - `Publish-to-Library Transaction Upgrade`：将入库动作升级为事务化正式提交

## 测试决策

- 好测试只验证外部行为和稳定契约，不验证实现细节或内部 SQL 拼装细节。
- 必须测试数据库 schema 初始化与迁移行为，保证新项目和旧项目都能建立正确数据库结构。
- 必须测试 ingest 行为，验证结构化 JSON 与现有工件目录能被正确映射到各张表。
- 必须测试“保存入库”事务边界，重点验证数据库写入失败时不会把资产错误标记为 `published_to_library`。
- 必须测试回填重建行为，确保已经 published 的旧资产可以被重新纳入数据库。
- 必须测试查询层行为，确保列表、筛选、搜索和详情摘要都能稳定读取。
- 需要测试的模块包括：
  - DB foundation / schema / migration
  - asset ingest service
  - publish transaction upgrade
  - rebuild service
  - query service / IPC contract
- 测试风格应复用仓库已有 Electron / Remix service / IPC / Vitest 先例，尤其参考：
  - Remix service persistence 测试
  - IPC contract 测试
  - 现有 `scene-asset-library` 读取测试
- 手动验收重点应包括：
  - 新项目首次入库后，数据库文件创建成功
  - 旧项目执行重建后，published 资产可在查询层中出现
  - 保存入库失败时，资产状态不误切
  - 列表与搜索查询不再依赖目录扫描作为主入口

## 超出范围

- 不将 Remix Variant 持久化迁移到 SQLite
- 不将 SceneForge `source_intake`、`topic_gate`、core stages 的草稿和运行态纳入 SQLite
- 不实现跨项目统一资产库
- 不实现向量检索、嵌入检索或语义搜索
- 不移除现有 JSON / Markdown / 媒体工件目录
- 不在本期直接完成 SceneForge intake 资产选择交互
- 不在本期直接完成 Remix 二创资产搜索下拉 UI
- 不在本期重构所有资产详情 UI，只先提供数据库与查询基建

## 进一步说明

- 本 PRD 基于已确认的设计文档《SceneForge Asset Library SQLite 持久化设计》收敛。
- 本期的本质不是“做一个新 UI”，而是先把 SceneForge / Remix 共用资产库的正式持久化地基打稳。
- 后续 SceneForge intake 资产选择、Remix 二创资产列表与搜索下拉，都应视为本 PRD 的下游消费者，而不是本 PRD 本体。
