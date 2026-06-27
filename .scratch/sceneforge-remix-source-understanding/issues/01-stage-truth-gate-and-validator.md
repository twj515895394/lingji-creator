Status: ready-for-agent

# 原片理解阶段真实性门禁与校验

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/00-stage-truth-gate.md`（M0）

## 要构建什么

为 Remix 原片理解建立阶段真实性门禁：无合格理解产物不得显示完成；关键帧等前置变更后理解标记过期。

端到端行为：
- 用户在没有 per-segment 理解文件时，理解阶段保持待生成或 stale。
- 发布入库前的校验会阻断「仅汇总占位」的理解结果。
- 重跑关键帧后，理解阶段提示需要重新生成。

## 验收标准

- [ ] 占位版理解写入不再自动 `approved`
- [ ] 存在 stage/artifact 校验：段数覆盖、文件可读、非空 schema
- [ ] 关键帧完成后若理解产物与输入不一致，理解状态为 stale 或等价可见状态
- [ ] 相关单测覆盖失败/成功路径

## 被阻塞于

- 无 - 可以立即开始

## Review Checklist

- [ ] 行为与 `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` MVP 范围一致
- [ ] 不重复 sceneforge-remix-ui-recovery 的切片/UI 大票职责
- [ ] 阶段完成仍遵循产物优先原则

## 测试与验证

- `npx tsc --noEmit`
- 相关 vitest：validators / understanding / artifact-paths / asset-processing（按票增量）
