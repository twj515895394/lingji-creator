Status: ready-for-agent

# 原片理解新鲜度机制（Stale）、局部/过期重跑与校对台词 Prompt 联动

Type: AFK

## 父问题

`.scratch/remix-understanding-v2/PRD.md`

## 要构建什么

构建原片理解状态新鮮度（Freshness）校验，并在台词修改后自动标记相关片段与全片故事为“已过期”，引导用户局部重跑片段或重跑 Rollup，降低 AI 使用开销。

端到端行为：
- **inputHash 算法实现**：在后端对片段 inputs 进行哈希（含切片范围、关键帧路径与时间、ASR 原文、人工校对台词、模型配置与提示词版本），将哈希存入各片段分析 JSON 文件的 `inputHash` 属性。
- **新鲜度校验 IPC**：后端实现并暴露 `validateUnderstandingFreshness` IPC 方法。每次前端 workbench 加载或台词保存后触发，比较各片段当前哈希。若不匹配，在 Snapshot 中返回 `staleReasons`（包含 `['transcript_correction_changed']`）并置 `isStale: true`。
- **校对台词 Prompt 联运**：修改片段 LLM 分析的 Prompt 构建（`buildSegmentUserPrompt`），使分析模型在提取剧情和 videoPrompt 时，优先使用有效校对台词 `effectiveText` 替代 Whisper 原始 ASR，从而彻底阻断 ASR 错字对下游 AI 理解的污染。
- **前端过期展示与局部重跑**：
  * 若片段被标记为 Stale，卡片外框呈黄色虚线并悬浮显示“台词已修改，本段已过期”。
  * 卡片上提供“重跑本段理解”按钮。
  * 操作栏增加“只重跑过期片段”按钮。点击重跑按钮时触发 `rerunSegmentUnderstanding` IPC，完成后将状态置为 Fresh。

## 实施约束

- 校验及 Prompt 注入需要在 `RemixSegmentUnderstandingService` 中处理。
- `rerunSegmentUnderstanding` 必须支持 `useCorrectedTranscript` 参数以指示 LLM 加载校对后文本。
- 新鲜度过期判断必须是幂等的，不引发死循环重跑。

## 验收标准

- [ ] 保存某片段台词校对后，运行 Freshness 检验，其 `staleReasons` 数组返回 `transcript_correction_changed` 且 snapshot 的 `isStale` 为 `true`。
- [ ] 过期片段在工作台列表高亮显示，且“重跑本段理解”与“只重跑过期片段”按钮可点击。
- [ ] 触发重跑该片段后，传递给 LLM 的 user prompt 包含修正台词内容，生成的新 JSON 的 `inputHash` 与最新输入对齐，状态恢复为 Fresh（虚线外框消失）。

## 被阻塞于

- `02-transcript-correction-core.md`
