# Task Plan: SceneForge Topic Intent Check Execution

## Goal
在 `topic_gate` 中完成“创作意图检查”前置闸门开发：支持多行创作意图、独立 `intent_check` 契约与 checker 链路、检查未通过时的缺失项与建议提示，以及 `分析选题` 的硬性解锁与修改后失效联动。

## Current Phase
Phase 5

## Phases

### Phase 1: Context & Execution Setup
- [x] 读取 `implement`、`karpathy-guidelines`、`planning-with-files` 规则
- [x] 复核设计文档、实施计划与 4 张本地 issue
- [x] 初始化 `.planning/tasks/20260702-1536-sceneforge-topic-intent-check-execution/`
- [x] 记录测试基线与脏工作区说明
- **Status:** complete

### Phase 2: Contract & Parser Implementation
- [x] 扩展 `topic_brief` 多行 intent 保存 / 回填
- [x] 定义 `intent_check` Markdown、解析状态与 `intentHash` 契约
- [x] 补齐对应单测
- **Status:** complete

### Phase 3: Backend Checker Chain
- [x] 新增独立 `topic-intent-check` analyzer
- [x] 接入 service / ipc / preload / renderer types
- [x] 落盘 `topic_gate.intent_check`
- [x] 补齐 checker / service / ipc 测试
- **Status:** complete

### Phase 4: Topic Gate Workspace Integration
- [x] 新增检查面板与建议提示 UI
- [x] 将创作意图输入升级为 3 行 `textarea`
- [x] 将 `分析选题` 绑定到检查通过与过期联动
- [x] 补齐 UI / workspace 相关测试
- **Status:** complete

### Phase 5: Verification, Review & Delivery
- [x] 运行 `topic_gate` 相关测试集
- [x] 运行类型检查与必要的更大范围测试
- [x] 进行 `/review` 式自审，记录风险和结论
- [x] 整理交付说明并决定是否提交 commit
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 以 `docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md` 为产品决策源 | 用户已确认设计方向，开发阶段不再重新发明交互 |
| 以 `docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md` 为实现拆分源 | 已经细化到模块和测试，便于直接照着推进 |
| 以 `.scratch/sceneforge-topic-intent-check/issues/01-04` 为执行顺序 | 用户要求 issue 驱动，并且 issue 已按依赖顺序拆好 |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| 直接执行 `init-session.sh` 返回 permission denied | 改用 `bash .../init-session.sh` 显式执行，已成功初始化 |
| `SceneForgeStudio.tsx` 在 `intentCheckStatus` 传参时把 `stale` 暴露给了子组件类型 | 调整为在父层先把 stale 状态折算成 `needs_more` 或独立 `intentCheckStale`，`tsc --noEmit` 已恢复通过 |
