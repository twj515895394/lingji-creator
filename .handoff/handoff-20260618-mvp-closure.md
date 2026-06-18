# Lingji Creator SceneForge Handoff - 2026-06-18

## 当前状态

| 项 | 值 |
| --- | --- |
| 分支 | `codex/sceneforge-studio-core`（工作区含 MVP 闭环改动） |
| 文档包 | `.scratch/sceneforge-studio-mvp-closure/` issues 01–05 |
| ADR | `docs/adr/0002-sceneforge-support-chain-mvp-and-core-submit.md` |

## 本会话完成（MVP 流水线闭环 issues 02–05）

### 后端（02）

- `SUPPORT_DRAFT_STAGES` 扩展：`reference` / `story` / `assets`
- artifactKey：`reference_notes`、`story_direction`、`asset_plan`
- validators + `scene-validator` 注册
- MCP `submit/validate/approve` stage 枚举扩展

### Studio（03）

- `ScenePrepSupportWorkspace` + Validate/Continue
- `scene-stage-capabilities`：三阶段工坊就绪
- 占位仅保留 script 等其余支撑阶段

### Core（04）

- `StageRunPanel`：**提交草案到产物库**
- `SceneCoreMvpPlaceholder`：design 五产物测试占位

### 回归（05）

- `npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts` — **112 passed**
- `npx tsc --noEmit` — 通过（仅 npmrc 警告）

## Issue 20 续验清单（Electron，需重启 main）

- [x] gate → Continue → **参考分析** → 提交 `reference_notes` → Validate → Continue（用户已确认）
- [x] **故事方向** / **资产规划** 同样走通
- [x] **设定图**：「填充 MVP 占位」或运行+提交 → Validate → Continue
- [ ] 全链至 video/export：见 `.handoff/handoff-20260618-next-batch.md`

## 验证命令

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```

改 `electron/` 后请 **重启 dev**。

## 未完成（仍属 P1/P2）

- intake/gate 卡片式 HITL 深化、支撑 pack + direct_llm
- `SceneForgeStudio` 拆 Shell、git commit 整理