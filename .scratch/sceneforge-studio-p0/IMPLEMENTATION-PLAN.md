# SceneForge Studio P0 — 实施计划

> 日期：2026-06-17  
> 依赖：`PRD.md`、`DESIGN.md`  
> 验证：`npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts`；`npx tsc --noEmit`

## 阶段总览

| 阶段 | 目标 | 预估 issues |
| --- | --- | --- |
| A | 文档与 CLAUDE.md UI 纪律 | 01 |
| B | 文案 + 创建入口 entryPath | 02–03 |
| C | 流水线侧栏 + 能力矩阵（纯 UI 模型） | 04–05 |
| D | Studio Shell 对齐 Cut（三栏重构） | 06–07 |
| E | intake / gate 工作区（最小 HITL） | 08–10 |
| F | 后端契约扩展（按需） | 11 |
| G | 回归与 handoff | 12 |

## 阶段 A

- 在 `CLAUDE.md` SceneForge 节增加 **UI 对齐**：DESIGN.md、`src/ui/*`、禁止 sceneforge 硬编码字阶；产品名「视频内容创作工坊」。
- 可选：在 `docs/sceneforge/` 增加短链指向 `.scratch/sceneforge-studio-p0/`。

## 阶段 B

- Studio 顶栏/Setup/欢迎入口文案替换。
- `sceneforge-setup`：单选 entryPath，写入 `project.json`。
- 类型 + project-persistence 迁移默认值 `topic_gate`。

## 阶段 C

- 新增 `src/sceneforge/lib/scene-pipeline-ui.ts`（分组、显示名、状态合并）。
- 新增 `src/sceneforge/lib/scene-stage-capabilities.ts`（就绪标签、工作区模板 id）。
- 新增 `src/sceneforge/lib/scene-entry-path.ts`（阻塞、推荐 stage）。
- Vitest：`tests/sceneforge-pipeline-ui.test.ts`。

## 阶段 D

- 拆分 `SceneForgeStudioShell` + 瘦化 `SceneForgeStudio.tsx`。
- 替换 Button/Tabs/Alert/InspectorSection；CSS 改用 tokens + separator 布局。
- 对齐 `StageRunPanel`、`ArtifactCopyPanel` 子样式。

## 阶段 E

- `IntakeWorkspace`：源类型、链接/文件占位、改编方向选择 UI（对接 state/artifact）。
- `GateWorkspace`：需求输入、风格列表、确认 CTA、决策展示。
- `SupportPlaceholderWorkspace`：MCP 指引 + 阻塞说明。

## 阶段 F（已定：Studio submit，ADR-0001）

- 扩展 `submitStageDraft` / MCP / IPC 支持 `source_intake`、`topic_gate` 及登记 artifactKey。
- `sceneGetProjectState` 返回 `entryPath`。
- 参考：`docs/adr/0001-sceneforge-entry-path-and-studio-hitl.md`、issue 11。

## 阶段 G

- 全量 sceneforge 测试 + tsc。
- 更新 `.handoff/` 与 Phase 2 gap 文档一句指向 P0 包。

## 风险

| 风险 | 缓解 |
| --- | --- |
| Shell 重构面大 | 先侧栏数据层测试，再换皮 |
| intake/gate 无 pack | P0 允许 Agent 写 artifact + Studio 只读同步 |
| IPC 三件套遗漏 | 按 CLAUDE.md 清单自检 |

## 建议执行顺序（AFK 优先）

01 → 04 → 05 → 02 → 06 → 07 → 03 → 08 → 09 → 10 → 11（按需）→ 12