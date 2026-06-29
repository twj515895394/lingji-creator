Status: ready-for-human

# Issue 10：原片理解区动作分组与命名收口 + 组合回归

## 父问题

- 批次索引：本目录 Issue 01–05、06–09
- 交接：[.handoff/handoff-20260629-170233.md](../../../.handoff/handoff-20260629-170233.md)（产品语义与理解区复杂度）

## 要构建什么

在原片理解工作台 UI 上，将 **台词相关动作**（全量/单段 ASR、台词确认等）与 **理解相关动作**（重跑本段理解、rollup、stale 重跑等）做清晰分组或分区，统一命名与简短说明，降低「都在重跑原片理解」的误解。

并完成 **组合回归**：在 Issue 05 checklist 基础上，增加 06–09 的验收项；输出简短验收记录（可附于 handoff 或本 issue 评论）。

端到端：用户在同一页面能按意图找到正确按钮；真机走通 ASR 切换、预览定位、全量/单段 ASR、纠偏后分层 stale、重跑本段理解弹窗。

## 验收标准

- [ ] 理解区动作分组/命名与 Issue 07、09 文案一致，无重复或矛盾入口
- [ ] `npx tsc --noEmit` 通过；`tests/sceneforge-remix-asset-processing.test.tsx` 及相关定向测试通过
- [ ] 人工 checklist 至少覆盖：1 次 ASR 引擎切换 + 全量台词重跑、1 次单段 ASR、1 次台词纠偏后 stale 表现、1 次重跑本段理解（含/不含补充）
- [ ] 剩余风险与未决项（如用户补充是否持久化）记录在评论或 handoff

## 被阻塞于

- Issue 06
- Issue 07
- Issue 09

（Issue 05 可与本 issue 合并执行验收，但不替代本 issue 的 UI 分组交付。）

## 评论