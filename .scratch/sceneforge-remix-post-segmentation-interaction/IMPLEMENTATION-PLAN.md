# SceneForge Remix 切片后交互与 ASR 收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重跑整份原片理解的前提下，统一切片后阶段的片段交互、ASR 重跑能力和台词确认收口，并把 ASR 控制区做成与 Remix 现有 UI 一致的样式。

**Architecture:** 以 `RemixAssetProcessing` 为主入口，把 ASR 选择值收口为页面级单一状态源；把“点击片段 -> 预览 seek/play”抽成切片后阶段共用行为；在 Electron transcript 层补全“全量片段 ASR 重跑 / 单段 ASR 重跑”能力；最后修正 transcript confirmation 与 stale/freshness 的状态收敛，不靠隐藏文案消缺陷。

**Tech Stack:** Electron、TypeScript、React、Vitest、SceneForge Remix IPC / service / workbench 状态流。

---

## 文件结构

- Modify: `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- Modify: `src/sceneforge/remix/components/UnderstandingWorkbenchPanel.tsx`
- Modify: `src/sceneforge/remix/components/SegmentTable.tsx`
- Modify: `src/sceneforge/remix/components/SegmentTimeline.tsx`
- Modify: `src/sceneforge/remix/lib/remix-workspace-view-model.ts`
- Modify: `src/sceneforge/remix/types/index.ts`
- Modify: `electron/sceneforge/remix/remix-ipc-types.ts`
- Modify: `electron/sceneforge/remix/remix-ipc.ts`
- Modify: `electron/sceneforge/remix/remix-service.ts`
- Modify: `electron/sceneforge/remix/remix-transcript-service.ts`
- Modify: `electron/sceneforge/remix/remix-understanding-orchestrator.ts`
- Modify: `electron/sceneforge/remix/remix-understanding-workbench.ts`
- Modify: `src/sceneforge/remix/mock/mock-api.ts`
- Modify: `src/sceneforge/remix/mock/mock-data.ts`
- Modify: `tests/sceneforge-remix-asset-processing.test.tsx`
- Modify: `tests/sceneforge-remix-understanding-orchestrator.test.ts`
- Modify: `tests/sceneforge-remix-understanding-workbench.test.ts`
- Modify: `tests/sceneforge-remix-sensevoice-provider.test.ts`

说明：

- 如执行时发现 `SegmentTable` / `SegmentTimeline` 并不是切片后阶段统一点击接缝，应在不扩大范围的前提下改为真实的共用卡片容器。
- 当前工作树里已经存在一部分 `preferredAsrEngine` 透传与 SenseVoice parser 修正，后续实施应以“保留能用部分 + 按本计划补齐缺口”为原则，不做无关重构。

## Task 1：收口 ASR 控制栏样式与单一状态源

- [ ] 盘点 `RemixAssetProcessing` 当前顶部控制区里与 `ASR 引擎` 相邻的按钮、排版和已有统一组件，确定可复用组件而不是继续交原生下拉。
- [ ] 先补一个失败测试或交互断言，明确“ASR 选择值变化后，可被多个动作共用”，避免后续只接到 `生成原片理解`。
- [ ] 把当前原生 `<select>` 替换成与 Remix 现有控制栏统一的选择器样式，并保持 `preferredAsrEngine` 只在这一处维护。
- [ ] 让 `生成原片理解`、后续“全部片段音频 ASR 重跑”和“单片段 ASR 重跑”都读取这一个状态源。
- [ ] 跑页面定向测试，确认 UI 选择仍可在测试环境可靠交互。

## Task 2：实现切片后阶段统一的片段点击预览联动

- [ ] 梳理 `真实镜头切片`、`关键帧提取`、`原片理解`、`人工标注` 里哪些区域是真正的片段点击入口，明确应该复用的状态和回调。
- [ ] 先补测试，断言在切片后阶段点击片段卡片时，会更新预览跳转时间，并触发播放而不是只 seek。
- [ ] 在页面层新增或收口“当前选中片段”状态，把点击行为统一映射到 `syncPreviewTo(...)` 及播放器播放动作。
- [ ] 给当前选中片段提供最小必要的视觉高亮，让用户知道预览区正在跟随哪个片段。
- [ ] 回归 `SegmentTable`、`SegmentTimeline` 和理解工作台卡片点击，不破坏现有基础交互。

## Task 3：补齐全部片段音频 ASR 重跑

- [ ] 在 IPC 契约中新增“全部片段音频 ASR 重跑”输入输出定义，要求输入接受当前单一 `preferredAsrEngine`。
- [ ] 先补服务层测试，断言该动作只重跑片段 transcript / ASR，不触发整份 understanding LLM 编排。
- [ ] 在 `remix-service` / `remix-transcript-service` 中实现批量片段 transcript 重跑路径，复用已有 segment audio 与 ASR provider resolver。
- [ ] 在页面顶部控制区增加“全部片段音频 ASR 重跑”入口，并复用 Task 1 的选择值与 loading 状态。
- [ ] 跑 transcript / asset processing 定向测试，确认 bulk rerun 能刷新 workbench transcript。

## Task 4：补齐单片段音频 ASR 重跑

- [ ] 在片段卡片或 transcript 区域定义单段 ASR 重跑入口位置，确保它和“单段理解重跑”不会语义混淆。
- [ ] 先补测试，断言单段重跑会携带 `segmentId + preferredAsrEngine`，并只刷新对应 segment transcript。
- [ ] 在 IPC / service 层新增单段 ASR 重跑动作，复用 bulk rerun 的核心 transcript 逻辑，但将作用域压缩到单段。
- [ ] 在 workbench UI 中接入局部 loading / 按钮禁用，避免整页被错误锁死。
- [ ] 回归单段 ASR 重跑与单段理解重跑共存场景，确认二者文案与行为边界清晰。

## Task 5：修复一键确认后的 stale 收口

- [ ] 先追踪 transcript confirmation 后的 stale 来源：是 correction 文档、workbench 聚合、sourceAsset stage state，还是 freshness 校验没有同步更新。
- [ ] 补一个失败测试，覆盖“用户未做额外修改，只点击一键确认，之后仍被误判为已编辑/需重跑”的路径。
- [ ] 以最小修复方式调整 confirmation 与 freshness 的收敛逻辑，让一键确认真正结束 transcript 脏状态。
- [ ] 保留真实 stale 场景的提示，不允许通过粗暴清空所有 stale 标志来通过测试。
- [ ] 跑 workbench / asset processing / understanding 相关回归，确认阶段能正确收口。

## Task 6：回归、真机验收与记录

- [ ] 跑与本轮相关的 vitest 子集，至少覆盖 asset processing、understanding workbench、orchestrator、sensevoice provider。
- [ ] 跑 `npx tsc --noEmit`，确认 IPC 扩展和页面状态流没有类型回退。
- [ ] 手工验收一次完整链路：
  1. 进入 `真实镜头切片`，点击片段卡片，确认预览跳到对应片段并开始播放。
  2. 切换 ASR 引擎，执行“全部片段音频 ASR 重跑”，确认不重跑整份原片理解。
  3. 对单个片段执行“单片段音频 ASR 重跑”，确认只更新该片段 transcript。
  4. 点击“一键确认所有片段台词”，确认不再残留错误 stale 提示。
- [ ] 如执行期需要移交，补一份简短 handoff，注明剩余风险与未覆盖的人肉场景。

## 建议提交切片

1. `test(remix): cover post-segmentation preview linking and transcript stale closure`
2. `feat(remix): unify asr control bar and preview linking after segmentation`
3. `feat(remix): add bulk and single segment asr rerun actions`
4. `fix(remix): close transcript stale state after confirm-all`
5. `docs(remix): record post-segmentation interaction and asr rerun acceptance`
