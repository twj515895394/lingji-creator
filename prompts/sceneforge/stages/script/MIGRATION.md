# Script Pack Migration

- 迁移日期：2026-06-18。
- 来源 skill：`scene-script-adapter`。
- 保留：分段剧本结构、口播/对白与 review 规则、时长与节拍对齐。
- 简化：统一输出为单个 Markdown artifact `script_draft`。
- 删除：旧项目状态机、黑板推进与目录写回。
- design 输入仅通过 handoff 引入必要摘要（含 `master_reference_prompt`），不读取九文件全文。