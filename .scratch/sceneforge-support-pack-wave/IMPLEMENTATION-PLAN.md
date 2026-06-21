# SceneForge Support Pack Wave Implementation Plan

> **For agentic workers:** 先用 performance 完成首条追踪子弹，再逐阶段迁移。每个 issue 必须独立通过 run → submit → validate。

**Goal:** 让六个支撑阶段可以选择 Direct LLM 生成，同时保留手工 Markdown 降级路径。

**Architecture:** 显式 Runner 能力表控制开放阶段；Stage Pack 定义 Prompt/Context/Output；统一草案审阅和 submit 出口。

**Tech Stack:** Electron、TypeScript、React、Vitest、YAML、Markdown。

---

## 公共修改区域

- Create: `electron/sceneforge/pipeline/scene-stage-run-capabilities.ts`
- Modify: `electron/sceneforge/runners/scene-direct-llm-runner.ts`
- Modify: `src/sceneforge/components/stage-run/StageRunPanel.tsx`
- Modify: `src/sceneforge/components/workspace/ScenePrepSupportWorkspace.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `tests/sceneforge-direct-llm-runner.test.ts`
- Create: `tests/sceneforge-support-llm-happy-path.test.ts`

## 新增 Pack

- `prompts/sceneforge/stages/reference/*`
- `prompts/sceneforge/stages/story/*`
- `prompts/sceneforge/stages/assets/*`
- `prompts/sceneforge/stages/script/*`

## Task 1：Performance 追踪子弹

- [x] 写失败测试：performance 支持 Direct LLM，返回 `performance_direction`，run 不写盘。
- [x] 建立显式 stage run capability 表。
- [x] 让 Direct LLM 根据能力表接受 performance。
- [x] 让 StageRunPanel 对 support submit mode 提交生成草案。
- [x] 在 performance Workspace 同时显示 Runner 和手工编辑。
- [x] mock run → submit → validate passed。

## Task 2：Audio 追踪子弹

- [x] 验证 audio Pack 与 `audio_design` 契约。
- [x] 补齐 audio context policy。
- [x] 开放 Direct LLM 并完成 mock happy path。
- [x] 确认手工 audio 提交无回归。

## Task 3：Reference Pack

- [x] 从旧 reference skill 提取执行目标和 review checklist。
- [x] 创建标准 Pack 八件套。
- [x] policy 只读取 topic_gate、gate confirmations 和可选 source material。
- [x] 开放 reference Direct LLM。
- [x] 完成 run → review → submit → validate 测试。

## Task 4：Story Pack

- [x] 创建标准 Pack 八件套。
- [x] 接入 reference handoff、topic brief、adaptation selection 和 adaptation assets。
- [x] 开放 story Direct LLM。
- [x] 完成独立 happy path。

## Task 5：Assets Pack

- [x] 创建标准 Pack 八件套。
- [x] 接入 story、reference 摘要和 selected style。
- [x] 开放 assets Direct LLM。
- [x] 完成独立 happy path。

## Task 6：Script Pack

- [x] 创建标准 Pack 八件套。
- [x] 接入 story、design handoff、总时长和每段时长。
- [x] 开放 script Direct LLM。
- [x] 完成独立 happy path。

## Task 7：全链回归

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-stage-pack.test.ts tests/sceneforge-stage-pack-context.test.ts
npx vitest run tests/sceneforge-direct-llm-runner.test.ts tests/sceneforge-support-llm-happy-path.test.ts
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
```

人工：

1. reference 真生成并提交。
2. script 真生成并提交。
3. performance 真生成并自动通过 `auto_if_valid` 规则。
4. audio 真生成并推进 video_prompts。
5. 任一阶段切换到手动编辑仍可提交。

## 提交建议

每个阶段一个独立 commit，performance 首切片单独包含公共能力：

1. `feat(sceneforge): enable performance direct llm`
2. `feat(sceneforge): enable audio direct llm`
3. `feat(sceneforge): add reference stage pack`
4. `feat(sceneforge): add story stage pack`
5. `feat(sceneforge): add assets stage pack`
6. `feat(sceneforge): add script stage pack`
7. `test(sceneforge): verify support llm chain`
