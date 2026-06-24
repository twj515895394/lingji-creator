# Remix Issue #14 Findings

## 2026-06-23

- 现有 Issue #5 只覆盖“人工标注 UI 展示”，Issue #7 / #8 只覆盖导入、切片、关键帧、理解、入库，没有明确承接“标签编辑 / 备注”的持久化。
- 文档多处把“人工标注”列为 Source Asset Processing Workspace 的正式步骤，而不是一次性临时输入。
- 当前 IPC 契约缺少 `updateSourceAssetMetadata` 或同类接口，说明这一块还没有被纳入真实闭环。
- 如果不单独补票，后续很容易出现“UI 可以填标签，但刷新或入库后丢失”的假闭环。
