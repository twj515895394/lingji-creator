# SceneForge Gate / Intake Card HITL Implementation Plan

> **For agentic workers:** 使用 TDD，按 issues 01–04 执行。未经用户同意不提交 Git。

**Goal:** 将 intake 和 topic_gate 的现有 Markdown HITL 升级为兼容旧项目的卡片式决策工作区。

**Architecture:** parser/builder 与 UI 分离；卡片只消费 View Model；所有确认继续走现有 `sceneSubmitStageDraft`。

**Tech Stack:** React、TypeScript、Vitest、CSS Modules、Electron preload API。

---

## 文件结构

- Modify: `src/sceneforge/lib/scene-hitl-markdown.ts`
- Modify: `tests/sceneforge-hitl-markdown.test.ts`
- Create: `src/sceneforge/components/workspace/SceneGateScoreCards.tsx`
- Create: `src/sceneforge/components/workspace/SceneGateScoreCards.module.css`
- Modify: `src/sceneforge/components/workspace/SceneAdaptationDirectionPanel.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGateConfirmPanel.tsx`
- Modify: `src/sceneforge/components/workspace/SceneGatePostConfirm.tsx`
- Modify: `tests/sceneforge-hitl-adaptation-gate.test.ts`
- Modify: `tests/sceneforge-ui.test.tsx`

## Task 1：评分 parser 与 View Model

- [ ] 先写 parser 失败测试，覆盖：
  - `- 传播潜力: 8/10`
  - `- 制作可行性：高`
  - 无评分段
  - 空列表项
- [ ] 实现 `parseGateScoresFromMarkdown`，保留字符串 value。
- [ ] 运行：

```bash
npx vitest run tests/sceneforge-hitl-markdown.test.ts
```

## Task 2：Intake 方向卡片

- [ ] 写 UI 测试：多个方向、默认选中、确认提交、已确认摘要、重新选择。
- [ ] 重构现有方向 panel，使卡片可键盘选择并有明确选中态。
- [ ] 空方向时显示“请在高级 Markdown 中补充改编方向”，不显示不可用确认按钮。
- [ ] 确认继续提交 `adaptation_selection`。

## Task 3：Gate 评分、决策与风格卡

- [ ] 添加只读评分卡组件。
- [ ] 将 decision chips 调整为完整决策卡，保留 go/observe/drop 值。
- [ ] 将风格列表调整为统一卡片，并保持默认候选回退。
- [ ] 确认时一次写回 `gate_confirmations`。
- [ ] 已确认状态显示摘要和重新选择。

## Task 4：阻塞规则与兼容回归

- [ ] 测试未确认风格时 reference+ 继续阻塞。
- [ ] 测试 decision=drop 时不能推进。
- [ ] 测试缺评分不阻塞 Validate。
- [ ] 测试旧 Markdown 无 id/family 仍可展示。

## Task 5：验证

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-hitl-*.test.ts tests/sceneforge-ui.test.tsx
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
```

人工：

- source_intake entryPath 创建项目并确认方向。
- topic_gate entryPath 创建项目并确认决策/风格。
- 打开旧项目验证卡片回显与高级 Markdown 降级。

## 提交建议

1. `feat(sceneforge): parse topic gate score cards`
2. `feat(sceneforge): upgrade intake direction hitl`
3. `feat(sceneforge): upgrade topic gate card hitl`
4. `test(sceneforge): cover card hitl compatibility`

