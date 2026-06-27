Status: ready-for-agent

# 理解工作台与人工标注预填

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/04-understanding-workbench-and-annotation.md`（M4）

## 要构建什么

原片理解页展示 segment 卡片、prompt 复制与单段重跑；人工标注预填理解中的保留/替换建议。

端到端行为：
- 用户可扫读每段理解并复制 video prompt。
- 进入标注时看到 AI 预填，保存后仍以人工为准。

## 验收标准

- [ ] 理解页消费真实 JSON 而非仅边界统计
- [ ] 复制 prompt 有明确反馈
- [ ] 标注预填不覆盖已保存人工内容

## 被阻塞于

- 05-source-understanding-rollup-and-artifacts.md

## Review Checklist

- [ ] 行为与 `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` MVP 范围一致
- [ ] 不重复 sceneforge-remix-ui-recovery 的切片/UI 大票职责
- [ ] 阶段完成仍遵循产物优先原则

## 测试与验证

- `npx tsc --noEmit`
- 相关 vitest：validators / understanding / artifact-paths / asset-processing（按票增量）
