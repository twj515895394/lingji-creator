# SceneForge Core LLM Happy Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 TDD，按本目录 issues 01–04 顺序执行。未经用户同意不提交 Git。

**Goal:** 让三个 Core 阶段可通过 Direct LLM 真实生成完整草案，经用户审阅后提交并通过既有校验。

**Architecture:** Runner 保持纯草案生成；新增 output contract 一致性检查和 Studio 草案审阅组件；写盘继续通过 `sceneSubmitStageDraft`。

**Tech Stack:** Electron、TypeScript、React、Vitest、Stage Pack YAML/Markdown、现有 LLM Provider。

---

## 文件结构

- Modify: `electron/sceneforge/runners/scene-direct-llm-runner.ts`
- Modify: `electron/sceneforge/pipeline/scene-stage-pack.ts`
- Modify: `electron/sceneforge/pipeline/scene-stage-definitions.ts`
- Create: `src/sceneforge/components/stage-run/SceneRunDraftReview.tsx`
- Create: `src/sceneforge/components/stage-run/SceneRunDraftReview.module.css`
- Modify: `src/sceneforge/components/stage-run/StageRunPanel.tsx`
- Modify: `tests/sceneforge-direct-llm-runner.test.ts`
- Create: `tests/sceneforge-core-llm-contract.test.ts`
- Create: `tests/sceneforge-core-llm-happy-path.test.ts`
- Modify: `tests/sceneforge-ui.test.tsx`

## Task 1：锁定 Core output contract

- [x] 写失败测试：逐阶段加载 Pack，并断言 requiredArtifacts 与阶段定义完全相等。
- [ ] 运行：

```bash
npx vitest run tests/sceneforge-core-llm-contract.test.ts
```

预期：若存在顺序或 key 漂移则失败。

- [x] 在 Pack/Runner 边界增加一致性断言和结构化错误。
- [x] 再运行测试，预期通过。

## Task 2：严格解析 Direct LLM 输出

- [x] 在 `sceneforge-direct-llm-runner.test.ts` 添加：
  - 三阶段完整 required keys 成功。
  - 只返回部分 keys 时失败。
  - 空字符串 key 视为缺失。
  - 非 JSON 返回解析错误。
  - Runner 完成后项目目录无新 artifact。
- [x] 将解析逻辑从“至少一个 key”收紧为“全部 required keys”。
- [x] 保留 Provider 原始错误消息，不记录 API Key 或 Prompt 全文。

## Task 3：实现草案审阅组件

- [x] 写 UI 失败测试：结果按 output contract 顺序显示，缺 key 禁止提交。
- [x] 创建 `SceneRunDraftReview`，props 包含：

```ts
interface SceneRunDraftReviewProps {
  artifacts: Record<string, string>;
  requiredKeys: string[];
  submitting: boolean;
  onSubmit: () => void;
  onDiscard: () => void;
}
```

- [x] 使用现有 UI token；不新增硬编码字阶。
- [x] 将 `StageRunPanel` 内 pendingArtifacts 展示和提交按钮迁入该组件。
- [x] 提交失败保留草案，成功才清空。

## Task 4：三个阶段 mock happy path

- [x] 为 design 建立 fixture：五项产物 → submit → validate passed。
- [x] 为 storyboard 建立 fixture：四项产物 → submit → validate passed。
- [x] 为 video_prompts 建立 fixture：两项内容包含 Segment/Audio → validate passed。
- [x] 验证每个 run 调用本身不写盘。
- [x] 运行：

```bash
npx vitest run tests/sceneforge-core-llm-*.test.ts tests/sceneforge-direct-llm-runner.test.ts
```

## Task 5：回归与人工验收

- [x] 运行：

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
```

- [ ] 重启 Electron，配置测试 Provider。
- [ ] 至少真实生成 design，检查五项草案、提交、Validate、Continue。
- [ ] 条件允许时继续完成 storyboard 和 video_prompts。
- [ ] 将 Provider、模型、耗时、成功/失败阶段写入 handoff，不记录密钥。

## 提交建议

1. `test(sceneforge): lock core llm output contracts`
2. `feat(sceneforge): validate complete direct llm drafts`
3. `feat(sceneforge): add core llm draft review`
4. `test(sceneforge): cover core llm happy path`
