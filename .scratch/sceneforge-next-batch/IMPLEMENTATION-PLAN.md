# SceneForge 下一批（优先级 1–5）— 实施计划

> 日期：2026-06-18  
> 前置：`.scratch/sceneforge-studio-mvp-closure/` 已完成  
> 原则：功能与流水线优先，UI 抛光后置

## 文档索引（主项交付三件套）

| 文档 | 路径 |
| --- | --- |
| PRD | [PRD.md](./PRD.md) |
| 详细设计 | [docs/sceneforge/2026-06-18-sceneforge-next-batch-design.md](../../docs/sceneforge/2026-06-18-sceneforge-next-batch-design.md) |
| ADR 附录 | [docs/adr/0002-appendix-production-support-mvp.md](../../docs/adr/0002-appendix-production-support-mvp.md) |
| issues | [issues/06](./issues/06-core-full-chain-mvp-placeholders.md)–[10](./issues/10-ui-debt-backlog.md) |
| handoff | [.handoff/handoff-20260618-next-batch.md](../../.handoff/handoff-20260618-next-batch.md) |

## 优先级总览

| P | 名称 | issues | 设计文档 |
| --- | --- | --- | --- |
| 1 | Core 全链验收 + 占位 | 06 | 本文件 + handoff |
| 2 | 工程收口 | 07 | 无（清单） |
| 3 | 真 AI（Direct LLM 引导） | 08 | 已有 D3 Runner |
| 4 | 制作链支撑 MVP（script/performance/audio） | 09 | ADR-0002 附录 |
| 5 | 体验债（延后实现） | 10 | 轻量 backlog |

## P1 — Core 全链

- storyboard / video_prompts **MVP 占位按钮**（对齐 design）
- Vitest：占位提交后 validate passed
- handoff：**全链 Electron 验收清单**

## P2 — 工程收口

- handoff / Issue 20 勾选
- Phase2 overview HITL 说明更新
- **不**在本 issue 强制 git commit（用户确认后执行）

## P3 — LLM 引导

- `StageRunPanel`：识别 `SCENE_DIRECT_LLM_NO_SETTINGS`，提示前往应用设置配置 LLM
- 文档一句：设置 → AI Provider

## P4 — script / performance / audio

- artifactKey：`script_draft`、`performance_direction`、`audio_design`
- 同 reference 模式：submit + validator + Studio + FlowActions

## P5 — 延后

- Studio 拆 Shell（877 行）
- 侧栏 entryPath 完整文案
- Setup 文案扫描
- gate/intake 卡片 HITL（另开 P1 产品包）

## 验证

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```