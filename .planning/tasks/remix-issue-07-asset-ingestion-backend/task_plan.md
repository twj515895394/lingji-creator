# Remix Issue #7：资产入库后端 — Source Asset + Segmentation + Keyframe + Understanding

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 2

## 要构建什么

实现资产入库闭环的全部后端服务：从视频导入到 Source Asset 创建、真实镜头切片、关键帧提取、原片理解、保存入库。

端到端行为：
- 新增 `electron/sceneforge/remix/remix-service.ts` — 编排层，接收前端请求分发到子服务
- 新增 `electron/sceneforge/remix/remix-source-asset-service.ts` — 创建 Source Asset、写入 `source_manifest.json`、复用现有 video-import
- 新增 `electron/sceneforge/remix/remix-segmentation-service.ts` — 真实镜头切片、合并短镜头、安全切点、导出 `source_clip.mp4`
- 新增 `electron/sceneforge/remix/remix-keyframe-service.ts` — first/last/middle 关键帧提取
- 新增 `electron/sceneforge/remix/remix-understanding-service.ts` — LLM 生成 source_overview 和 segment_analysis
- 新增 `electron/sceneforge/remix/remix-validators.ts` — 资产入库阶段的前置条件校验
- 将 IPC handler stub（Issue #1）替换为真实服务调用
- 注册 `remix_reference` pipelineId

## 验收标准

- [ ] 可通过 IPC 创建 Source Asset（从视频导入结果）
- [ ] 切片服务生成 Source Segment 列表和 `source_clip.mp4`
- [ ] 关键帧服务提取 first/last 帧（所有片段）和 middle 帧（>8s 片段）
- [ ] 理解服务生成 source_overview 和 segment_analysis（Markdown + JSON）
- [ ] 入库后 Source Asset 状态变为 `published_to_library`
- [ ] 产物写入 `sceneforge/remix/source_assets/` 目录
- [ ] Artifact Store 正确登记所有产物
- [ ] 现有 video-import 功能不受影响

## Code Review 检查项

- [ ] 所有新文件位于 `electron/sceneforge/remix/` 目录
- [ ] 复用现有 video-import，通过 adapter/wrapper 调用
- [ ] `remix-service.ts` 只做编排，不含业务逻辑
- [ ] 切片规则遵循设计文档：真实镜头边界优先、不强行固定时长、找不到安全切点允许 long_segment
- [ ] 关键帧规则遵循设计文档：first+last 必需、middle 仅 >8s
- [ ] 产物路径通过 `remix-artifact-paths.ts` 生成，无硬编码
- [ ] Renderer 不直接读写项目目录
- [ ] LLM runner 不直接写 state

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-source-asset.test.ts`：Source Asset 创建、manifest 写入
- [ ] 新增 `tests/sceneforge-remix-segmentation.test.ts`：切片逻辑、短镜头合并、长镜头安全切点
- [ ] 新增 `tests/sceneforge-remix-keyframe.test.ts`：关键帧提取规则（first/last/middle）
- [ ] 新增 `tests/sceneforge-remix-understanding.test.ts`：LLM 输出格式校验
- [ ] 新增 `tests/sceneforge-remix-validators.test.ts`：各阶段前置条件校验
- [ ] 现有 SceneForge 测试全部通过，无回归
- [ ] `npm run test` 全量通过

## 被阻塞于

- Remix Issue #0（需要类型定义和 Stage 定义）
- Remix Issue #1（需要 IPC 通道骨架）

## 推荐辅助 Skill

- `codebase-design`：服务层架构对齐

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 2 (§8)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-module-design.md` — §3~§6
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-stage-flow-design.md`
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-boundary-v1.1.md`
