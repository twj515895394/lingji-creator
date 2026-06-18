# SceneForge Studio Phase 2（Runners & Context）

> 一页索引 · Issues 13–21 · 设计已定稿 · **本地实现已完成**（待你 HITL 反馈 Issue 20）

## 范围

在 Issues **01–12** 核心闭环之上，交付：

- 精确 **Stage Context**（`context-policy.yaml`，废除 video 9 文件全文）
- **Handoff**（approve / auto_if_valid 时生成，下游优先读 slice）
- **P0 Stage Pack**（performance / audio / storyboard / video_prompts + design）
- **direct_llm / acp_agent** runner + **`sceneRunStage`**（IPC / preload / electron-api / MCP）
- Studio **执行方式** + 底部 **task-progress**（`StageRunPanel`）

## 已定稿设计

| 文档 |
|------|
| [Phase 2 总览](../../docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md) |
| [D1 Context & Handoff](../../docs/sceneforge/2026-06-17-sceneforge-stage-context-and-handoff-design.md) |
| [D2 Pack 迁移](../../docs/sceneforge/2026-06-17-sceneforge-stage-pack-migration-design.md) |
| [D3 Runners](../../docs/sceneforge/2026-06-17-sceneforge-runners-design.md) |
| [D4 差距清单](../../docs/sceneforge/2026-06-17-sceneforge-phase2-gap-analysis.md) |
| [实施计划](../../docs/superpowers/plans/2026-06-17-sceneforge-phase2-implementation-plan.md) |

## Issues 13–21（实现顺序）

| # | 要点 | 状态 |
|---|------|------|
| 13 | context-policy loader | 本地完成 |
| 14 | SceneContextBuilder | 本地完成 |
| 15 | handoff on approve | 本地完成 |
| 16 | MCP/IPC runner + selectedAssetIds | 本地完成 |
| 17 | P0 stage packs | 本地完成 |
| 18 | direct_llm + prompt renderer | 本地完成 |
| 19 | sceneRunStage + acp MVP | 本地完成 |
| 20 | Studio StageRunPanel | 本地完成 · **待你 Electron 点验** |
| 21 | 回归 + handoff 文档 | 本地完成 |

## 验证命令

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```

## 未完成（P2，不阻塞 core 生成）

- 支撑链全阶段 Studio + pack（intake…assets）
- script pack 与 storyboard script 上下文
- ACP 完整会话循环（当前 acp MVP 为 briefing）
- 项目级 style 选择器 UI、`scene_start_stage` 自动推进链、ZIP 导出

详见 [D4](../../docs/sceneforge/2026-06-17-sceneforge-phase2-gap-analysis.md)。