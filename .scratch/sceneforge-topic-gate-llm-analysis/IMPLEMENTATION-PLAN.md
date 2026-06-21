# SceneForge Topic Gate LLM Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 TDD，按本目录 issues 01–04 顺序执行。未经用户同意不提交 Git。

**Goal:** 让 `topic_gate` 变成真实的 Direct LLM 选题分析闸门，并保留人工最终确认。

**Architecture:** 新增 `topic_analysis` 机器建议产物；保留 `topic_brief` 与 `gate_confirmations` 的现有职责；使用专用分析入口而不是复用整块通用 `StageRunPanel`。

**Tech Stack:** Electron、TypeScript、React、Vitest、现有 Direct LLM Runner、sessionStorage 阶段恢复。

---

## 文件结构

- Modify: `electron/sceneforge/service.ts`
- Modify: `electron/sceneforge/scene-ipc-types.ts`
- Modify: `electron/preload.ts`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/sceneforge/lib/scene-hitl-markdown.ts`
- Modify: `src/sceneforge/lib/scene-stage-run-capabilities.ts`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Create: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.tsx`
- Create: `src/sceneforge/components/workspace/SceneGateAnalysisPanel.module.css`
- Modify: `src/sceneforge/components/workspace/SceneGateBriefForm.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGateConfirmPanel.tsx`
- Modify: `src/sceneforge/store/scene-stage-run-session.ts`
- Modify: `electron/sceneforge/validators/validators.topic-gate.ts`
- Modify: `tests/sceneforge-hitl-markdown.test.ts`
- Create: `tests/sceneforge-topic-gate-llm-analysis.test.ts`
- Modify: `tests/sceneforge-ui.test.tsx`
- Modify: `tests/sceneforge-stage-run-session-store.test.ts`

## Task 1：锁定 `topic_analysis` 契约

- [ ] 先写失败测试，覆盖：
  - `topic_analysis` 正常解析出 summary / score / decisionSuggestion / styleCandidates
  - 缺失关键字段时报错
  - 旧项目无 `topic_analysis` 时返回诚实空值
- [ ] 在 `scene-hitl-markdown.ts` 增加 `parseTopicAnalysisFromMarkdown` 与 builder。
- [ ] 运行：

```bash
npx vitest run tests/sceneforge-hitl-markdown.test.ts tests/sceneforge-topic-gate-llm-analysis.test.ts
```

## Task 2：接通 Direct LLM 分析通路

- [ ] 写失败测试：`topic_gate` 可触发专用分析，不走 ACP，不写盘时返回 draft。
- [ ] 在 Electron service / preload / renderer API 新增 `sceneAnalyzeTopicGate`。
- [ ] 约束只允许 `direct_llm`，并对不完整结果返回结构化错误。
- [ ] 运行：

```bash
npx vitest run tests/sceneforge-topic-gate-llm-analysis.test.ts
```

## Task 3：实现专用分析面板与恢复

- [ ] 写 UI 失败测试：
  - 未分析时显示“分析选题”，不显示评分 section
  - 分析成功后显示评分、建议决策、风格候选
  - 切换阶段再回来恢复已生成结果
- [ ] 创建 `SceneGateAnalysisPanel`。
- [ ] 复用现有阶段会话恢复 store，保存 `topic_analysis` draft 与运行态。
- [ ] 从 `topic_gate` 页面移除 Agent / ACP / MCP 话术。
- [ ] 运行：

```bash
npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-stage-run-session-store.test.ts tests/sceneforge-topic-gate-llm-analysis.test.ts
```

## Task 4：Validate / Continue / 兼容回归

- [ ] 写测试覆盖：
  - 新项目主路径要求先有 `topic_analysis` 再做完整 gate 确认
  - 旧项目无 `topic_analysis` 但有 `gate_confirmations` 可按 legacy 兼容
  - `decision=drop` 仍禁止 Continue
- [ ] 更新 `validators.topic-gate.ts` 与相关 UI hint。
- [ ] 回归：

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```

## Task 5：人工验收

- [ ] Electron 手测 `topic_gate`：
  - 保存简报
  - 分析选题
  - 切走再回来
  - 确认决策与风格
  - Validate
  - Continue 到 `reference`
- [ ] 验证页面不再出现 Agent / ACP / MCP 推进文案。
- [ ] 把真实手测发现同步回 `progress.md` 与 handoff。

## 提交建议

1. `feat(sceneforge): add topic gate analysis contract`
2. `feat(sceneforge): wire direct llm topic gate analysis`
3. `feat(sceneforge): add topic gate analysis workspace`
4. `test(sceneforge): cover topic gate llm analysis flow`
