Status: ready-for-agent

# 全片故事 Rollup V2 服务化、多维度看板与原片理解 Markdown 导出

Type: AFK

## 父问题

`.scratch/remix-understanding-v2/PRD.md`

## 要构建什么

重塑全片故事串联（Rollup）生成机制，使其能深入归纳全片的事件因果、角色关系与二创策略，并在前端工作台提供丰富的可视化故事看板，同时支持一键导出原片理解 Markdown。

端到端行为：
- **Rollup 服务抽离与升级**：
  * 构建独立的 `RemixOriginalStoryRollupService`，只读取本地各片段理解 JSON 进行汇总。
  * 重新设计 Rollup V2 的 System Prompt：要求输出 Logline（一句话梗概）、完整剧情解说（`storyContent`，300字内）、`eventChain`（事件链）、`characterMap`（主要人物图谱）以及 `remixStrategy`（含保留元素、替换建议、重构方向与风险）。
- **总览面板升级**：工作台顶部的“全片故事总览”卡片进行结构化拆分，以精美侧栏或排布优雅的 Bento 看板分别呈现场景 Logline、大段剧情描述、事件链、角色图谱、二创建议等，不再是一大段文字。
- **Markdown 报告导出**：在界面操作栏增加“导出理解 Markdown”按钮，触发 `exportUnderstandingReport` IPC。该服务在项目根目录下生成 `original_understanding_v2.md` 文件（对齐 PRD 7 节模板），方便用户归档和分发。

## 实施约束

- 全片汇总结构必须完全对齐 `RemixOriginalUnderstandingV2Document` (version 2)。
- 导出 Markdown 格式需严格符合设计文档第 9 节的模板约定。

## 验收标准

- [ ] 单独重跑 Rollup 汇总能快速执行完毕并输出包含 Logline、人物关系、二创策略的 V2 格式 JSON。
- [ ] 前端看板不仅展示完整故事，还能清晰呈现事件链和角色关系列表，UI 表现精美。
- [ ] 点击“导出 Markdown 报告”，用户项目目录下正确生成 `original_understanding_v2.md` 文件。

## 被阻塞于

- `03-transcript-correction-stale-mechanism.md`
