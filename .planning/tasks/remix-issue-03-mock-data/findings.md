# Remix Issue #3 Findings

## 2026-06-23

- `src/sceneforge/remix/types/index.ts` 已经完整定义了 SourceAsset / RemixVariant / Snapshot 契约，适合作为 mock 数据唯一类型来源。
- `electron/sceneforge/remix/remix-ipc-types.ts` 已经定义了 `RemixIpcContract` 和全部输入类型，前端 mock API 可以直接对齐这份签名，避免再造接口。
- 现有 `electron/sceneforge/remix/remix-service.ts` 仍是后端 stub；Issue #3 更适合在 `src/sceneforge/remix/` 下补前端 mock layer，而不是提前改主进程实现。
- 当前 Remix 页面骨架还没接真实数据读取，先提供 `remixApiClient` 单例能让后续 Issue #4/5/6 直接消费。
