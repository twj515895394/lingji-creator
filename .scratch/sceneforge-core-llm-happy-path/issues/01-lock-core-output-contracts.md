Status: completed

## 父问题

`.scratch/sceneforge-core-llm-happy-path/PRD.md`

## 要构建什么

锁定 design、storyboard、video_prompts 的阶段定义与 Stage Pack output contract，使 Direct LLM 在调用 Provider 前即可识别 requiredArtifacts 漂移，并以结构化错误停止运行。

## 验收标准

- [x] 三个 Core Stage Pack 的 requiredArtifacts 与阶段定义完全一致
- [x] 不一致时返回 `SCENE_STAGE_OUTPUT_CONTRACT_MISMATCH`
- [x] 契约检查发生在 Provider 调用之前
- [x] 表驱动测试覆盖三个阶段

## 完成证据

- `loadSceneStagePack()` 在返回 Pack 前执行契约一致性断言，Direct LLM 在加载 Pack 后才读取设置并调用 Provider。
- `tests/sceneforge-core-llm-contract.test.ts`：4 tests passed。
- 2026-06-18：TypeScript 与 SceneForge 全量回归通过。

## 被阻塞于

无 - 可以立即开始

## 类型

AFK
