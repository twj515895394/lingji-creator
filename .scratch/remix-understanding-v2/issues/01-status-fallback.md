Status: ready-for-agent

# 原片理解工作台状态反馈、LLM 配置检查与 Rollup 兜底修复

Type: AFK

## 父问题

`.scratch/remix-understanding-v2/PRD.md`

## 要构建什么

在原片理解（第 4 阶段）中，实现 AI 模型配置校验，防止在未绑定 LLM 时产生误操作。同时，重构全片故事串联（Rollup）的报错与兜底机制，让系统状态透明化，并提供单独重跑 Rollup 的入口。

端到端行为：
- **LLM 配置校验**：进入“原片理解”界面时，检查全局 AI 模型是否配置。如未配置，将生成按钮灰显，并显示高对比度的黄色提示框：“未配置 AI 模型，无法生成原片理解。请先到设置中配置 AI 模型。”
- **兜底与错误反馈**：在 `original_understanding.json` 契约中增加 `overall.rollupFallbackUsed` (boolean) 以及 `overall.errors` (string[])。当 Rollup LLM 失败或超时，落盘时将 `rollupFallbackUsed` 置为 `true` 并记录错误，不使用“已完成 x 段”等文案污染故事内容。
- **状态看板升级**：前端 workbench 看板根据 `rollupFallbackUsed` 和 `errors`，如使用了兜底文案，在总览区展示明显的卡片警告：“全片故事未成功生成，当前显示的是系统兜底信息。请检查 LLM 配置后重跑全片故事。”，并展示“重跑全片故事”按钮。
- **Rollup Only 重跑**：通过主进程和 preload 注册并实现 `rerunOriginalStoryRollup` IPC 契约。点击“重跑全片故事”按钮只触发 Rollup 汇总，不重新请求昂贵的片段分析 LLM。

## 实施约束

- 前端组件修改和状态判定必须在 [UnderstandingWorkbenchPanel.tsx](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/UnderstandingWorkbenchPanel.tsx) 内完成。
- 后端 Rollup 逻辑与 IPC 路由在 [remix-understanding-service.ts](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-understanding-service.ts) 中重构，隔离 Rollup 服务与片段 LLM 生成逻辑。
- 确保读取旧版 version: 1 的 original JSON 时，默认 `rollupFallbackUsed` 为 `true` 兼容渲染，不引发异常。

## 验收标准

- [ ] 未配置 LLM 模型时，生成原片理解按钮置灰，且提示引导用户绑定模型。
- [ ] Rollup 出错时，本地生成的 original JSON 包含 `rollupFallbackUsed: true`，且 errors 数组保存错误消息。
- [ ] 前端展现 Rollup 失败警告，并出现“重跑全片故事”按钮。
- [ ] 点击“重跑全片故事”能发起 `rerunOriginalStoryRollup` IPC 并在完成后刷新总览视图。

## 被阻塞于

- 无 - 可以立即开始
