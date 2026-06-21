# Lingji Creator · SceneForge Support Pack Wave 收口交接

> 生成时间：2026-06-19（会话收口）  
> 分支：`codex/sceneforge-studio-core`（以你本地 `git branch` 为准）  
> **Support Pack Wave 自动化：已完成**（含 `continue-run` story→assets `canRun: true` 回归修复）

## 1. 本 Wave 已完成

| Issue | 内容 | 自动化 |
| --- | --- | --- |
| 01–02 | Performance / Audio Direct LLM | ✅ |
| 03–04 | Reference / Story Pack | ✅ |
| 05 | Assets Pack + Direct LLM | ✅ |
| 06 | Script Pack + performance context-policy（读 script_draft） | ✅ |
| 07 | Electron + 真 Provider 验收 | **维护者** — `issues/07-support-llm-electron-acceptance.md` |

六个 support 阶段均可：**mock run → 审阅 → submit → validate**；手工 Markdown 降级保留。

## 2. 关键路径

- 能力表：`src/sceneforge/lib/scene-stage-run-capabilities.ts`
- Context 注册：`electron/sceneforge/pipeline/scene-context-policy.ts`
- Packs：`prompts/sceneforge/stages/{reference,story,assets,script,performance,performance/context-policy,audio,...}`
- Continue & Run 边界：`tests/sceneforge-continue-run.test.ts` 第 94 行 `['story','assets',true]`

## 3. 建议提交分组（提交前请你 `git status` 核对）

1. Gate / Intake Card HITL（若仍混在未提交改动中）
2. Continue & Run
3. Support 公共能力 + Performance / Audio
4. Reference / Story / Assets / Script Packs + performance policy
5. 测试与 `continue-run` 边界修正
6. **默认不提交** `.planning/`（除非你明确要求）

## 4. 人工验收（Issue 07）

参考 `.scratch/sceneforge-support-pack-wave/issues/07-support-llm-electron-acceptance.md`：reference / script / performance / audio 真生成与提交、手工降级、Continue & Run 等。

历史待复核：`.scratch/sceneforge-studio/issues/20-studio-stage-run-ux-hitl.md`（Continue 后 Renderer 切换 reference，需有复现再修）。

## 5. Phase 3 下一包（须独立 PRD → 设计 → 计划 → issues）

按 `docs/sceneforge/2026-06-18-sceneforge-phase3-roadmap.md` 与 handoff §10：

| 优先级 | 包 | 说明 |
| --- | --- | --- |
| **P1** | Support Context / Validator 深化 | performance/audio/script 语义校验；缺必需输入时 Studio 阻塞提示 |
| **P2** | 项目级 Style / `selectedAssetIds` 选择器 | policy 已支持注入，Studio/IPC 未完整 |
| **P3** | Regenerate / Request Revision | 草案历史与重生成 |
| **P4** | Publish Stage | 独立 Pack + 发布工作区 |

**不要**在 Support Pack 提交里顺手做以上项。

## 6. 下一代理开工建议

1. 若用户要 **提交**：按 §3 selective staging，不 `reset --hard`，不清理 untracked。
2. 若用户要 **新功能**：从 **P1 Validator 深化** 或 **P2 Style 选择器** 立项；先读 `.scratch/sceneforge-studio/issues/10-scene-asset-library-and-style-profiles.md`。
3. 技能：`brainstorming` → `writing-plans` → `tdd` → `codereview`；会话结束 `handoff`。

## 7. 验证命令（收口复跑）

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-*.test.ts tests/sceneforge-*.test.tsx tests/electron-api.test.ts
git diff --check
```