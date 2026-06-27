Status: ready-for-agent

# 原片理解工作台状态反馈、LLM 配置检查与 Rollup 兜底修复

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

在原片理解（第 4 阶段）中，实现 AI 模型配置校验，防止在未绑定 LLM 时产生误操作。同时，重构全片故事串联（Rollup）的报错与兜底机制，让系统状态透明化，并提供单独重跑 Rollup 的入口。

端到端行为：

- **LLM 配置校验**：进入“原片理解”界面时，检查全局 AI 模型是否配置。如未配置，将生成按钮灰显，并显示高对比度的黄色提示框：“未配置 AI 模型，无法生成原片理解。请先到设置中配置 AI 模型。”
- **兜底与错误反馈**：在 `original_understanding.json` 契约中增加质量状态字段：`quality.rollupFallbackUsed` (boolean) 以及 `quality.errors` (string[])。当 Rollup LLM 失败或超时，落盘时将 `quality.rollupFallbackUsed` 置为 `true` 并记录错误，不使用“已完成 x 段”等文案污染故事内容。
- **故事内容字段约束**：`overall.storyContent` 只能存放真正的内容描述；如果 Rollup 失败，不得把处理状态文案写入 `storyContent`。可以写入空字符串或明确的兜底说明，同时由 `quality.rollupFallbackUsed` 驱动前端警告。
- **状态看板升级**：前端 workbench 看板根据 `quality.rollupFallbackUsed` 和 `quality.errors`，如使用了兜底文案，在总览区展示明显的卡片警告：“全片故事未成功生成，当前显示的是系统兜底信息。请检查 LLM 配置后重跑全片故事。”，并展示“重跑全片故事”按钮。
- **Rollup Only 重跑**：通过主进程和 preload 注册并实现 `rerunOriginalStoryRollup` IPC 契约。点击“重跑全片故事”按钮只触发 Rollup 汇总，不重新请求昂贵的片段分析 LLM。

## 实施约束

- 不要把实现强行限制在单一文件内；本 issue 是状态和 IPC 的纵向切片，允许修改必要的 types、IPC、service、preload、client 和前端组件。
- 主要后端落点：
  - `electron/sceneforge/remix/remix-source-understanding-rollup.ts`
  - `electron/sceneforge/remix/remix-understanding-service.ts`
  - `electron/sceneforge/remix/remix-service.ts`
  - `electron/sceneforge/remix/remix-ipc.ts`
  - `electron/sceneforge/remix/remix-ipc-types.ts`
  - `electron/sceneforge/remix/remix-understanding-workbench.ts`
- 主要前端落点：
  - `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
  - `src/sceneforge/remix/components/UnderstandingWorkbenchPanel.tsx`
  - `src/lib/electron-api.ts`
  - `src/sceneforge/remix/services/remix-api-client.ts`
- 读取旧版 version: 1 的 original JSON 时，默认 `quality.rollupFallbackUsed` 可以按兼容策略推断，但不得因为字段缺失导致渲染异常。
- 如果当前 AI settings 加载失败，应作为“未配置或不可用”展示，不应进入片段 LLM 调用。

## 验收标准

- [ ] 未配置 LLM 模型时，生成原片理解按钮置灰，且提示引导用户绑定模型。
- [ ] Rollup 出错时，本地生成的 original JSON 包含 `quality.rollupFallbackUsed: true`，且 `quality.errors` 数组保存错误消息。
- [ ] Rollup 出错时，`overall.storyContent` 不再显示“共 x 段，已完成 x 段”的处理状态文案。
- [ ] 前端展现 Rollup 失败警告，并出现“重跑全片故事”按钮。
- [ ] 点击“重跑全片故事”能发起 `rerunOriginalStoryRollup` IPC 并在完成后刷新总览视图。
- [ ] 旧版 V1 original JSON 能正常加载，不出现空指针、白屏或状态误判。

## 建议测试文件

- `tests/sceneforge-remix-original-rollup-v2.test.ts`
  - Rollup LLM 失败时写入 `quality.rollupFallbackUsed` 与 `quality.errors`。
  - Rollup 成功时写入真实 `overall.storyContent`。
- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
  - V1 / V2 original JSON 都能被 workbench snapshot 稳定读取。
  - fallback 状态在 snapshot 中正确暴露给前端。
- `tests/sceneforge-remix-ipc-contract.test.ts`
  - `rerunOriginalStoryRollup` IPC 类型、preload 和 client 契约可调用。

## 被阻塞于

- 无 - 可以立即开始
