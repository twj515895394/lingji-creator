Status: ready-for-agent

# SceneForge Remix UI Recovery

## 背景

2026-06-24 的 Remix 审计、handoff 与技术方案已经把问题重新聚焦为五条主线：

1. 项目资产库与原片资产生命周期表达不清。
2. 资产处理工作台缺少退出保护、任务反馈与稳定状态机。
3. Workbench 布局秩序失衡，长文件名、路径、ID 会撑爆界面。
4. 智能切片不够可信，缺少置信度与人工校准闭环。
5. 关键帧、缩略图与视频预览的成功 / 失败状态不够可靠。

已有 `Issue #7–#14` 解决了黄金路径与运行时 mock 问题，但不能替代本轮前端 / 交互 / 可信度整改。

## 目标

基于 2026-06-24 的问题清单与 01–05 技术方案，发布一组可独立领取的垂直切片 issues，让后续实现时：

- 每张 issue 都能单独演示或验证。
- 每张 issue 都明确依赖关系与验收标准。
- 每张 issue 都强制引用对应设计文档，避免实现时“凭感觉发挥”。

## 权威输入

- `.handoff/handoff-20260624-220000.md`
- `docs/sceneforge2.0/technical-solutions/2026-06-24-remix-ui-frontend-issue-checklist.md`
- `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`
- `docs/sceneforge2.0/technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`
- `docs/sceneforge2.0/technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`
- `docs/sceneforge2.0/technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`
- `docs/sceneforge2.0/technical-solutions/05-remix-media-preview-keyframe-and-thumbnail-reliability.md`

## 执行入口

- 总览执行顺序：`.scratch/sceneforge-remix-ui-recovery/EXECUTION_ORDER.md`
- issue 明细目录：`.scratch/sceneforge-remix-ui-recovery/issues/`

## 范围

- Project Asset Library / Processing Queue / Published Library 的前后端闭环
- 处理工作台状态机、退出保护、任务反馈
- 资产库与处理页的布局、术语、长文本策略
- 智能切片 fast / accurate / manual override 链路
- 关键帧、缩略图、视频预览的可信度与错误反馈

## 不在范围

- 不重做已有 `Issue #7–#14` 的黄金路径闭环
- 不拆 `App.tsx` 中 `openProject` 主体
- 不把 mock 恢复为产品默认路径
- 不把 Creation Workspace 做成新一轮大重构

## Issues

1. `01-project-asset-library-status-filters.md`
2. `02-processing-queue-task-cards.md`
3. `03-published-asset-variant-gate.md`
4. `04-project-card-status-and-reopen.md`
5. `05-processing-workspace-state-model.md`
6. `06-processing-exit-guard.md`
7. `07-processing-job-feedback-and-retry.md`
8. `08-processing-workbench-hero-and-layout-hardening.md`
9. `09-inspector-overflow-and-technical-info.md`
10. `10-published-vs-processing-card-split.md`
11. `11-terminology-and-long-text-policy.md`
12. `12-shot-segmentation-fast-mode-and-confidence.md`
13. `13-shot-segmentation-manual-calibration.md`
14. `14-shot-segmentation-accurate-mode.md`
15. `15-media-preview-keyframe-thumbnail-reliability.md`
16. `16-processing-job-persistence-foundation.md`
17. `17-failed-queue-recovery-loop.md`
18. `18-shot-segmentation-semantic-enrichment.md`
