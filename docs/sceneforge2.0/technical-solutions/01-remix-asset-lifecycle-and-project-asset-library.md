# 01 - Remix 资产生命周期与项目资产库技术方案

日期：2026-06-24  
适用分支：`sceneforge2.0-remix`  
对应问题：P0-01、P0-03、P0-08、P1-03  
主目标：重新定义 Project、Source Asset、Project Asset Library、Processing Pipeline、Remix Variant 之间的层级关系，避免未入库素材和正式资产混淆。

---

## 1. 背景

当前 UI 中，“原片资产库”同时承担了以下职责：

1. 导入新原片。
2. 展示处理中素材。
3. 展示待确认素材。
4. 展示已入库素材。
5. 从已入库素材创建二创版本。
6. 管理已有二创版本。

这导致用户在录屏最后看到“处理一半的素材”仍然以正式资产卡形式出现，从而产生困惑：这到底是已经入库的资产，还是一个未完成的处理任务？

本方案要解决的是产品层级和状态机问题，不是单纯改几个文案。

---

## 2. 目标模型

推荐统一为：

```text
Project 项目
  └─ Project Asset Registry / 项目资产库
       ├─ Processing Queue / 素材处理队列
       │    └─ Source Asset Draft / Processing / Ready For Review
       └─ Published Library / 已入库资产
            └─ Source Asset Published
                 └─ Remix Variant 二创版本
                      └─ Creation Workspace 二创工作区
```

核心原则：

- Project 是根容器。
- Asset Library 是项目内的资产治理层，不是二创版本的私有资产库。
- 未入库素材不能作为正式资产展示。
- Remix Variant 只能从已入库 Source Asset 派生。
- Creation Workspace 只负责某个 Variant 的创作，不负责原片资产治理。

---

## 3. Source Asset 生命周期

建议保留并明确以下状态：

| 状态 | 中文 | 含义 | 页面归属 | 主动作 |
|------|------|------|----------|--------|
| `draft` | 未处理 | 已导入但尚未跑处理流程 | 处理中队列 | 开始处理 |
| `processing` | 处理中 | 正在或已经部分完成切片/关键帧/理解 | 处理中队列 + 处理工作台 | 继续处理 |
| `ready_for_review` | 待确认 | 自动处理已完成，但人工确认/标注/入库未完成 | 待确认队列 + 处理工作台 | 继续确认 |
| `published_to_library` | 已入库 | 完成处理并保存为正式资产 | 已入库资产库 | 创建二创 |
| `failed` | 解析失败 | 导入或处理失败 | 异常队列 | 查看失败 / 重跑 |

页面约束：

- 正式资产库默认只展示 `published_to_library`。
- `draft`、`processing`、`ready_for_review` 只能出现在“处理中 / 待确认”队列。
- `failed` 进入异常队列，不应混在正式资产库里。

---

## 4. Remix Variant 生命周期

Variant 是 Source Asset 的派生产物，不是新的资产库。

建议结构：

```ts
interface RemixVariantSummary {
  id: string;
  sourceAssetId: string;
  name: string;
  currentStage: RemixCreationStageId | null;
  status: 'draft' | 'in_progress' | 'ready_for_export' | 'exported' | 'failed';
  updatedAt: string;
}
```

约束：

- `createVariantFromSourceAsset` 必须校验 Source Asset 状态为 `published_to_library`。
- 如果 Source Asset 未入库，按钮不可用，并显示阻塞原因。
- 删除 Variant 不影响 Source Asset。
- 复制 Variant 只复制二创产物，不复制 Source Asset。

---

## 5. 页面信息架构

### 5.1 首页项目卡

当前问题：项目卡中混有 `SceneForge`、`Remix Mode`、`Remix: 资产入库` 等信息，用户分不清项目类型和入口意图。

建议显示：

```text
项目名：remixtest002
项目类型：SceneForge / Remix
上次位置：素材处理 · 人工标注
资产状态：2 个已入库 / 1 个待确认 / 0 个失败
主按钮：继续
次按钮：打开资产库
```

不要把“资产入库”作为项目类型展示，它只是上次入口意图或上次工作位置。

### 5.2 项目资产库首页

推荐三个 Tab：

1. `已入库资产`
2. `处理中`
3. `异常`

也可以左侧导航：

```text
资产治理
  - 已入库资产
  - 处理中
  - 异常
二创版本
  - 最近二创
  - 全部二创
```

### 5.3 已入库资产卡

只展示正式可二创资产：

```text
[真实缩略图]
素材标题
2:04 · 1920×1080 · 3 个镜头段 · 9 张关键帧
标签：人物冲突 / 近景 / 反转
主动作：创建二创
次动作：查看详情
```

### 5.4 处理中任务卡

不要用正式资产卡样式：

```text
待确认 · 已完成 4/6 步
原片：example.mp4
阻塞：人工标注未保存 / 尚未保存入库
主动作：继续处理
次动作：删除草稿
```

---

## 6. 数据与 IPC 调整建议

### 6.1 listSourceAssets 增加过滤参数

```ts
listSourceAssets({
  projectDir,
  status?: SourceAssetStatus | SourceAssetStatus[],
  includeDrafts?: boolean,
  includeFailed?: boolean,
})
```

页面调用建议：

- 已入库资产：`status: ['published_to_library']`
- 处理中：`status: ['draft', 'processing', 'ready_for_review']`
- 异常：`status: ['failed']`

### 6.2 createVariantFromSourceAsset 增加后端门禁

后端必须校验：

```ts
if (sourceAsset.status !== 'published_to_library') {
  throw new Error('这份素材尚未保存入库，不能创建二创版本。');
}
```

前端禁用按钮只是体验层，后端必须兜底。

### 6.3 SourceAsset 增加处理进度字段

建议新增：

```ts
interface SourceAssetProcessingProgress {
  totalSteps: number;
  completedSteps: number;
  blockingReason?: string;
  lastStepId?: AssetProcessingStepId;
  lastStepStatus?: 'not_started' | 'running' | 'ready_for_review' | 'approved' | 'failed';
}
```

处理中队列卡片直接消费这个字段。

---

## 7. 前端组件拆分建议

建议新增/调整：

```text
RemixAssetLibraryPage
  ├─ PublishedAssetTab
  │    ├─ PublishedAssetGrid
  │    └─ PublishedAssetInspector
  ├─ ProcessingQueueTab
  │    ├─ ProcessingTaskList
  │    └─ ProcessingTaskInspector
  └─ FailedAssetTab
       └─ FailedAssetList
```

当前 `AssetCard` 不应同时承担正式资产卡和处理任务卡。

建议拆成：

- `PublishedAssetCard`
- `ProcessingAssetTaskCard`
- `FailedAssetCard`

---

## 8. 路由建议

```text
#/remix/assets?tab=published
#/remix/assets?tab=processing
#/remix/assets?tab=failed
#/remix/source/:sourceAssetId/processing/:stepId
#/remix/source/:sourceAssetId/variants/:variantId
```

recent project 恢复时：

- 如果上次在处理中：回到对应处理页。
- 如果上次在资产库：回到对应 Tab。
- 如果上次在二创：回到 Variant 工作区。

---

## 9. 验收标准

- [ ] 已入库资产库不展示未入库素材。
- [ ] 处理中素材只出现在处理中队列。
- [ ] 未入库素材不能创建二创版本。
- [ ] 点击创建二创时，后端也会校验资产状态。
- [ ] 首页项目卡能区分项目类型、上次位置、资产统计。
- [ ] 处理到一半返回时，用户能在处理中队列找到该任务。
- [ ] 删除 Variant 不会影响 Source Asset。
- [ ] 删除未入库草稿需要二次确认。

---

## 10. 实施顺序

1. 新增资产库 Tab 和过滤参数。
2. 拆 `AssetCard` 为正式资产卡和处理任务卡。
3. `createVariantFromSourceAsset` 增加前后端状态门禁。
4. 首页项目卡改为项目类型 + 上次位置 + 状态统计。
5. recent project 恢复到具体 Remix 路由。
6. 增加 E2E：未入库素材不能创建二创，已入库素材可以创建二创。
