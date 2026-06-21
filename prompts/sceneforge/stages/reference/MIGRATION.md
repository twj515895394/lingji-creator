# Reference Pack Migration

- 迁移日期：2026-06-18。
- 来源 skill：`scene-reference-decider`。
- 保留：参考类型裁定、参考边界、可继承/禁止继承、`must_keep`、`must_avoid`、创作方向和风险说明。
- 简化：统一输出为单个 Markdown artifact `reference_notes`，不再输出旧 YAML patch 壳。
- 删除：旧项目黑板状态推进、目录扫描、历史文件索引和跨阶段路由写回。
- 运行时输入改为 context policy，仅允许 topic brief、gate confirmations 与可选 source material。
