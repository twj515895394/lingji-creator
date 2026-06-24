# Remix Issue #9：二创创作后端 — Variant + Strategy + Design + Keyframe Prompt Services

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 3

## 要构建什么

实现二创创作闭环的全部后端服务：创建 Variant、生成改编策略、生成 Remix Design、生成关键帧改图提示词。

端到端行为：
- 新增 `electron/sceneforge/remix/remix-variant-service.ts` — 创建/读取 Variant、配置 referenceStrength / retentionMatrix
- 新增 `electron/sceneforge/remix/remix-strategy-service.ts` — 根据 source overview + segment analysis + variant config 生成改编策略
- 新增 `electron/sceneforge/remix/remix-design-service.ts` — 根据 strategy 生成全局设定 + segment override
- 新增 `electron/sceneforge/remix/remix-keyframe-prompt-service.ts` — 生成 global 规则 + 逐帧改图提示词
- 更新 `remix-service.ts` 编排层接入新服务
- 更新 IPC handlers 接入新 API

## 验收标准

- [ ] 可从已入库 Source Asset 创建 Variant
- [ ] 可配置 referenceStrength（light/medium/strong）和 retentionMatrix（9 维）
- [ ] 可生成 remix_strategy（全局 + 逐片段）
- [ ] 可生成 remix_design（全局设定 + segment override）
- [ ] 可生成每个关键帧的改图提示词（绑定 source frame + frame role）
- [ ] 所有产物写入 Variant 目录，不覆盖 Source Asset
- [ ] Variant 只能引用已入库（`published_to_library`）的 Source Asset

## Code Review 检查项

- [ ] Variant 不覆盖 Source Asset 原始产物
- [ ] referenceStrength 三档固定，retentionMatrix 九维固定
- [ ] Strategy/Design/Prompt 产物路径通过 `remix-artifact-paths.ts` 生成
- [ ] LLM Prompt 结构清晰、可调试
- [ ] 未入库 Source Asset 尝试创建 Variant 时正确拒绝

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-variant.test.ts`：Variant 创建、配置校验、状态流转
- [ ] 新增 `tests/sceneforge-remix-strategy.test.ts`：Strategy 生成、输出格式校验
- [ ] 新增 `tests/sceneforge-remix-design.test.ts`：Design 生成、global + override 结构
- [ ] 新增 `tests/sceneforge-remix-keyframe-prompt.test.ts`：Prompt 生成、绑定关系校验
- [ ] `npm run test` 全量通过

## 被阻塞于

- Remix Issue #7（需要 Source Asset 服务和产物）

## 推荐辅助 Skill

- `codebase-design`：LLM 服务层设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 3 (§9)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-module-design.md` — §7~§10
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-design.md` — retentionMatrix、referenceStrength
