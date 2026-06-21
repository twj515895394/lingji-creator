# Task Plan: SceneForge Support Pack Wave

## Goal

完成 Issues 01–06：六个支撑阶段逐个接入 Direct LLM，每个 issue 独立执行 TDD、目标回归和严格 Code Review；Issue 07 保留维护者人工验收。

## Current Phase

Phase 5

## Phases

### Phase 1: Performance Direct LLM
- [x] 建立共享 Runner 能力表
- [x] 支撑阶段生成草案与显式提交
- [x] performance run → submit → validate
- [x] 目标测试、类型检查和严格 Review
- **Status:** complete

### Phase 2: Audio Direct LLM
- [x] RED：audio 能力、context policy、happy path
- [x] GREEN：补齐 policy 并开放 Direct LLM
- [x] 目标测试、类型检查和严格 Review
- **Status:** complete

### Phase 3: Reference Pack
- [x] 标准 Pack 八件套
- [x] 独立 happy path 与严格 Review
- **Status:** complete

### Phase 4: Story Pack
- [x] 标准 Pack 八件套
- [x] 独立 happy path 与严格 Review
- **Status:** complete

### Phase 5: Assets Pack
- [ ] 标准 Pack 八件套
- [ ] 独立 happy path 与严格 Review
- **Status:** in_progress

### Phase 6: Script Pack
- [ ] 标准 Pack 八件套
- [ ] 独立 happy path 与严格 Review
- **Status:** pending

### Phase 7: Full Regression
- [ ] SceneForge 全量测试
- [ ] TypeScript 检查
- [ ] 最终差异审查
- **Status:** pending

## Decisions Made

| Decision | Rationale |
| --- | --- |
| 能力表放在 renderer-safe 共享模块，Electron 侧只 re-export | 避免 renderer 运行时依赖 electron 目录 |
| 每个 support stage 独立开放 | 降低批量迁移风险，确保 issue 可单独回滚 |
| run 只生成草案，submit 才写盘 | 保持已有 HITL 审阅边界 |
| 不自动提交代码 | 遵守用户与项目全局规范 |

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| 计划补丁文本被截断，未形成有效 patch | 1 | 拆分为小补丁并逐个落盘 |
| 再次提交的补丁仍缺少结束标记 | 2 | 停止复用长补丁，改为短小独立 patch |
