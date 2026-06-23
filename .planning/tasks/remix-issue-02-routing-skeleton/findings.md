# Remix Issue #2 Findings

## 2026-06-23

- 当前应用没有 `react-router`；页面切换真相源是 `App.tsx` 中的 `AppPage` 状态，而不是 URL 路由。
- 因此 Remix 的“四条路由”应翻译为：
  - 固定的 Remix route helper（负责 `/remix/assets` 等心智路由）
  - `AppPage` 驱动的实际页面切换
  - 轻量 `history.state + hash` 同步，提供 Remix 页面内的前进 / 后退
- `/remix/assets/:sourceAssetId` 不需要新建第四个主页面；它可以复用 Asset Library 壳，只切右侧详情态，符合“3 个主界面空壳 + 4 条路由”的设计要求。
- `Setup` 当前已有独立的“视频内容创作工坊”入口；Remix Mode 适合在同一组 quick actions 中新增独立入口，而不是替换现有 SceneForge 项目创建入口。
