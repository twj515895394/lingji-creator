# SceneForge / Remix 阶段性项目总结（2026-07-02）

## 1. 文档目的

这份文档用于沉淀当前 `SceneForge + Remix` 项目的阶段性成果、真实代码现状、已完成能力、未完成事项，以及下一阶段演进时应该从哪些代码入口继续推进。

本文特别聚焦三块：

1. `SceneForge` 创作工坊功能
2. `资产入库 / 资产库` 功能
3. 后续要继续开发的 `二创（Remix Creation）` 功能

同时补充：

- 当前产品边界到底在哪里
- 关键入口、服务、持久化和页面之间是怎样串起来的
- 如果后续把二创交互改成更接近“无限画布”的方式，哪些代码入口和领域边界会受影响

---

## 2. 当前项目总体定位

当前项目已经不再只是一个“脚本生成器”或“单次视频生产工具”，而是在应用内部逐步形成两条并行但关联的工作流：

1. `SceneForge`
   面向“从题材、主题、改编方向、分镜、视频提示词逐步推进”的创作工坊。

2. `SceneForge Remix`
   面向“从原片导入、切片理解、入库、再发起二创版本”的素材资产化与再创作工作流。

这两条线共享同一个项目目录下的 `sceneforge/` 结构，但职责不同：

- `SceneForge` 更偏“创作草稿工程域”
- `Remix` 更偏“素材资产域 + 二创工程域”

当前已经形成的产品语义是：

- `SceneForge` 负责从创作需求出发生成内容方案
- `Remix` 负责把源视频处理成结构化资产，并基于已入库资产发起二创
- `资产库` 开始成为这两条线未来共享的中枢基础设施

---

## 3. 顶层代码入口与路由关系

### 3.1 Electron 主进程入口

主进程统一注册入口在 [electron/main.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/main.ts)。

当前与本阶段最相关的注册点有：

- `registerSceneForgeIpc()`
- `registerSceneForgeRemixIpc()`
- `createSceneForgeProject(...)`

这意味着：

- `SceneForge` 和 `Remix` 都已经是正式主进程能力，不是前端 mock 页面
- 项目创建、状态读取、资产处理、二创工作区读取，都通过 Electron IPC 进入后端服务层

### 3.2 Renderer 顶层页面装配

应用页面装配主入口在 [src/App.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/App.tsx)。

当前已经正式接入的页面包括：

- `SceneForgeStudio`
- `RemixAssetLibrary`
- `RemixAssetProcessing`
- `RemixCreationWorkspace`

这里是后续任何产品级改造的第一入口，因为它决定了：

- 用户当前处于 `SceneForge` 还是 `Remix`
- Remix 当前落在“资产库 / 资产处理 / 二创工作区”的哪一个子页面
- 页面之间如何跳转、如何带上 `projectDir / sourceAssetId / variantId`

### 3.3 Remix 模式进入与路径解析

Remix 模式的进入和路径语义主要分布在：

- [src/lib/remix-entry.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/lib/remix-entry.ts)
- [src/lib/remix-app-session.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/lib/remix-app-session.ts)
- `src/sceneforge/remix/lib/remix-routing`

这些模块定义了几个关键产品约束：

- 资产入库可以从 SceneForge 项目目录进入
- 二创只能从已有 SceneForge / Remix 工程进入
- 二创不是任意空目录就能发起，而是依赖已入库资产

这套约束已经把“资产化先行、创作复用后置”的方向固定下来。

---

## 4. SceneForge 功能现状

### 4.1 功能定位

`SceneForge` 当前是一个分阶段推进的创作工坊，核心不是一次性生成最终视频，而是把创作流程拆成多阶段、可检查、可人工确认、可继续推进的流水线。

它更接近：

- 创作编排台
- 阶段化草稿工作台
- 结构化内容生成工作流

而不是传统意义上的“单页 prompt 表单”。

### 4.2 当前页面入口

主页面在 [src/sceneforge/pages/SceneForgeStudio.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/pages/SceneForgeStudio.tsx)。

这是当前 `SceneForge` 的核心工作台入口，负责：

- 读取项目状态
- 展示 pipeline sidebar
- 选择当前 stage
- 展示 stage 产物
- 调用阶段运行、校验、继续推进、人工确认等能力

### 4.3 当前工作方式

从当前代码看，`SceneForgeStudio` 已经不是静态原型，而是一个真正的“阶段工作区壳层”。它已经具备：

- 阶段切换
- 阶段状态展示
- 产物选择与预览
- 校验与推进
- 不同阶段使用不同工作区模板
- 核心阶段与支撑阶段分层

关键支撑模块包括：

- `scene-pipeline-ui`
- `scene-stage-capabilities`
- `scene-stage-nav`
- `scene-artifact-selection`
- `scene-hitl-markdown`
- `scene-continue-run`

这些模块说明当前 `SceneForge` 已经形成了自己的领域语言：

- `stage`
- `artifact`
- `approval policy`
- `validate / continue`
- `support submit stage`
- `core studio stages`

### 4.4 当前阶段结构

从代码现状可见，`SceneForge` 已经覆盖一批明确阶段，至少包括：

- `topic_gate`
- `design`
- `storyboard`
- `video_prompts`
- 以及一组 support stages，例如素材、脚本、表演、音频、发布等

其中最核心的 studio 阶段被收敛为：

- `design`
- `storyboard`
- `video_prompts`

这说明当前产品已经把“创作主链路”的重点放在：

- 方向确认
- 分镜组织
- 视频提示词产出

### 4.5 SceneForge 当前持久化与服务边界

主进程服务入口在 [electron/sceneforge/ipc.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/ipc.ts) 与 [electron/sceneforge/service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/service.ts)。

项目创建与工程文件结构相关入口在：

- [electron/sceneforge/project/scene-project-file.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/project/scene-project-file.ts)

当前这一层承担的是：

- SceneForge 项目初始化
- 项目状态读取
- 阶段草稿与产物管理
- 阶段推进与审批语义

### 4.6 对后续开发的意义

`SceneForge` 当前已经具备比较完整的“创作工坊骨架”，下一阶段如果要继续加强，优先不是再加更多页面，而是继续深化三个方向：

1. 每个 stage 的输入输出契约是否更稳定
2. 产物是否能更顺滑地复用到 `Remix` 或资产库
3. `SceneForge` 是否直接消费资产库中已入库的故事、人物、片段理解结果

换句话说，`SceneForge` 当前最大的价值不是它已经做完了，而是它已经有了稳定壳层，后续可以承接更强的内容编排能力。

---

## 5. 资产入库功能现状

### 5.1 产品定位

资产入库不是一个独立小功能，而是当前整个 `Remix` 方向最关键的基础层。

它承担的是：

- 把“原视频”变成“结构化可复用素材”
- 把一次性处理结果变成可搜索、可筛选、可派生二创版本的项目级资产
- 为未来 `SceneForge` 与 `Remix` 共用同一套资产事实源打基础

### 5.2 当前整体流程

当前 `Remix` 原片处理工作台，已经形成 6 步主流程：

1. 导入原片
2. 镜头切片
3. 关键帧提取
4. 原片理解
5. 资产标记
6. 保存入库

这个设计的关键变化是：

- 第 5 步已经被收紧成资产级语义，不再伪装成 segment 逐条人工修订
- 第 6 步明确是资产级状态确认，而不是继续做片段理解

这套设计在文档 [docs/superpowers/specs/2026-06-30-remix-asset-marking-and-publish-design.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/specs/2026-06-30-remix-asset-marking-and-publish-design.md) 里已经有明确约束，当前代码也基本沿着这个方向在收敛。

### 5.3 主服务入口

`Remix` 的总服务编排入口在 [electron/sceneforge/remix/remix-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-service.ts)。

这是当前 Remix 后端的核心枢纽，负责串起：

- Source Asset 创建
- 分段与关键帧
- 音频抽取
- transcript
- understanding
- correction
- report export
- variant 派生
- asset library ingest/query/rebuild

可以把它理解为：

- `Remix` 后端应用服务层
- 所有资产处理与二创能力的统一协调器

### 5.4 Source Asset 是当前资产域主实体

当前 Source Asset 创建与元数据维护主入口在 [electron/sceneforge/remix/remix-source-asset-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-source-asset-service.ts)。

它当前负责：

- 从导入结果或直接文件路径创建 `SourceAsset`
- 写入 `source_manifest.json`
- 维护原始视频引用
- 维护 `videoMetadata`
- 更新资产标签、备注、标注时间
- 重建历史资产的视频元数据

当前 `SourceAsset` 已经承载的关键信息包括：

- 原视频路径
- transcript / srt 路径
- source overview 路径
- segment analysis 路径
- 分段列表
- 资产标签与注释
- variantCount
- 入库状态

这说明当前“资产入库”并不是只保存一行 title，而是已经形成了完整资产主文档。

### 5.5 真实视频元数据已经接通

这次阶段里一个很重要的完成项是：

- `SourceAsset.videoMetadata` 不再依赖固定假值
- 改为通过主进程媒体探测读取真实时长与视频元数据

相关入口包括：

- [electron/media-duration.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/media-duration.ts)
- [electron/sceneforge/remix/remix-source-asset-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-source-asset-service.ts)

并且已经补上：

- 历史资产元数据重建能力
- 对已入库资产的同步更新能力
- 资产库页面上的“重建视频元数据”入口

这件事的意义非常大，因为后续任何与素材筛选、展示、切片时长判断、导出配置相关的逻辑，都必须以真实元数据为基础。

### 5.6 当前持久化分层

当前资产库已经形成“文件工件层 + SQLite 结构化层”的双层结构。

#### 文件工件层

主要位于：

- `sceneforge/remix/source-assets/<sourceAssetId>/`

里面保存：

- `source_manifest.json`
- `processing_jobs.json`
- `analysis/`
- `transcripts/`
- `audio/`
- `source_segments/`
- segment 下的 clip、理解结果、transcript、audio、关键帧等

这一层继续承担：

- 原始媒体文件
- 详细 JSON 结果
- Markdown 说明文档
- 人类可读产物

#### SQLite 结构化层

数据库设计和实现入口包括：

- [docs/asset-library/2026-06-30-sqlite-persistence-design.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/asset-library/2026-06-30-sqlite-persistence-design.md)
- [electron/sceneforge/assets/asset-library-db.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/assets/asset-library-db.ts)
- [electron/sceneforge/assets/asset-library-ingest-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/assets/asset-library-ingest-service.ts)
- [electron/sceneforge/assets/asset-library-query-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/assets/asset-library-query-service.ts)
- [electron/sceneforge/assets/asset-library-rebuild-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/assets/asset-library-rebuild-service.ts)

当前的明确定位是：

- SQLite 负责正式结构化查询
- JSON / Markdown / 媒体目录继续保留
- 两者通过稳定路径引用关联

这层已经不是“未来想做”，而是已经进入真实代码实现阶段。

### 5.7 当前资产入库已经具备的能力

结合现有代码与本阶段推进，资产入库链路已经具备：

1. 原视频导入并创建 `SourceAsset`
2. 原片切片、关键帧、transcript、understanding 等工件落盘
3. 第 5 步资产级标记
4. 第 6 步保存入库，状态切到 `published_to_library`
5. 入库后同步写入 SQLite 资产库
6. 资产库页面按状态筛选、查看详情、查看 variant 数量
7. 历史资产视频元数据重建
8. 入库资产被删除时的门禁约束

### 5.8 资产库前端入口

前端资产库主页面在 [src/sceneforge/remix/pages/RemixAssetLibrary.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetLibrary.tsx)。

这个页面当前已经承担：

- 按状态加载资产
- 读取每条资产详情快照
- 标签筛选
- 进入资产处理页
- 基于已入库资产创建 variant
- 重建视频元数据

因此如果后续要继续改“资产库体验”，主要就从这里进入。

### 5.9 当前理解链路的稳定性补强

本阶段另一个重要完成项是 transcript / understanding 新鲜度控制。

相关模块包括：

- [electron/sceneforge/remix/remix-transcript-correction-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-transcript-correction-service.ts)
- [electron/sceneforge/remix/remix-understanding-service.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-understanding-service.ts)
- [electron/sceneforge/remix/remix-understanding-workbench.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-understanding-workbench.ts)

当前已经做到：

- correction 不会再无条件覆盖更新后的 transcript
- workbench、理解报告导出、状态判断共用同一套“是否 stale”的判定逻辑

这保证了“入库之前的原片理解结果”不会因为旧修订件而失真，对资产库质量非常关键。

### 5.10 当前明确未做的事项

当前有一个被讨论过但明确暂缓的方向：

- `master_clip` 方案

它的本意是把“分析用片段”和“最终复用导出片段”分层，例如：

- 用轻量 clip 做理解与工作流
- 用更高质量 master clip 作为后续正式复用源

但这个方案目前暂不推进，原因是：

- 现阶段切片视频没有观察到明显画质损失
- 当前更值得优先收敛的是资产事实源、入库链路与二创工作区

因此本阶段结论是：

- `master_clip` 不是当前实现的一部分
- 后续如果真的出现质量问题，再作为专项演进

---

## 6. 二创功能现状

### 6.1 当前产品定位

当前二创功能不是“做完了”，而是已经有了一个完整但仍偏流程化的第一版工作台。

它的核心产品语义是：

- 从已入库 `SourceAsset` 派生 `Variant`
- 在 variant 上定义创作概念、保留替换策略、视觉设计、关键帧编辑提示词与视频生成提示词
- 最后导出 prompt bundle，供后续生产环节使用

### 6.2 当前入口约束

当前二创必须从已入库资产发起，这个约束已经写进产品与代码里。

前端资产库页会从已入库资产上触发：

- `createVariantFromSourceAsset(...)`

主服务实现位于 `remix-service`，对应 Variant 相关服务在：

- `RemixVariantService`
- `RemixStrategyService`
- `RemixDesignService`
- `RemixKeyframePromptService`
- `RemixEditedKeyframeService`
- `RemixSeedancePromptService`

这说明二创功能当前已经被拆成多个明确子域，而不是一个混杂页面。

### 6.3 当前二创页面入口

前端二创工作区主页面在 [src/sceneforge/remix/pages/RemixCreationWorkspace.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixCreationWorkspace.tsx)。

当前页面的核心结构是“阶段式工作台”，包括：

- 选择资产 / 创建 variant
- strategy
- design
- keyframe prompts
- edited keyframes
- seedance prompts
- publish bundle

从这个结构可以看出，当前二创第一版采用的是线性步骤流，而不是开放式创作空间。

### 6.4 当前 Variant 模型已经承载的能力

结合现有代码与设计文档，当前 `Variant` 已经至少承载：

- variant 基础信息
- 概念说明
- `referenceStrength`
- `defaultGenerationMode`
- `retentionMatrix`
- strategy 产物
- design 产物
- keyframe edit prompts
- edited keyframes
- seedance prompts

这说明二创并不是“只有一个名称”，而是已经具备较完整的数据骨架。

### 6.5 当前二创方式的优点

当前线性工作台方式的优点是：

- 好实现
- 数据边界清晰
- 每一步的输入输出容易定义
- 对 prompt bundle 导出比较友好

它适合作为“从资产入库到首个可用二创链路”的落地方案。

### 6.6 当前二创方式的局限

但也正因为它是线性步骤流，所以当前体验很可能会出现以下问题：

- 创作动作被拆得过于流程化
- 用户在不同步骤之间切换时，上下文不够连续
- 很多内容其实是围绕同一片段、同一视觉、同一叙事意图反复修改，但 UI 被迫拆散
- “构思”“拖拽比对”“片段拼装”“局部改写”“参考画面组织”这些动作不够自然

这也是当前用户已经明确表达不满意的部分：现有方式不是最终理想形态。

### 6.7 后续可能演进为“无限画布式二创工作区”

这是下一阶段最值得认真重新设计的方向。

如果后续真的把二创做成类似“无限画布”的方式，更合理的产品形态可能是：

- 资产片段、关键帧、策略卡片、设计卡片、prompt 卡片，全部变成可摆放对象
- 用户以空间方式组织想法，而不是只能沿步骤页逐一前进
- “保留什么、改什么、以什么参考图驱动、最终生成什么 prompt”在一个统一画布上联动
- Variant 变成一个“创作画布工程”，而不只是一个线性的 step snapshot

这件事目前还不是要立刻编码的结论，但应该作为后续二创产品重设计的核心方向储备下来。

---

## 7. 如果后续改成无限画布，哪些入口会被牵动

这部分很关键，因为未来改造不能只改 UI 名字，必须知道真正会动到哪里。

### 7.1 第一层：App 路由与页面切换

会受影响的第一入口是：

- [src/App.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/App.tsx)

需要重新定义的问题包括：

- `RemixCreationWorkspace` 是否继续作为单页入口
- 是否拆成“资产库 -> 创作画布”而不是“资产库 -> 步骤工作区”
- 当前 hash route / `variantId` 路由语义是否仍然够用

### 7.2 第二层：二创页面壳层

当前最大受影响页面是：

- [src/sceneforge/remix/pages/RemixCreationWorkspace.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixCreationWorkspace.tsx)

如果转无限画布，这个页面大概率不只是小修，而是会变成：

- 新的画布容器页
- 节点 / 卡片 / 连线 / inspector 并存的空间型工作区

当前页面里的这些“按 step 切换”的组织方式会被重写：

- `activeStepId`
- `stepStatuses`
- `RemixStageNav`
- `PublishChecklist`

### 7.3 第三层：Variant 数据模型

后续很可能要重新审视 `StoredVariantDocument` 的结构。

当前 Variant 更像：

- 线性步骤汇总文档

如果改成画布式工作区，可能新增或演化出：

- 画布节点
- 节点布局
- 节点间引用关系
- 从节点集合导出 prompt bundle 的规则

也就是说，未来最可能变化的不是 `SourceAsset`，而是 `Variant`。

### 7.4 第四层：创作子域服务

当前这些服务是围绕“线性步骤产物”组织的：

- `RemixStrategyService`
- `RemixDesignService`
- `RemixKeyframePromptService`
- `RemixEditedKeyframeService`
- `RemixSeedancePromptService`

如果改成无限画布，服务层不一定全部推翻，但职责会更偏向：

- 生成节点内容
- 更新节点内容
- 节点之间建立引用
- 从局部节点集合生成下游产物

也就是说，未来服务层更适合围绕“创作对象”建模，而不是围绕“页面步骤”建模。

### 7.5 第五层：前端交互基础设施

如果走无限画布方向，前端还会牵动：

- 画布拖拽与缩放
- 对象选择与多选
- inspector 联动
- 空间布局持久化
- 引用关系可视化

当前仓库里虽然有一些已有的 canvas/交互能力可参考，但还不能直接说明 Remix 二创已经具备无限画布底座，因此后续更像是一次新的工作区形态设计。

---

## 8. 当前阶段已经完成的核心成果

本阶段可以明确确认的成果包括：

1. `SceneForge` 已经形成正式创作工坊壳层，而不是单一草稿页。
2. `Remix` 已经形成从原片导入到保存入库的完整资产化主链路。
3. 资产库已经进入“JSON/文件工件 + SQLite 结构化层”双层持久化模式。
4. `SourceAsset` 已经成为稳定的资产域主实体。
5. 入库状态 `published_to_library` 已经成为后续二创发起的正式门禁。
6. 历史资产视频元数据可重建，且已接通真实视频 metadata 探测。
7. transcript correction 与 understanding stale 判定已经做了统一收敛。
8. 二创第一版工作区已经可用，具备 variant、strategy、design、keyframe prompts、edited keyframes、seedance prompts、bundle export 的完整骨架。

---

## 9. 当前阶段尚未完成或需要谨慎推进的事项

### 9.1 `master_clip` 暂不推进

当前没有证据表明切片质量已经成为瓶颈，因此先不引入 master clip 双层方案，避免把系统复杂度提前拉高。

### 9.2 二创 UI / 交互形态尚未定型

当前二创流程版可用，但不是最终满意方案。后续要重点重做的不是小修文案，而是整个创作工作区组织方式。

### 9.3 SceneForge 与资产库的深度打通还没做完

虽然资产库已经具备基础层，但 `SceneForge` 还没有充分消费这些结构化资产事实，例如：

- 已入库故事梗概
- 角色关系
- 冲突与转折
- 高价值片段

这部分是下一阶段很值得加强的连接点。

### 9.4 Variant 仍然偏“流程文档”，还不是“创作空间工程”

这是未来二创重构前必须接受的现实边界：现在有骨架，但还没有达到理想创作体验。

---

## 10. 后续开发建议顺序

基于当前现状，后续更建议按下面顺序推进：

1. 继续稳住资产库事实源
   重点是保证 `SourceAsset / Segment / Keyframe / Overview / Analysis / SQLite` 一致可靠。

2. 推进 `SceneForge` 对资产库的消费
   让创作工坊开始真正吃到已入库素材的结构化价值。

3. 暂停对二创页面做零碎修补
   先把当前不满意的交互问题完整梳理出来，再决定是否转向“无限画布式工作区”。

4. 如果确认重做二创形态，优先从 Variant 模型和页面壳层设计开始
   不要只在现有 step UI 上继续缝补。

---

## 11. 一句话阶段结论

当前项目已经完成了从“SceneForge 创作工坊雏形”到“Remix 资产入库主链路落地”的关键跨越，下一阶段的真正重点不再是补几个零散按钮，而是围绕“资产库成为中枢”与“二创工作区形态重设计”继续往前推进。
