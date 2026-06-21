# Assets Pack Migration

- 迁移日期：2026-06-18。
- 来源 skill：`scene-asset-checker`（资产判断、角色/场景/道具规划与 review 规则）。
- 保留：资产优先级、角色/场景/道具与剧情功能对齐、下游 Design 约束与规避说明。
- 简化：统一输出为单个 Markdown artifact `asset_plan`。
- 删除：黑板写回、目录扫描、旧 YAML patch 壳与状态机推进。
- selected style 通过 context policy 的 `assetLibrary.allowSelectedStyleProfile` 注入。