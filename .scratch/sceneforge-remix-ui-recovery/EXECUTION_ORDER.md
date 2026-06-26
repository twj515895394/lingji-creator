Status: ready-for-agent

# SceneForge Remix UI Recovery 执行顺序总览

## 1. 文档目的

本文件把 `.scratch/sceneforge-remix-ui-recovery/` 下的 18 张 issues 重新组织成可执行批次，供后续按批推进。

目标不是重复 issue 正文，而是回答四件事：

1. 先做哪一批，后做哪一批
2. 每一批的目标是什么
3. 每一批依赖哪些前置批次
4. 每一批完成后，Remix 应该获得什么新的稳定能力

## 2. 权威输入

- `.scratch/sceneforge-remix-ui-recovery/PRD.md`
- `docs/sceneforge2.0/2026-06-24-remix-recovery-implementation-plan.md`
- `docs/sceneforge2.0/technical-solutions/2026-06-24-remix-ui-frontend-issue-checklist.md`
- `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`
- `docs/sceneforge2.0/technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`
- `docs/sceneforge2.0/technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`
- `docs/sceneforge2.0/technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`
- `docs/sceneforge2.0/technical-solutions/05-remix-media-preview-keyframe-and-thumbnail-reliability.md`

## 3. 执行原则

### 3.1 先状态，后样式

先把资产生命周期、任务状态、失败恢复、返回目标这些“状态真相”立住，再做布局、卡片和术语收口。

### 3.2 先闭环，后提质

先让未入库、失败、处理中这些路径都能跑通，再推进智能切片 accuracy、语义增强和视觉品质提升。

### 3.3 每批都必须可单独验收

每一批结束后，都应能回答一句明确的话：

- Phase A 完成后，任务状态可恢复
- Phase B 完成后，资产治理闭环成立
- Phase C 完成后，切片能力可信
- Phase D 完成后，工作台与媒体体验可信
- Phase E 完成后，首页与再次打开体验收口

## 4. 批次总览

| Phase | 主题 | 目标 |
|------|------|------|
| A | 状态机与资产治理基座 | 先立资产状态、任务状态和处理状态的共同地基 |
| B | 处理中 / 异常 / 入库门禁闭环 | 让未入库、失败、已入库三条治理路径各归其位 |
| C | 智能切片能力可信化 | 让切片从“傻切”升级为可解释、可校准、可增强 |
| D | 工作台布局与媒体可信度 | 收 Hero、Inspector、预览、关键帧与卡片体验 |
| E | 首页与再次打开收口 | 把前面稳定下来的状态与分区回流到首页入口 |

## 5. Phase A：状态机与资产治理基座

### 5.1 批次目标

建立后续所有票的共同前置：

- 统一的 processing job 持久化
- 统一的资产库状态过滤
- 统一的处理工作台状态模型

### 5.2 包含 issues

1. [16-processing-job-persistence-foundation.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/16-processing-job-persistence-foundation.md)
2. [01-project-asset-library-status-filters.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/01-project-asset-library-status-filters.md)
3. [05-processing-workspace-state-model.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/05-processing-workspace-state-model.md)

### 5.3 推荐顺序

1. 先做 `16`，把 job 状态、查询与恢复机制立住
2. 再做 `01`，明确资产库分区与状态过滤
3. 最后做 `05`，让处理页消费统一状态模型

### 5.4 完成标志

- 页面能恢复处理任务状态
- 资产库已能区分已入库 / 处理中 / 异常
- 处理页顶部状态与返回目标不再混乱

## 6. Phase B：处理中 / 异常 / 入库门禁闭环

### 6.1 批次目标

让资产治理链路真正成立：

- 未入库素材作为任务继续处理
- 已入库素材才能二创
- 失败素材有恢复路径
- 用户中途返回不会丢语义

### 6.2 包含 issues

1. [02-processing-queue-task-cards.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/02-processing-queue-task-cards.md)
2. [03-published-asset-variant-gate.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/03-published-asset-variant-gate.md)
3. [06-processing-exit-guard.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/06-processing-exit-guard.md)
4. [07-processing-job-feedback-and-retry.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/07-processing-job-feedback-and-retry.md)
5. [17-failed-queue-recovery-loop.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/17-failed-queue-recovery-loop.md)

### 6.3 前置依赖

- Phase A 全部完成

### 6.4 推荐顺序

1. `02` 先把处理中队列表达清楚
2. `03` 接着把“只有已入库才能二创”的门禁立住
3. `06` 补退出保护
4. `07` 补任务执行反馈与重跑
5. `17` 最后把异常分区变成可恢复闭环

### 6.5 完成标志

- 用户知道未入库素材该去哪里继续处理
- 用户不会把处理中素材误当正式资产
- 失败素材有异常分区、失败原因、重跑与删除路径

## 7. Phase C：智能切片能力可信化

### 7.1 批次目标

把切片能力从弱规则切分升级为：

- 有真实边界检测
- 有置信度与 diagnostics
- 可人工校准
- 可选高精度模式
- 有 segment 语义层

### 7.2 包含 issues

1. [12-shot-segmentation-fast-mode-and-confidence.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/12-shot-segmentation-fast-mode-and-confidence.md)
2. [13-shot-segmentation-manual-calibration.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/13-shot-segmentation-manual-calibration.md)
3. [14-shot-segmentation-accurate-mode.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/14-shot-segmentation-accurate-mode.md)
4. [18-shot-segmentation-semantic-enrichment.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/18-shot-segmentation-semantic-enrichment.md)

### 7.3 前置依赖

- Phase A 完成
- 若切片结果会直接影响处理反馈展示，建议至少在 Phase B 的 `07` 之后再推进

### 7.4 推荐顺序

1. `12` 先建立 fast 模式、confidence 与 diagnostics
2. `13` 再建立人工校准闭环
3. `14` 引入 accurate 模式
4. `18` 最后补 segment 语义增强

### 7.5 特别提醒

- `18` 不能早于 `12/13`
- `14` 不应阻塞 `12/13` 落地
- LLM / VLM 只能增强 segment 语义，不能替代真实边界检测

### 7.6 完成标志

- 切片结果不再像“傻切”
- 低置信边界可被看见、校准、解释
- 下游链路可消费更稳定的 segment 结果

## 8. Phase D：工作台布局与媒体可信度

### 8.1 批次目标

在状态机与治理闭环稳定后，系统性收掉最直观的 UI 半成品感：

- Hero 不溢出
- Inspector 不横滚
- 媒体预览真实可信
- 正式资产卡与处理任务卡一眼可辨
- 术语与长文本策略统一

### 8.2 包含 issues

1. [08-processing-workbench-hero-and-layout-hardening.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/08-processing-workbench-hero-and-layout-hardening.md)
2. [09-inspector-overflow-and-technical-info.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/09-inspector-overflow-and-technical-info.md)
3. [15-media-preview-keyframe-thumbnail-reliability.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/15-media-preview-keyframe-thumbnail-reliability.md)
4. [10-published-vs-processing-card-split.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/10-published-vs-processing-card-split.md)
5. [11-terminology-and-long-text-policy.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/11-terminology-and-long-text-policy.md)

### 8.3 前置依赖

- Phase A、Phase B 建议全部完成
- `10` 明显依赖 `02`
- `11` 最好放在 `08/09/10` 后收口

### 8.4 推荐顺序

1. `08` 先修 Hero 与整体骨架
2. `09` 再收 Inspector 溢出
3. `15` 建立媒体真实可见与错误可解释
4. `10` 完成正式资产卡与任务卡分流
5. `11` 统一术语和长文本策略

### 8.5 完成标志

- 用户第一眼能分清主工作区、任务卡、正式资产卡
- 页面不再被长文件名、路径、ID 撑爆
- 关键帧 / 缩略图 / 视频预览失败时不再装作成功

## 9. Phase E：首页与再次打开收口

### 9.1 批次目标

把前面已经稳定下来的资产分区、状态摘要和最近位置恢复机制回流到首页入口，让 recent project 与首页卡片不再误导用户。

### 9.2 包含 issues

1. [04-project-card-status-and-reopen.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/sceneforge-remix-ui-recovery/issues/04-project-card-status-and-reopen.md)

### 9.3 前置依赖

- Phase A 完成
- 建议 Phase B、Phase D 完成后再做，避免摘要字段反复变动

### 9.4 推荐顺序

- 作为收口票最后做

### 9.5 完成标志

- 首页能正确表达项目类型、上次位置、资产摘要
- 从最近项目再次打开时，能回到正确的 Remix 页面或资产库分区

## 10. 不建议的推进方式

### 10.1 不要先做 D 再做 A/B

如果先做 Hero、卡片、术语，后面状态模型和资产治理一改，UI 很容易返工。

### 10.2 不要先做 14 或 18

accurate 模式和语义增强都建立在 fast mode + manual calibration 之上，提前做会把切片路线做歪。

### 10.3 不要把 02 / 10 / 11 合并成一张大前端票

它们分别对应：

- 处理中任务表达
- 正式资产 vs 任务卡分流
- 术语与长文本收口

混做后很难验收。

## 11. 最终推荐顺序

1. `16-processing-job-persistence-foundation`
2. `01-project-asset-library-status-filters`
3. `05-processing-workspace-state-model`
4. `02-processing-queue-task-cards`
5. `03-published-asset-variant-gate`
6. `06-processing-exit-guard`
7. `07-processing-job-feedback-and-retry`
8. `17-failed-queue-recovery-loop`
9. `12-shot-segmentation-fast-mode-and-confidence`
10. `13-shot-segmentation-manual-calibration`
11. `14-shot-segmentation-accurate-mode`
12. `18-shot-segmentation-semantic-enrichment`
13. `08-processing-workbench-hero-and-layout-hardening`
14. `09-inspector-overflow-and-technical-info`
15. `15-media-preview-keyframe-thumbnail-reliability`
16. `10-published-vs-processing-card-split`
17. `11-terminology-and-long-text-policy`
18. `04-project-card-status-and-reopen`

## 12. 一句话

这轮整改的正确推进方式是：**先立状态和治理闭环，再做切片可信化，最后收工作台观感与首页入口。**
