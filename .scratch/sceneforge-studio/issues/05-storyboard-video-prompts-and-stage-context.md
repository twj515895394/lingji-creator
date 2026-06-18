Status: completed-local

# Storyboard / Video Prompts 阶段与受控 Stage Context

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

在 Design 阶段闭环基础上，补齐 Storyboard 和 Video Prompts 两个核心阶段，并实现受控 Stage Context。下游只能读取 approved/final 的上游产物，不能扫描项目目录，也不能误读 draft、preview 或未审批产物。

## 验收标准

- [x] Storyboard Stage Context 只包含 approved Design 产物和允许的支撑产物。
- [x] Video Prompts Stage Context 只包含 approved Design、approved Storyboard 和允许的支撑产物。
- [x] Storyboard Validator 要求 `storyboard_prompt_pack`、`control_board_prompts`、`style_board_prompts`、`master_board_prompt`。
- [x] Video Prompts Validator 要求 `video_prompt_pack`、`video_prompt_pack_cn`，并检查 segment/audio execution 基本结构。
- [x] 未 approved 的上游核心产物不会进入下游上下文。
- [x] 覆盖上下文隔离和两个核心阶段 validator 测试。

## Review Checklist

- [x] Stage Context 是下游读取输入的唯一入口。
- [x] 没有使用目录扫描来决定“哪个文件是最终稿”。
- [x] Storyboard / Video Prompts 的 dependencies 与领域契约一致。
- [x] Validator 错误码稳定，适合 UI 和 MCP 展示。
- [x] 支撑产物进入上下文必须通过 manifest 显式授权。
- [x] 测试覆盖 draft/final 混读防护。

## 被阻塞于

- Issue 04：需要 Design approved 状态与核心产物。

## Implementation Notes

- 已补齐 Storyboard / Video Prompts 阶段定义、validator 和受控 Stage Context 上下游读取规则。
- 对应执行记录：`.planning/tasks/sceneforge-issue-05/`。

## Verification

- 覆盖 Storyboard/Video Prompts validator、未审批上游隔离、draft/final 混读防护和支撑产物授权读取。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- Stage Context 当前提供的是结构化上下文与 artifact 内容，不负责自动生成最终 prompt；执行器基座由 Issue 09 承接。
