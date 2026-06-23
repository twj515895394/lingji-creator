# Remix Issue #4 Findings

## 2026-06-23

- `RemixAssetLibrary.tsx` 初版只有占位卡片，缺少真实资产数据、筛选状态和创建 Variant 的实际动作。
- 当前 `listSourceAssets()` snapshot 只提供 summary，因此 UI 层在 Issue #4 先直接消费 Issue #3 的 mock 资产详情，避免为前端展示强行篡改后端契约。
- `createVariantFromSourceAsset()` 已在 mock API 中返回真实 `variantId`，Asset Library 应直接用它跳到 `/remix/projects/:variantId`，不要继续拼假路由 ID。
