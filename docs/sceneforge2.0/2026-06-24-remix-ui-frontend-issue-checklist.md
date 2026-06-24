# SceneForge 2.0 Remix UI / 前端问题排查清单

日期：2026-06-24  
分支：`sceneforge2.0-remix`  
范围：Remix 首页进入、项目资产库、资产处理工作台、二创入口、录屏暴露的前端交互与产品层级问题  
依据：

- `.handoff/handoff-20260624-220000.md` 权威交接
- 用户录屏：`20260624201359.mp4`
- 既有审计：`docs/sceneforge2.0/audits/2026-06-24-remix-ui-ux-issue-audit.md`
- 当前实现关键位置：
  - `src/sceneforge/remix/pages/RemixAssetLibrary.tsx`
  - `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
  - `src/sceneforge/remix/components/AssetCard.tsx`
  - `src/sceneforge/remix/components/AssetDetailSidebar.tsx`
  - `src/sceneforge/remix/components/SourceVideoPreview.tsx`
  - `src/sceneforge/remix/components/SourceAssetThumbnail.tsx`
  - `src/sceneforge/remix/components/KeyframeGallery.tsx`
  - `src/sceneforge/remix/pages/RemixWorkspaceShell.module.css`

---

## 1. 总结论

当前问题不是简单的“界面不好看”，而是 **项目、资产库、资产处理、二创版本、二创工作区五层产品模型没有在 UI 中被清楚表达**。

录屏中最明显的问题是：

1. 用户从首页进入 Remix 后，不清楚自己进入的是“项目资产库”“素材处理队列”还是“二创入口”。
2. 原片导入后进入处理页，但处理一半可以直接返回资产库，且未入库素材被展示得像正式资产。
3. 资产库混合展示未处理、处理中、待确认、已入库资产，导致“资产库”概念失真。
4. 处理页顶部信息卡、右侧详情栏在长文件名、长路径、长 ID 场景下发生明显溢出和横向滚动。
5. 视频切片结果看起来像系统自动生成了几段，但没有足够可信的“按真实分镜切分”的技术和交互闭环。
6. 关键帧、缩略图、状态标签、按钮优先级等都还存在半成品感。

一句话：**当前 Remix 用了工作台的壳，但资产生命周期、处理状态机和二创派生关系没有真正立起来。**

---

## 2. 应重新明确的产品层级

建议统一采用以下模型：

```text
Project 项目
  └─ Project Asset Registry / 项目资产库
       └─ Source Asset 原片资产
            ├─ Processing Pipeline 资产处理流程
            │    ├─ 导入原片
            │    ├─ 智能分镜切片
            │    ├─ 关键帧提取
            │    ├─ 原片理解
            │    ├─ 人工标注
            │    └─ 保存入库
            └─ Remix Variant 二创版本
                 └─ Creation Workspace 二创工作区
```

关键判断：

- **项目是根容器**，不是“一个二创一个资产库”。
- **资产库属于项目**，用于管理该项目内可复用的 Source Asset。
- **Source Asset 必须先完成处理并保存入库**，才是正式资产库资产。
- **Remix Variant 是从已入库 Source Asset 派生出来的二创分支**。
- **未入库素材不应该被包装成正式资产卡片**，只能出现在“处理中队列 / 待确认队列”。

---

## 3. 状态与页面职责建议

| 对象 | 状态 | 应出现的位置 | 允许动作 |
|------|------|--------------|----------|
| Source Asset | `draft` / 未处理 | 素材处理队列 | 继续处理、删除草稿 |
| Source Asset | `processing` / 处理中 | 素材处理队列、处理工作台 | 继续当前步骤、保存草稿、取消处理 |
| Source Asset | `ready_for_review` / 待确认 | 待确认队列、处理工作台 | 补标签、补备注、保存入库 |
| Source Asset | `published_to_library` / 已入库 | 正式资产库 | 查看详情、创建二创、继续已有二创 |
| Source Asset | `failed` / 解析失败 | 异常队列 | 查看失败原因、重跑、删除 |
| Remix Variant | 草稿/各创作阶段 | 二创版本列表、Creation Workspace | 继续创作、复制、重命名、删除 |

资产库主界面建议拆成三个分区或三个 Tab：

1. `已入库资产`：正式素材库，只展示 `published_to_library`。
2. `处理中`：导入后未完成的素材，只允许继续处理。
3. `异常/失败`：导入或分析失败的素材。

二创入口只能从 `已入库资产` 发起。

---

## 4. P0 问题清单

### P0-01：资产库页面身份混乱

现象：

- 首页进入 Remix 后，页面同时表达“素材治理区”“原片资产库”“先确认素材，再决定怎么二创”。
- 用户无法判断当前是在做资产导入、资产管理，还是二创准备。
- 录屏中从资产库进入处理页，再返回资产库后，状态理解成本更高。

影响：

- 资产库职责不清。
- 用户不知道“当前页面的主任务是什么”。
- 后续二创入口会被未完成资产干扰。

建议：

- 将资产库拆成 `已入库资产` 与 `处理中队列`。
- 首页项目卡不要展示“Remix: 资产入库”这类入口意图作为项目类型。
- 页面标题要直接说明当前层级：`项目资产库 / 素材处理队列 / 二创工作区`。

对应方案文档：

- `technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`

---

### P0-02：处理一半可以直接返回资产库，但没有退出保护

现象：

- 处理页顶部有“返回资产库”。
- 当素材处于待确认、待保存、处理未完成状态时，仍可直接返回。
- 返回后用户看到的是一个类似正式资产库的卡片列表。

影响：

- 用户误以为处理结果已经保存或入库。
- 未完成素材和正式资产混在一起。
- 如果存在未保存标注或处理中任务，容易造成状态丢失或误解。

建议：

返回动作必须分语义：

1. `保存为处理中草稿并返回`
2. `继续留在处理页`
3. `放弃本次导入 / 删除未入库素材`

若存在未保存标注、后台任务、生成失败状态，必须有显式确认。

对应方案文档：

- `technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`

---

### P0-03：未入库素材被展示得太像正式资产

现象：

- 录屏最后，处理未完成素材在资产库中显示为大封面资产卡。
- 卡片中有“3 切片 / 9 关键帧 / 0 二创版本”等指标，很像正式资产。
- 但状态又是“待确认”，动作是“继续处理”。

影响：

- “资产库”概念失真。
- 用户会困惑：这到底是否已经入库？是否可以二创？是否已经处理完？

建议：

- `ready_for_review`、`processing`、`draft` 不进入正式资产网格。
- 用“处理任务卡”表达未入库素材：

```text
待确认 · 已完成 4/6 步
原片：xxx.mp4
阻塞：人工标注未保存 / 尚未保存入库
主动作：继续处理
次动作：删除草稿
```

对应方案文档：

- `technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`

---

### P0-04：处理页顶部 Hero 信息卡严重溢出

现象：

- 长文件名、长路径、长标题在顶部信息卡中互相挤压。
- “源文件 / 画面规格 / 时长切片 / 最近更新”等卡片在窄中栏下发生断行、覆盖、阅读困难。

影响：

- 这是录屏中最直观的“丑”和“乱”。
- 桌面创作工具不应在基础元数据展示上出现溢出。

建议：

- 顶部 Hero 不再使用四个窄信息卡。
- 改成一行轻量 meta：`2:04 · 1920×1080 · 3 段 · 9 帧 · 2026-06-24`。
- 长文件名最多两行 `line-clamp`，完整路径放 tooltip 或详情页。
- 所有卡片、详情行必须 `min-width: 0`。

对应方案文档：

- `technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`

---

### P0-05：右侧详情栏出现横向滚动和内容裁切

现象：

- 录屏后半段右侧详情面板出现横向滚动条。
- 字段和值被裁切，部分内容像被平移到面板外。
- 长 ID、长文件名、二创版本列表叠加后，右栏变得不可控。

影响：

- Inspector 作为专业工具右侧参数栏，不能出现横向滚动。
- 横向滚动会直接暴露布局系统不稳定。

建议：

- 右侧详情栏禁止横向滚动。
- `detailRow` 使用 grid 或 flex + `min-width: 0`。
- value 默认截断，鼠标悬停展示完整内容。
- ID、路径、文件名默认折叠，不占据主要阅读空间。

对应方案文档：

- `technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`

---

### P0-06：智能分镜切片不准确，像“傻乎乎乱切”

现象：

- 用户预期是根据实际视频分镜进行智能切片。
- 当前结果看起来更像粗暴按时长或弱规则切分，并不能准确对应真实镜头边界。
- 切片结果没有清晰展示置信度、切分依据、人工修正入口。

影响：

- 分镜切片是后续关键帧、原片理解、二创提示词生成的基础。
- 如果切片不可信，后面的所有产物都会跟着错。

建议：

- 不要继续依赖简单时长切分或单一阈值。
- 建议采用“候选边界检测 + 模型精修 + 规则约束 + 人工校准”的多层方案。
- 默认快速模式可用 PySceneDetect / FFmpeg scene score；高精度模式接 TransNetV2 或 AutoShot 类模型。
- LLM/VLM 只能辅助解释、合并建议和语义命名，不应该直接凭文本乱造镜头边界。

对应方案文档：

- `technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`

---

### P0-07：关键帧与缩略图反馈不可靠

现象：

- 关键帧提取后，画面看起来仍有暗色占位。
- 缩略图和关键帧是否真实生成成功，不够直观。
- 加载失败时，UI 更像空占位而不是明确错误。

影响：

- 用户无法判断关键帧是否真的提取成功。
- 资产卡片可信度下降。

建议：

- 关键帧图片路径为空或加载失败时必须显示错误状态。
- “关键帧已完成”必须与图片可见、路径可读绑定。
- 资产卡封面优先使用首个关键帧；没有关键帧时使用视频首帧；都失败时显示明确 fallback。

对应方案文档：

- `technical-solutions/05-remix-media-preview-keyframe-and-thumbnail-reliability.md`

---

### P0-08：状态体系混乱，用户不知道哪个状态是真的

现象：

同一屏中可能同时出现：已完成、待确认、待补齐、待保存、处理中、未开始、已入库、可入库、可发布。

影响：

- 用户不知道当前素材到底卡在哪。
- “步骤状态”和“资产生命周期状态”混在一起。

建议：

状态只保留两层：

1. 资产生命周期状态：未入库、处理中、待确认、已入库、失败。
2. 当前步骤状态：未开始、处理中、待确认、已完成、失败。

页面顶部只展示资产生命周期；步骤导航只展示步骤状态；右侧 Inspector 只展示阻塞原因和下一步。

对应方案文档：

- `technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`
- `technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`

---

## 5. P1 问题清单

### P1-01：整体视觉仍像概念稿，不像生产工具

现象：大面积深色背景、圆角卡片、装饰性边框和渐变让界面像营销页，主工作区没有专业工具的秩序。

建议：优先恢复“工具型布局”，不是继续美化装饰。中间区域承载媒体和结果；左侧是流程；右侧是参数与下一步。

对应方案文档：`technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`

### P1-02：中间主工作区没有成为真正主角

现象：三栏布局挤压中间区域，中间看起来大但有效信息有限，右侧和顶部反而争抢视觉重量。

建议：处理页改为“上方预览 + 下方结果”的工作台结构，右侧只保留 Inspector。

对应方案文档：`technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`

### P1-03：首页项目卡片混淆项目类型和入口意图

现象：首页项目卡上同时出现 `Remix: 资产入库`、`SceneForge`、`Remix Mode`。

建议：首页项目卡统一为：项目名、项目类型、上次位置、主按钮。

对应方案文档：`technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`

### P1-04：按钮优先级混乱

现象：同一流程里同时出现返回资产库、运行切片、提取关键帧、生成原片理解、保存人工标注、导入新原片、创建二创版本、查看详情、继续处理等动作。

建议：每个页面只保留一个主 CTA。

对应方案文档：

- `technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`
- `technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`

---

## 6. P2 问题清单

### P2-01：中英混排和工程术语外露

建议统一中文：

| 当前术语 | 建议中文 |
|----------|----------|
| Source Asset | 原片资产 / 源素材 |
| Variant | 二创版本 |
| Segment | 镜头段 / 切片 |
| Remix Mode | 二创模式 / Remix 二创 |
| Processing | 处理中 |
| Published to Library | 已入库 |

### P2-02：长文件名、长路径、长 ID 缺少统一展示策略

建议：

- 标题最多两行。
- 路径默认只显示文件名。
- ID 默认隐藏在“复制 ID / 技术信息”折叠区。
- 所有字段支持 tooltip 展示完整内容。

---

## 7. 建议落地顺序

1. **先改产品层级**：资产库、处理中队列、二创版本分层。
2. **再改退出保护和处理反馈**：处理一半不能无语义回退。
3. **接入智能分镜切片方案**：避免继续“傻切”。
4. **修布局溢出**：Hero、右侧栏、长文件名、横向滚动。
5. **修媒体可信度**：视频预览、关键帧、缩略图必须真实可见。
6. **最后统一视觉系统**：字号、间距、按钮、状态、术语。

---

## 8. 编号技术方案文档索引

| 编号 | 文档 | 解决范围 |
|------|------|----------|
| 01 | `technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md` | 项目资产库、资产生命周期、二创版本层级 |
| 02 | `technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md` | 处理页退出保护、任务反馈、状态恢复 |
| 03 | `technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md` | 布局、右侧栏、溢出、按钮、视觉系统 |
| 04 | `technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md` | 智能分镜切片技术方案 |
| 05 | `technical-solutions/05-remix-media-preview-keyframe-and-thumbnail-reliability.md` | 视频预览、关键帧、缩略图可信度 |

---

## 9. 验收口径

完成后不只看测试通过，而要按实机验收：

- 用户能明确知道当前在项目资产库、处理中队列还是二创工作区。
- 未入库素材不会被误认为正式资产。
- 处理一半返回时有明确选择和保护。
- 智能切片能贴合真实分镜，并能人工校准。
- 右侧 Inspector 不再横向滚动。
- 长文件名、长路径、长 ID 不再撑爆布局。
- 关键帧、缩略图、视频预览都能真实显示；失败时有明确错误。
- 二创只能从已入库资产发起。
