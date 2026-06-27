Status: ready-for-agent

# 全片理解汇总与 Artifact 契约

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/03-source-understanding-rollup.md`（M3）

## 要构建什么

汇总全片理解索引，更新 source_overview/segment_analysis 契约，使 stage requiredArtifacts 与真实产物一致。

端到端行为：
- 全片摘要区可读 overall 字段与高价值段引用。
- 所有段理解成功后才允许理解阶段进入可发布前置的 approved（与产品策略一致）。

## 验收标准

- [ ] source_overview.json 含 segmentRefs 与 quality 计数
- [ ] rollup 由段理解驱动而非切片统计
- [ ] stage 校验与 requiredArtifacts 一致

## 被阻塞于

- 04-segment-understanding-balanced-mvp.md

## Review Checklist

- [ ] 行为与 `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` MVP 范围一致
- [ ] 不重复 sceneforge-remix-ui-recovery 的切片/UI 大票职责
- [ ] 阶段完成仍遵循产物优先原则

## 测试与验证

- `npx tsc --noEmit`
- 相关 vitest：validators / understanding / artifact-paths / asset-processing（按票增量）
