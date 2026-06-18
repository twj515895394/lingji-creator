Status: completed-local

# Design 阶段提交、校验与审批闭环

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

打通第一个核心阶段 Design：提交 Design 草案后应用写入核心产物、注册 manifest、运行 Validator，并按审批策略进入 `waiting_approval` 或自动推进。required 策略下必须人工审批，`validated` 不能直接等同于 `approved`。

## 验收标准

- [x] Design 阶段可提交 `design_prompts`、`character_prompts`、`scene_prompts`、`prop_prompts`、`master_reference_prompt`。
- [x] Design Validator 缺少任一核心产物时返回失败和稳定错误码。
- [x] Validator 通过后，required 策略进入 `waiting_approval`。
- [x] 用户审批后 Design 状态进入 `approved`。
- [x] Design 未 approved 前不会出现在下游默认 Stage Context 中。
- [x] 覆盖 `draft_submitted -> validated -> waiting_approval -> approved` 测试。

## Review Checklist

- [x] 状态机明确区分 `validated`、`waiting_approval`、`approved`。
- [x] Validator 只校验边界，不改写创作内容。
- [x] Design 核心产物均被标记为 `core_generation_asset`。
- [x] Design 产物 `readableByDownstream` 只有在可进入下游时才被 Stage Context 使用。
- [x] 审批动作通过 SceneForgeService 执行，不直接写 `state.json`。
- [x] 测试覆盖 Validator failed 时不能审批。

## 被阻塞于

- Issue 02：需要审批策略解析。
- Issue 03：需要 Artifact Store。

## Implementation Notes

- 已打通 Design 草案提交、核心产物校验、状态推进、required 审批和下游可读性控制。
- 对应执行记录：`.planning/tasks/sceneforge-issue-04/`。

## Verification

- 覆盖完整状态流、缺失核心产物失败、Validator failed 不能审批、未 approved 不进入下游上下文。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- Design 输出内容只做结构边界校验，不评估创作质量；质量审核留给人工审批和后续 Review Checklist 复用。
