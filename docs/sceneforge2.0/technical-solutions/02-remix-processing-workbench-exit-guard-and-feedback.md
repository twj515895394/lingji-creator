# 02 - Remix 资产处理工作台退出保护与任务反馈技术方案

日期：2026-06-24  
适用分支：`sceneforge2.0-remix`  
对应问题：P0-02、P0-08、P1-04  
主目标：解决“资产处理一半可以直接退回资产库”“处理动作反馈弱”“用户不知道当前卡在哪”的问题。

---

## 1. 背景

录屏中，用户导入原片后进入资产处理页，依次进行切片、关键帧、原片理解、人工标注等步骤。当前处理页允许用户通过“返回资产库”直接离开，但 UI 没有明确告诉用户：

- 当前步骤是否完成。
- 是否存在未保存标注。
- 后台任务是否仍在运行。
- 返回后该素材会出现在哪里。
- 是否已经正式入库。

这会造成“处理一半怎么就退出来了”的强烈割裂感。

---

## 2. 设计原则

1. **返回不是单一动作，而是状态决策。**
2. **处理页必须明确当前任务、处理中态、完成结果、失败原因。**
3. **未入库素材返回后只能回到处理中队列，不进入正式资产库。**
4. **每个页面只能有一个主动作。**
5. **状态必须分为资产生命周期状态和当前步骤状态，不混用。**

---

## 3. 退出保护规则

### 3.1 安全返回

满足以下条件时，可直接返回处理中队列或资产库：

- 没有后台任务运行。
- 没有未保存人工标注。
- 当前快照已保存。
- 当前素材状态明确。

### 3.2 需要确认的返回

以下情况必须弹出确认面板：

| 情况 | 面板主文案 | 可选动作 |
|------|------------|----------|
| 有未保存标注 | 当前人工标注尚未保存 | 保存并返回 / 不保存返回 / 取消 |
| 当前任务运行中 | 系统正在执行当前步骤 | 等待完成 / 停止任务并返回 / 取消 |
| 处理未完成 | 这份素材还没有保存入库 | 保存为处理中草稿并返回 / 继续处理 / 删除草稿 |
| 处理失败 | 当前步骤执行失败 | 查看错误 / 返回异常队列 / 重跑 |

### 3.3 返回目标

| Source Asset 状态 | 返回目标 |
|-------------------|----------|
| `draft` | 处理中队列 |
| `processing` | 处理中队列 |
| `ready_for_review` | 待确认队列 |
| `published_to_library` | 已入库资产 |
| `failed` | 异常队列 |

---

## 4. 前端状态模型

建议处理页维护显式状态：

```ts
interface ProcessingWorkspaceState {
  sourceAssetId: string;
  assetStatus: SourceAssetStatus;
  activeStepId: AssetProcessingStepId;
  activeJob: ProcessingJobState | null;
  hasUnsavedChanges: boolean;
  lastSavedAt?: string;
  blockingReason?: string;
}

interface ProcessingJobState {
  id: string;
  stepId: AssetProcessingStepId;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}
```

当前 `activeAction` 只能表达“有按钮正在运行”，不能表达完整任务生命周期。建议替换或扩展为 `activeJob`。

---

## 5. 任务反馈 UI

### 5.1 顶部状态条

处理页顶部应显示：

```text
未入库 · 当前步骤：智能分镜切片 · 已完成 2/6
阻塞：人工标注未保存
```

不要同时显示“待确认 / 可入库 / 待补齐 / 可发布”等多个含义重叠状态。

### 5.2 当前任务卡

当前任务卡应包含：

- 当前步骤名称
- 当前步骤状态
- 主动作
- 最近一次执行结果
- 失败原因
- 下一步入口

示例：

```text
智能分镜切片
状态：已完成，待人工校准
结果：检测到 12 个镜头段，2 个低置信度边界
主动作：进入切片校准
次动作：重新切片
```

### 5.3 执行中态

运行切片、提取关键帧、生成理解时，必须显示：

- 执行阶段
- 进度或至少阶段性消息
- 当前输入素材
- 可取消状态
- 主进程错误摘要

不要只把按钮文案改成“处理中…”。

---

## 6. 按钮优先级

每个步骤只保留一个主 CTA。

| 步骤 | 主 CTA | 次动作 |
|------|--------|--------|
| 导入原片 | 开始智能分镜切片 | 返回处理中队列 |
| 分镜切片 | 运行智能切片 / 校准切片 | 重新切片 |
| 关键帧 | 提取关键帧 | 查看失败详情 |
| 原片理解 | 生成原片理解 | 复制分析文本 |
| 人工标注 | 保存人工标注 | 清空草稿 |
| 保存入库 | 保存入库 | 返回待确认队列 |

---

## 7. 后端任务记录

建议每次任务执行写入 job record：

```json
{
  "jobId": "job_xxx",
  "sourceAssetId": "source_xxx",
  "stepId": "segmentation",
  "status": "succeeded",
  "inputHash": "...",
  "outputSnapshotId": "...",
  "logs": [],
  "error": null,
  "startedAt": "2026-06-24T20:00:00.000Z",
  "finishedAt": "2026-06-24T20:00:12.000Z"
}
```

这样 UI 才能在刷新或 recent project 恢复后知道上一次发生了什么。

---

## 8. IPC 建议

新增或扩展：

```ts
getSourceAssetProcessingState({ projectDir, sourceAssetId })
runSourceProcessingStep({ projectDir, sourceAssetId, stepId, options })
cancelSourceProcessingJob({ projectDir, jobId })
listSourceAssetJobs({ projectDir, sourceAssetId })
```

`runSourceSegmentation`、`runSourceKeyframes`、`runSourceUnderstanding` 可以先内部适配到统一 job 机制。

---

## 9. 验收标准

- [ ] 有未保存标注时点击返回，会出现保存/不保存/取消选择。
- [ ] 未入库素材返回后进入处理中或待确认队列，不进入正式资产库。
- [ ] 运行切片时有明确处理中态，不只是按钮变文案。
- [ ] 失败时能看到失败原因和重跑入口。
- [ ] 刷新或 recent project 恢复后，能回到上次处理步骤。
- [ ] 每个步骤只有一个主 CTA。
- [ ] 顶部状态条不再混用资产状态和步骤状态。

---

## 10. 实施顺序

1. 把 `activeAction` 扩展为 `activeJob`。
2. 增加返回守卫逻辑。
3. 增加处理中队列路由和返回目标。
4. 增加 job record 持久化。
5. 统一顶部状态条。
6. 重写每个步骤主 CTA 和任务反馈。
7. 增加 E2E：未保存标注返回、处理中任务返回、失败重跑。
