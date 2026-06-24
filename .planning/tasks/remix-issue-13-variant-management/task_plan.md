# Remix Issue #13：Variant 管理闭环 — 多版本管理、继续创作与生命周期操作

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 3 扩展

## 要构建什么

补齐“同一个 Source Asset 管理多个 Remix Variant”的产品闭环。让用户不仅能创建一个新 Variant，还能从 Asset Library 查看已有 Variant、继续创作、复制、重命名和删除。

端到端行为：
- 新增后端管理接口：
  - `listVariantsForSourceAsset`
  - `renameVariant`
  - `duplicateVariant`
  - `deleteVariant`
- 扩展 Asset Library 详情结构或相关查询结构，使 Asset Library 能展示某个 Source Asset 下的已有 Variant 概览
- 在 Asset Library 的详情侧栏或 Variant 列表区展示：
  - 已有 Variant 列表
  - 进入已有 Variant
  - 创建新 Variant
  - 复制 / 重命名 / 删除 Variant
- 删除 Variant 时仅删除 Variant 域产物，绝不影响 Source Asset

## 验收标准

- [ ] 同一个 Source Asset 可展示多个已存在的 Remix Variant
- [ ] 用户可从 Asset Library 直接进入某个已有 Variant 继续创作
- [ ] 用户可复制一个 Variant，复制后生成新的 Variant ID 与独立目录
- [ ] 用户可重命名 Variant，且 Asset Library / Creation Workspace 展示同步更新
- [ ] 用户可删除 Variant，删除后 Source Asset 与其他 Variant 不受影响
- [ ] Variant 管理操作不引入新的长任务 Stage；仍作为创作组入口动作或管理动作存在

## Code Review 检查项

- [ ] Variant 管理接口位于 `sceneForgeRemix` 命名空间下，不污染既有 SceneForge 通道
- [ ] duplicate / rename / delete 只操作 Variant 域，不覆盖 Source Asset 原始切片、关键帧、分析结果
- [ ] Asset Library 中“继续已有 Variant”与“创建新 Variant”语义分离，不共用一个模糊入口
- [ ] 多 Variant 列表可回溯到 Source Asset，且路径全部通过 `remix-artifact-paths.ts` 统一生成

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-variant-management.test.ts`：验证 list / rename / duplicate / delete 的后端行为
- [ ] 更新 `tests/sceneforge-remix-asset-library.test.tsx`：验证已有 Variant 展示与“继续创作”入口
- [ ] 更新 `tests/sceneforge-remix-creation-workspace.test.tsx`：验证 rename 后工作台摘要同步
- [ ] `npm run test` 全量通过
- [ ] 手动验证：同一 Source Asset 创建两个 Variant，并能分别进入、复制、重命名、删除

## 被阻塞于

- Remix Issue #4（需要 Asset Library UI 基础）
- Remix Issue #9（需要 Variant 基础后端）
- Remix Issue #10（需要 Creation Workspace 真实接入）

## 推荐辅助 Skill

- `design-taste-frontend`：Variant 列表与操作入口的界面组织
- `codebase-design`：Variant 管理接口与快照结构设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-design.md` — 核心用户场景 §4.3
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design-v1.1.md` — 设计验收标准 §10
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design.md` — Variant Manager §5.1 / 创建弹窗 §5.2
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-boundary-v1.1.md` — Source Asset / Variant 边界 §2
