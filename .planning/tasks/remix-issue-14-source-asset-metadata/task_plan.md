# Remix Issue #14：Source Asset 元数据闭环 — 人工标注、标签备注与持久化

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 2 扩展

## 要构建什么

补齐 Source Asset Processing Workspace 第 05 步“人工标注”的真实闭环。让用户填写的标签、备注和其他元数据能写入 Source Asset 域，并回流到 Asset Library 的筛选、详情和后续创作引用中。

端到端行为：
- 扩展 Source Asset 类型与 manifest，支持持久化：
  - 用户标签
  - 备注
  - 最近人工确认时间
  - 可选的人工确认人 / 来源字段
- 新增 `updateSourceAssetMetadata`（或等价命名）IPC / Service 接口
- Asset Processing Workspace 第 05 步接入真实保存与回读
- Asset Library 的标签筛选、详情侧栏、摘要信息读取持久化后的元数据，而不是只读 mock 常量

## 验收标准

- [ ] 用户可在人工标注步骤编辑标签与备注，并成功保存
- [ ] 重新打开同一 Source Asset 后，人工标注内容可正确回读
- [ ] 发布入库后，Asset Library 中仍能看到这份元数据
- [ ] 标签筛选基于持久化元数据生效，而不是只基于静态 mock
- [ ] Source Asset 元数据只写入 Source Asset 域，不写入 Variant 域

## Code Review 检查项

- [ ] Source Asset 元数据字段通过 Remix 类型与 manifest 契约统一定义，不散落在页面本地 state
- [ ] 人工标注保存接口走 `sceneForgeRemix` IPC，不在 Renderer 中直接写文件
- [ ] Asset Library 与 Asset Processing 对同一份元数据字段使用同一来源，避免“双写双读”
- [ ] 新增字段保持向后兼容；旧 manifest 缺字段时有空安全默认值

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-source-asset-metadata.test.ts`：验证元数据序列化、回读与兼容默认值
- [ ] 更新 `tests/sceneforge-remix-asset-processing.test.tsx`：验证标签与备注保存
- [ ] 更新 `tests/sceneforge-remix-asset-library.test.tsx`：验证标签筛选读取持久化数据
- [ ] `npm run test` 全量通过
- [ ] 手动验证：在第 05 步填写标签与备注，刷新后仍在，回到 Asset Library 可继续筛选和查看

## 被阻塞于

- Remix Issue #5（需要 Asset Processing UI 骨架）
- Remix Issue #7（需要真实 Source Asset 后端）
- Remix Issue #8（需要前端接入真实 Source Asset 流程）

## 推荐辅助 Skill

- `codebase-design`：Source Asset metadata 契约与 manifest 扩展设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Asset Processing UI §7.4 / Phase 2 §8
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design-v1.1.md` — 人工标注 §4.5
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-ui-split-revision.md` — Source Asset Processing Workspace §5
