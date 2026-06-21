# Task Plan: SceneForge Gate / Intake Card HITL

## Goal

完成 Issues 01–03：评分 View Model、Intake 方向卡片、Topic Gate 评分/决策/风格卡；Issue 04 人工验收由维护者执行。

## Current Phase

Phase 4

## Phases

### Phase 1: Parser and View Models
- [x] 评分 parser RED
- [x] 宽松解析中英文冒号、空项、缺失段
- [x] parser tests GREEN
- **Status:** complete

### Phase 2: Intake Direction Cards
- [x] 卡片、空态、确认摘要、重新选择
- [x] IPC 失败保留选择
- [x] UI tests GREEN
- **Status:** complete

### Phase 3: Topic Gate Cards
- [x] 只读评分卡
- [x] 决策卡与风格卡
- [x] 已确认摘要和重新编辑
- [x] UI tests GREEN
- **Status:** complete

### Phase 4: Regression and Review
- [x] TypeScript
- [x] HITL 目标测试
- [x] SceneForge 全量回归
- [x] 模块级 Code Review
- [x] 更新 Issues 01–03
- **Status:** complete

## Decisions Made

| Decision | Rationale |
| --- | --- |
| 沿用已确认 PRD/详细设计/实施计划 | 用户已确认并要求按计划继续 |
| 卡片仅为 Markdown View Model | 不新增第二持久化真相 |
| 人工 Electron 验收不由代理执行 | 遵循用户此前明确分工 |

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
