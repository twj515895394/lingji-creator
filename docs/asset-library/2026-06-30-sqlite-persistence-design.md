# SceneForge Asset Library SQLite 持久化设计

- 日期：2026-06-30
- 状态：设计确认中
- 适用范围：SceneForge / Remix 共用资产库域
- 关联文档：
  - `docs/superpowers/specs/2026-06-30-remix-asset-marking-and-publish-design.md`
  - `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`
  - `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-ui-split-revision.md`

## 1. 背景

当前项目已经跑通了 Source Asset 的目录化落盘与“保存入库”链路：

- 原片、切片、关键帧、理解结果会稳定写入 `sceneforge/remix/source-assets/<sourceAssetId>/`
- `source_manifest.json` 已能表达入库状态、资产标签、备注和关键路径引用
- Remix 二创已经形成“只能从已入库资产发起”的产品语义

但当前资产库仍有两个结构性问题：

1. 资产列表、后续资产选择器、模糊查询下拉，还没有统一的结构化查询层。
2. SceneForge 与 Remix 后续都会读取资产库，但目前稳定事实源主要还是目录扫描与 JSON 逐个读取，读取成本高、查询能力弱、边界不清晰。

因此，本设计引入 SQLite，作为 **资产库域的正式持久化主层**，同时保留现有 JSON / Markdown / 媒体工件目录作为详细内容与原始产物层。

## 2. 设计目标

### 2.1 主目标

- 为 SceneForge 与 Remix 共用的资产库建立统一 SQLite 持久化层
- 支持资产列表、筛选、模糊搜索、下拉选择、详情加载
- 保持现有文件工件结构，避免推翻已经稳定的入库链路

### 2.2 消费目标

#### Remix 二创

需要从资产库快速读取：

- 已入库资产列表
- 标题 / 标签 / 缩略图 / 时长 / 状态
- segment 列表
- first / middle / last 关键帧
- 片段摘要与 prompt 摘要

#### SceneForge

需要从资产库快速读取：

- 资产列表与搜索结果
- 全片故事梗概
- 剧情摘要
- 人物关系
- 冲突 / 转折 / 高价值片段
- 结构化台词与片段理解引用

### 2.3 数据目标

- SQLite 负责结构化实体、关系、检索、状态与消费入口
- JSON / Markdown / 媒体文件继续保留，负责详细正文、大对象与原始生成产物
- 数据库与工件之间通过稳定路径引用关联

## 3. 非目标

本次设计明确不包含：

- 不将 Variant 域纳入 SQLite
- 不将 SceneForge runtime / stage draft / project workflow 状态纳入 SQLite
- 不做全局跨项目资产库
- 不做向量检索或语义检索
- 不让 SQLite 直接替代媒体与大文本工件文件
- 不重构现有 Remix Variant 落盘结构

## 4. 核心结论

### 4.1 SQLite 现在进入

SQLite 不是“未来可选增强”，而是现在进入的正式资产库持久化主层。

### 4.2 只覆盖资产库域

当前项目中，最适合正式结构化持久化的是资产库域，因此本期只覆盖：

- Source Asset
- Source Segment
- Source Keyframe
- Asset Tag
- Asset Summary / Story Entity
- Artifact Registry
- Search Index

### 4.3 文件工件继续保留

保留现有目录工件的原因：

- 原视频、切片、关键帧、SRT、JSON 分析结果天然是文件资产
- SceneForge / Remix 下游读取时经常需要按需加载详细内容
- 当前产物结构已稳定，直接推翻会增加迁移与风险成本

### 4.4 数据职责分层

统一采用如下职责分层：

- SQLite：正式结构化持久化层、列表与查询入口
- JSON：详细结构正文与原始分析结果
- Markdown：人读友好展示，不作为唯一机器事实源
- 媒体文件：视频、clip、关键帧、音频等大对象

## 5. 数据库位置与隔离边界

### 5.1 数据库位置

数据库文件固定放在：

```text
sceneforge/asset-library.db
```

不放在 `sceneforge/remix/` 下，原因如下：

- 该数据库不是 Remix 私有能力，而是 SceneForge 与 Remix 共读
- SceneForge 后续也会直接消费资产库内容
- 放在 `sceneforge/` 根下更符合“项目级资产基础设施”的角色

### 5.2 每个项目一个库

采用：

- **每个项目一个数据库**

不采用：

- 多项目共用一个数据库

原因：

- 项目目录移动 / 备份 / 复制时，数据库可整体携带
- 避免跨项目资产混存带来的隔离问题
- 与当前“项目目录内存在 `sceneforge/` 子结构”的模式一致

## 6. 目录结构

引入 SQLite 后的推荐目录结构如下：

```text
sceneforge/
  asset-library.db
  remix/
    source-assets/
      <sourceAssetId>/
        source_manifest.json
        processing_jobs.json
        analysis/
        transcripts/
        source_segments/
        ...
    variants/
      <variantId>/
        variant_manifest.json
        ...
```

说明：

- `asset-library.db` 是资产库结构化主索引
- `sceneforge/remix/source-assets/` 是资产详细工件根目录
- `variants/` 暂不入 SQLite

## 7. 领域模型

### 7.1 Source Asset

Source Asset 继续作为资产库主实体，负责：

- 资产身份
- 状态
- 原视频基本信息
- 资产级标签与备注
- 可复用摘要
- 与 segment / keyframe / artifact 的聚合关系

### 7.2 Source Segment

Source Segment 是资产下的结构化片段实体，负责：

- 时间边界
- clip 路径
- 关键帧索引
- 片段摘要
- prompt 摘要
- transcript / understanding / audio 工件路径引用

### 7.3 Source Keyframe

Keyframe 是片段下的帧级索引实体，负责：

- frame role（first / middle / last）
- 时间戳
- 图片路径

### 7.4 Artifact Registry

Artifact Registry 用于统一登记资产的外部工件路径，避免：

- 各处手工拼路径
- 各消费方各自维护一套“知道哪些文件存在”的逻辑

### 7.5 Search View

Search View 用于支撑：

- 资产列表搜索
- 模糊查询
- 选择器下拉
- 后续可扩展的标签筛选与故事摘要检索

## 8. 表结构设计

本期最小落地 7 张表。

### 8.1 `source_assets`

用途：资产主表，所有正式列表与详情入口都先查它。

字段建议：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | TEXT PK | source asset id |
| `project_dir` | TEXT | 项目目录绝对路径或稳定标识 |
| `title` | TEXT | 资产标题 |
| `status` | TEXT | `draft / processing / ready_for_review / published_to_library / failed` |
| `source_video_path` | TEXT | 原视频路径 |
| `source_manifest_path` | TEXT | manifest 路径 |
| `duration_ms` | INTEGER | 时长 |
| `width` | INTEGER | 视频宽 |
| `height` | INTEGER | 视频高 |
| `fps` | REAL | 帧率 |
| `segment_count` | INTEGER | segment 数量 |
| `keyframe_count` | INTEGER | keyframe 数量 |
| `variant_count` | INTEGER | 已派生 variant 数量 |
| `annotation_note` | TEXT NULL | 资产备注 |
| `last_annotated_at` | TEXT NULL | 最近标注时间 |
| `annotated_by` | TEXT NULL | 标注人 |
| `annotation_source` | TEXT NULL | 标注来源 |
| `logline` | TEXT NULL | 一句话梗概 |
| `story_summary_short` | TEXT NULL | 全片短摘要 |
| `main_conflict` | TEXT NULL | 主冲突 |
| `visual_style` | TEXT NULL | 视觉风格摘要 |
| `dialogue_style` | TEXT NULL | 台词风格摘要 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |
| `published_at` | TEXT NULL | 正式入库时间 |

### 8.2 `source_asset_tags`

用途：标签结构化拆表，支持筛选与模糊匹配。

字段建议：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | INTEGER PK | 自增主键 |
| `source_asset_id` | TEXT FK | 关联资产 |
| `tag` | TEXT | 原始标签 |
| `normalized_tag` | TEXT | 规范化标签 |
| `created_at` | TEXT | 写入时间 |

索引建议：

- `source_asset_id`
- `normalized_tag`

### 8.3 `source_segments`

用途：片段主表，支撑二创与 SceneForge 的片段级加载。

字段建议：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | TEXT PK | segment id |
| `source_asset_id` | TEXT FK | 所属资产 |
| `segment_index` | INTEGER | 排序序号 |
| `title` | TEXT | 标题 |
| `start_ms` | INTEGER | 起始时间 |
| `end_ms` | INTEGER | 结束时间 |
| `duration_ms` | INTEGER | 时长 |
| `boundary_type` | TEXT | 切片边界类型 |
| `review_status` | TEXT NULL | review 状态 |
| `source_clip_path` | TEXT | clip 路径 |
| `analysis_json_path` | TEXT NULL | 分段分析 JSON |
| `analysis_markdown_path` | TEXT NULL | 分段分析 Markdown |
| `segment_transcript_json_path` | TEXT NULL | 片段 transcript JSON |
| `transcript_correction_path` | TEXT NULL | 校对 transcript JSON |
| `segment_audio_path` | TEXT NULL | 片段音频路径 |
| `segment_audio_json_path` | TEXT NULL | 片段音频元数据 |
| `visual_summary` | TEXT NULL | 视觉摘要 |
| `shot_type` | TEXT NULL | 镜头类型 |
| `motion` | TEXT NULL | 动作摘要 |
| `plot_function` | TEXT NULL | 剧情功能 |
| `emotion` | TEXT NULL | 情绪摘要 |
| `video_prompt_excerpt` | TEXT NULL | prompt 摘要 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

### 8.4 `source_keyframes`

用途：关键帧索引表，支撑 first / middle / last 帧快速加载。

字段建议：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | TEXT PK | keyframe id |
| `source_asset_id` | TEXT FK | 所属资产 |
| `segment_id` | TEXT FK | 所属片段 |
| `frame_role` | TEXT | `first / middle / last` |
| `timestamp_ms` | INTEGER | 时间戳 |
| `image_path` | TEXT | 图片路径 |
| `created_at` | TEXT | 创建时间 |

### 8.5 `source_asset_artifacts`

用途：统一登记工件路径与类型。

字段建议：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | INTEGER PK | 自增主键 |
| `source_asset_id` | TEXT FK | 所属资产 |
| `artifact_type` | TEXT | 工件类型 |
| `relative_path` | TEXT | 相对项目根路径 |
| `content_format` | TEXT | `json / markdown / srt / wav / mp4 / png ...` |
| `scope` | TEXT | `asset / segment` |
| `segment_id` | TEXT NULL | 若为片段级工件则绑定 segment |
| `metadata_json` | TEXT NULL | 扩展元数据 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

`artifact_type` 示例：

- `source_manifest`
- `source_overview_json`
- `source_overview_md`
- `segment_analysis_json`
- `segment_analysis_md`
- `original_understanding_json`
- `source_transcript_json`
- `source_transcript_srt`
- `segment_manifest`
- `segment_clip`
- `segment_understanding_json`
- `keyframe_first`
- `keyframe_middle`
- `keyframe_last`

### 8.6 `source_asset_story_entities`

用途：结构化登记人物、事件链、转折点与改编方向。

字段建议：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | INTEGER PK | 自增主键 |
| `source_asset_id` | TEXT FK | 所属资产 |
| `entity_type` | TEXT | `character / event / turning_point / remix_direction` |
| `sort_order` | INTEGER | 排序 |
| `title` | TEXT NULL | 标题 |
| `description` | TEXT NULL | 描述 |
| `extra_json` | TEXT NULL | 扩展结构 |

### 8.7 `source_asset_search`

用途：全文检索。

建议使用 SQLite FTS5 虚表。

建议收录字段：

- `source_asset_id`
- `title`
- `tags_joined`
- `logline`
- `story_summary_short`
- `annotation_note`
- `character_text`
- `event_chain_text`
- `segment_excerpt_text`

## 9. 文件工件与数据库映射

### 9.1 `source_manifest.json`

映射到：

- `source_assets`
- `source_asset_tags`
- `source_segments`
- `source_keyframes`
- `source_asset_artifacts`

### 9.2 `source_overview.json`

映射到：

- `source_assets` 高频摘要字段
- `source_asset_story_entities`
- `source_asset_search`

### 9.3 `segment_analysis.json`

映射到：

- `source_segments` 的摘要字段
- `source_asset_search` 的片段摘要文本

### 9.4 `segment_manifest.json`

映射到：

- `source_segments` 补充字段
- `source_keyframes`
- `source_asset_artifacts`

### 9.5 Markdown 文件

不作为主写入源，只作为工件登记到：

- `source_asset_artifacts`

## 10. 写入策略

### 10.1 正式规则

以后“保存入库”不再只是写 `source_manifest.json`，而是正式的资产库提交动作。

统一流程：

1. 校验前置步骤完成
2. 校验关键工件存在
3. 解析结构化 JSON
4. 写 SQLite
5. SQLite 成功后，回写 manifest 状态为 `published_to_library`

### 10.2 成功定义

只有当以下条件全部满足时，资产才算真正入库成功：

- 必要工件存在
- SQLite 事务提交成功
- `source_manifest.json` 状态切换为 `published_to_library`

### 10.3 SQLite 成功优先于 manifest published

必须避免出现：

- manifest 已显示 `published_to_library`
- 但数据库没有完整资产记录

因此，推荐顺序是：

1. 先写数据库
2. 再切 published 状态

## 11. 事务与回滚

### 11.1 事务范围

一次“保存入库”的 SQLite 事务应覆盖：

- `source_assets`
- `source_asset_tags`
- `source_segments`
- `source_keyframes`
- `source_asset_artifacts`
- `source_asset_story_entities`
- `source_asset_search`

### 11.2 回滚规则

如果事务过程中任何一步失败：

- 整个 SQLite 事务回滚
- manifest 不切 `published_to_library`
- 保留已存在工件文件
- 页面提示“入库失败，资产未正式发布”

### 11.3 幂等规则

重复点击“保存入库”时，采用幂等更新：

- 主表 `upsert`
- 从表按 `source_asset_id` 先删后插
- FTS 条目重建

优先保证：

- 逻辑简单
- 结果稳定
- 易于校验

## 12. 读取策略

引入 SQLite 后，统一读取约束如下：

### 12.1 列表与搜索

以下场景只查 SQLite：

- 资产库列表
- 状态筛选
- 标签筛选
- 模糊搜索
- 资产下拉选择器

### 12.2 详情页

详情页读取顺序：

1. 先查 SQLite 主记录
2. 再按需通过 artifact path 读取详细 JSON / Markdown / 媒体

### 12.3 Remix 二创

入口：

- 先查 SQLite 获取已入库资产

选定后读取：

- 资产主记录
- segments
- keyframes
- prompt 摘要
- 必要时再回读详细 JSON

### 12.4 SceneForge

入口：

- 先查 SQLite 获取可选资产列表

选定后读取：

- 全片 summary
- 人物与事件链
- 片段摘要
- transcript / understanding 工件引用

## 13. 建库与迁移策略

### 13.1 建库时机

建议：

- 打开项目时确保 `sceneforge/asset-library.db` 存在
- 首次真正写入资产时自动建表

### 13.2 存量迁移

由于当前已有通过 JSON 成功入库的资产，必须支持补建数据库索引。

推荐提供一条“重建资产数据库索引”能力：

1. 扫描 `sceneforge/remix/source-assets/*/source_manifest.json`
2. 识别 `status = published_to_library` 的资产
3. 读取关联工件
4. 回填 SQLite
5. 输出结果报告

报告应至少包含：

- 成功数量
- 失败数量
- 缺失工件明细
- 被跳过资产明细

### 13.3 首次引入版本策略

首次上线 SQLite 版本时，建议：

- 应用启动检测 DB 是否为空
- 若为空但已存在 published 资产，则提示执行重建

同时在资产库页提供显式动作：

- `重建资产数据库索引`

## 14. 接口建议

本期不要求立即实现完整 API 重写，但后续能力应逐步收口到数据库读取。

建议新增或重构的服务职责：

- `asset-library-db.ts`
  - DB 初始化、建表、事务、查询封装
- `asset-library-ingest-service.ts`
  - 将 Source Asset 工件写入 SQLite
- `asset-library-rebuild-service.ts`
  - 扫描目录并重建 DB
- `asset-library-query-service.ts`
  - 资产列表、标签、搜索、详情摘要查询

## 15. 风险与权衡

### 15.1 风险

- 保存入库链路从“文件写盘”升级为“文件 + DB 双层提交”，复杂度上升
- 如果工件与 DB 的同步边界不清晰，容易出现 published 状态不一致
- 若过早把 Variant 也并入 DB，会拉高首轮风险

### 15.2 当前权衡

本设计选择：

- 只将资产库域纳入 SQLite
- Variant 保持文件式持久化
- 让 DB 负责消费入口，文件负责详细工件

这是当前阶段复杂度最低、收益最高的切入点。

## 16. 验收标准

- [ ] 项目目录下存在 `sceneforge/asset-library.db`
- [ ] 已入库资产可只通过 SQLite 支撑列表展示
- [ ] 已入库资产可通过 SQLite 支撑模糊搜索与下拉选择
- [ ] Remix 二创可通过 SQLite 选择资产并加载结构化摘要
- [ ] SceneForge 可通过 SQLite 选择资产并读取故事摘要上下文
- [ ] published 资产可以通过“重建资产数据库索引”重新补建进 DB
- [ ] 任一 DB 写入失败不会让 manifest 错误显示为 `published_to_library`

## 17. 设计结论

本期正式确立如下架构：

- `sceneforge/asset-library.db` 是项目级资产库的结构化持久化主层
- `sceneforge/remix/source-assets/` 是资产详细工件层
- SceneForge 与 Remix 后续统一先读 SQLite，再按需回读详细工件
- 当前只对资产库域做 SQLite 化，不扩散到 Variant 与工作流过程态

这是后续实现资产选择器、模糊搜索、二创引用、SceneForge intake 复用资产内容的基础。
