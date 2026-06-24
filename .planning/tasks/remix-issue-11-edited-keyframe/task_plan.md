# Remix Issue #11：改后关键帧验收闭环 — 上传、绑定、状态管理、前置检查

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 4

## 要构建什么

实现改后关键帧的登记、绑定、状态流转和视频提示词前置条件检查，贯穿后端服务到前端 UI。

端到端行为：
- 新增 `electron/sceneforge/remix/remix-edited-keyframe-service.ts` — 管理改后关键帧文件上传、与 sourceFramePath 和 promptPath 绑定，并提供状态流转方法
- 更新 `electron/sceneforge/remix/remix-validators.ts` — 增加 Seedance 视频生成的前置校验函数，确保所有必需关键帧均已 approved
- 更新 IPC handler 接入：实现 `registerEditedKeyframe`（上传并登记关键帧）、`updateEditedKeyframeStatus`（更新审批状态）
- 更新 `src/sceneforge/remix/pages/RemixCreationWorkspace.tsx` 第 06 步（改后关键帧验收）：
  - 渲染改后关键帧卡片，支持拖拽/点击上传本地绘制的图
  - 图片与对应的 sourceFramePath 和 promptPath 正确关联绑定
  - 提供对关键帧状态（approved / needs_revision / rejected）的快速审批按钮
  - 在步骤头部展示全局和逐片段的验收完成度（如：已通过 4/6）
  - 若有必需的关键帧未通过验收，禁用第 07 步的 Seedance 视频提示词生成入口并展示警示

## 验收标准

- [ ] 支持改后关键帧的上传/选择并成功登记到 variant 对应目录下
- [ ] 每张改后关键帧在 meta 属性中正确记录 sourceFramePath 与对应 promptPath 的关系
- [ ] 可修改并流转关键帧的状态（approved、needs_revision、rejected 等）
- [ ] UI 段落中能够准确展现各个 Segment 关键帧的验收百分比
- [ ] 校验层生效：若存在未 approved 的必需帧，第 07 步处于置灰禁用态并给出引导性 tooltip
- [ ] 关键帧的状态生命周期在 `pending → generated → approved` 以及 `generated → needs_revision` 后重新上传转换正常

## Code Review 检查项

- [ ] 状态流转符合状态机规则，杜绝从 `approved` 乱跳等异常发生
- [ ] 所有业务级别的流控制和完整性校验必须下沉到后端 `remix-validators.ts` 集中处理，渲染端只做 UI 呈现
- [ ] 关键帧的上传和持久化路径由 `remix-artifact-paths.ts` 统一计算，禁止零散的拼路径代码
- [ ] Renderer 层绝不触碰底层的 node `fs` 读写，完全使用 IPC 服务提供的上传与加载接口

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-edited-keyframe.test.ts`：测试关键帧绑定数据序列化、状态流转、校验规则正确性
- [ ] 新增 `tests/sceneforge-remix-edited-keyframe-ui.test.tsx`：验证前端上传事件触发、卡片渲染与置灰策略
- [ ] `npm run test` 全量通过
- [ ] 手动验证：在 Workspace 第 06 步上传一张图片，点击 approved，验证第 07 步成功解锁

## 被阻塞于

- Remix Issue #10（需要 Creation Workspace 整体 API 链路已调通）

## 推荐辅助 Skill

- `codebase-design`：状态机与校验层设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 4 (§11)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-module-design.md` — §11
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-frontend-ui-design.md` — §11
