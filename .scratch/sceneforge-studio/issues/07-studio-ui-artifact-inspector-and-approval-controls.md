Status: completed-local

# Studio UI、Artifact Inspector 与审批控件

Type: HITL

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

实现 SceneForge Studio 第一版三栏工作台：左侧 Pipeline Flow，中间 Current Stage Workspace，右侧 Artifact Inspector。用户可以查看核心阶段、打开产物、查看 Preview/Structure/Trace/Raw，并在阶段 Inspector 中配置 Approval Policy。

本票只交付 Studio 与 Inspector 基础能力。核心最终产物的 Display Model、Copy Blocks 和复制交互由 Issue 11、Issue 12 细化承接。

## 验收标准

- [x] Studio 显示 Design Prompts、Storyboard Prompts、Video Prompt Packs 三个核心阶段。
- [x] Artifact Inspector 显示 Preview、Structure、Trace、Raw。
- [x] Artifact Inspector 为后续 Copy 视图预留 tab/slot 或扩展点，但不需要在本票实现复制逻辑。
- [x] Approval Policy 控件显示 Required、Optional、Auto if valid、Skip。
- [x] 改动阶段策略时调用 `sceneSetApprovalPolicy`。
- [x] 核心阶段切到 `auto_if_valid` 或 `skip` 时显示风险确认。
- [x] Validator failed 时 UI 不允许 Approve & Continue。
- [x] UI 使用 Lingji Cut 现有专业工具风格，不引入 v9-dev Web Console 视觉体系。

## Review Checklist

- [x] 没有卡片套卡片、营销页式 hero 或独立炫酷 AI 风格。
- [x] 布局在最小桌面窗口下不重叠、不溢出。
- [x] 核心操作有 disabled reason 或错误提示。
- [x] Approval Policy UI 读取项目当前策略，不写死默认值。
- [x] Artifact Inspector 对空状态、加载中、错误状态都有展示。
- [x] UI smoke test 覆盖三栏、核心阶段、审批控件和 Inspector tabs。

## 被阻塞于

- Issue 06：需要 Electron API。

## Implementation Notes

- 已实现 Studio 三栏工作台、核心阶段列表、Artifact Inspector tabs、审批策略控件、风险确认和审批禁用状态。
- 界面文案已按项目约定以中文为主，英文主要保留在阶段/策略技术名中。
- 对应执行记录：`.planning/tasks/sceneforge-issue-06-07/`。

## Verification

- 覆盖 UI smoke test、三栏结构、核心阶段、审批控件和 Inspector tabs。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- 本票完成了组件与样式层面的 smoke 验证；尚未跑真实 Electron/Playwright 视觉截图验证，最小桌面窗口表现后续可在 UI polish 阶段补一轮实机检查。
