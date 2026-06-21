# SceneForge LLM Mainline P0 断点修复执行计划

## Goal
补齐 SceneForge LLM 主链在草案提交、Validate、Continue、Continue & Run 之间的关键断点，并同步计划与验收记录。

## Current Phase
Phase 7

## Phases
### Phase 1: 范围确认与断点建模
- [x] 读取最新 handoff、主计划、现有 `.planning` 记录
- [x] 定位本轮优先代码入口与现有测试入口
- [x] 记录已确认的疑点与验证方向
- **Status:** complete

### Phase 2: 失败用例补齐
- [x] 为草案提交失败保留待提交草案补测试
- [x] 为 Continue / Continue & Run 门禁与提示补测试
- [x] 跑定向测试确认真实失败点
- **Status:** complete

### Phase 3: 最小修复实现
- [x] 仅修改与 P0 断点直接相关的状态流和提示逻辑
- [x] 保持现有 Continue 语义不被 silent redesign
- [ ] 必要时补中文注释解释状态约束
- **Status:** complete

### Phase 4: 回归验证
- [x] 运行定向 vitest
- [x] 运行 `npx tsc --noEmit`
- [x] 记录验证结果与剩余风险
- **Status:** complete

### Phase 5: 文档与状态同步
- [x] 更新 `.scratch/sceneforge-llm-mainline-closure/IMPLEMENTATION-PLAN.md`
- [x] 更新对应 issue / progress / findings
- [x] 输出下一步真机验收建议
- **Status:** complete

### Phase 6: 阶段运行会话恢复
- [x] 为 `StageRunPanel` 增加按 `projectDir + stage` 维度的运行会话缓存
- [x] 保留未提交草案、运行态、错误提示和一次性补充意见
- [x] 提交成功后刷新并重新选中当前阶段产物
- [x] 补回归测试与类型检查
- **Status:** complete

### Phase 7: Script / Performance contract 对齐
- [x] 收紧 `script` 阶段手动模板、prompt 与 review checklist
- [x] 收紧 `performance` 阶段手动模板、prompt 与 review checklist
- [x] 增强 `semantic-support-stages`，拦截空壳 beat/video plan/handoff/continuity 内容
- [x] 更新 happy path / validator / semantic 测试样例并跑回归
- [ ] 真机 Electron 连续验收 `performance -> storyboard`
- **Status:** in_progress

## Key Questions
1. 哪些断点已经由现有实现覆盖，哪些仍缺测试保护？
2. Continue 的禁用原因和 Continue & Run 的可用性是否对用户表达一致？
3. 草案提交失败时是否始终保留本次待提交草案，避免用户丢工作成果？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 先补测试再修代码 | 当前主链已有较多状态机与 SSR 测试，先暴露真实缺口更稳 |
| 本轮只做 P0 断点修复 | handoff 明确要求先补闭环，不回到 ACP / Publish / 新包 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Notes
- 本轮不触碰无关 package 规划，只围绕 Direct LLM 主链修补。
- 若发现同一问题连续两次修复失败，触发熔断并回到根因分析。
- Script / Performance 本轮仍保持单 artifact MVP 形态，不引入新的 IPC 或公开入口。
