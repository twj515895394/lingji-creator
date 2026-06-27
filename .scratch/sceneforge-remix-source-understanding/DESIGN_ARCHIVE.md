Status: reference

# SceneForge Remix 原片理解 — 设计留档索引

> 目的：功能点多、链路长，后续改代码或接力 agent 时能快速找回「当时为什么这么设计」。  
> 维护规则：契约变更时同步更新本文件对应章节 + 模块 PRD + `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` 的「仓库对齐说明」。

---

## 0. Issue 总索引

**[`ISSUE_INDEX.md`](ISSUE_INDEX.md)** — 分叉树 + 全表 + 关键词（总览检索入口）

## 1. 文档地图（读什么、何时读）

| 层级 | 路径 | 用途 |
|------|------|------|
| L0 外部详设（迁入） | `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` | 完整产物树、JSON 示例、Phase 0–6、风险 |
| L1.5 STT 接入 | `docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md` | Provider、JSON/SRT/MD、内嵌 whisper |
| L1.6 编排与 UI | `docs/sceneforge-remix/remix-understanding-orchestration-and-ui.md` | ASR vs 理解、进度、并发 |
| L1 总 PRD | `.scratch/sceneforge-remix-source-understanding/PRD.md` | 目标、边界、跨模块决策 |
| L2 模块 PRD | `.scratch/.../prd/00`–`04` + `01b` | 单模块问题/方案/测试 |
| L3 执行票 | `.scratch/.../issues/*` | 垂直切片验收 |
| L4 执行顺序 | `.scratch/.../EXECUTION_ORDER.md` | 批次与并行 |
| 关联 Remix 切片 | `docs/sceneforge-remix/shot-segmentation/` | 上游 clip/关键帧契约 |
| 关联后端模块 | `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-module-design.md` | remix-understanding-service 初版职责 |
| UI 恢复（不重复） | `.scratch/sceneforge-remix-ui-recovery/` | job/预览/切片 UI |

---

## 2. 当前实现差距（2026-06-26 基线）

- `remix-understanding-service`：占位 Markdown/JSON，无 LLM、无 per-segment understanding。
- 阶段状态：写文件即 `approved`，无 schema 门禁（待 M0）。
- 台词：导入可带 `transcriptPath`，Remix 未规范化、未按 segment 对齐（待 M1.5 + M1）。
- 路径：以 `remix-artifact-paths` 为准，非迁入稿 `segments/seg_001/` 示例树。

---

## 3. 台词双路径（M1 + M1.5）— 设计要点

```text
创建 Source Asset
  ├─ 有合格 import SRT/transcript? ──Yes──► M1.5 规范化 source_transcript (mode=imported_srt)
  │                                      └─► 分段对齐 → segment_transcript.*
  └─ No / 无效 ──► M1 全片 ASR (bcut) ──► source_transcript (mode=full_source_asr)
                                        └─► 同一套分段对齐
```

**原则**

1. **一种 schema**：M2 只读 `source_transcript` + `segment_transcript`，不区分来源。
2. **快路径不跳过对齐**：字幕再准也要按 segment 时间切分，避免整片台词堆在一段。
3. **快路径不强制跳过音频抽取**：分段音频仍服务回听与单段 ASR 重跑（issue 02）。
4. **可追溯**：`mode`、`inputHash`、来源路径写入 JSON，便于日志与 stale 判断。

**回退**

| 条件 | 行为 |
|------|------|
| 文件缺失/解析失败 | 回退全片 ASR（hasAudio）或标记无台词 |
| 时间轴越界 | 回退或 `needsReview`（实现时二选一，须在 M1.5 PRD 验收写死） |
| 用户强制重跑 ASR | 忽略 import hash，走 M1 |

---

## 4. 模块依赖图

```text
M0 门禁 ────────────────────────────────┐
M1.5 导入字幕 ──┐                       │
M1 音频抽取 02 ─┼─► M1 对齐 03/03b ────┼─► M2 片段理解 04 ─► M3 rollup 05 ─► M4 UI 06
M1 ASR 03 ──────┘                       │
```

---

## 5. 核心产物契约（MVP，路径以代码为准）

- 全片：`source_transcript.json`（台词）、`source_overview.json`（rollup 索引）
- 每段：`segment_transcript.json`、`segment_understanding.json`
- 音频：`source_audio`、每段 `segment_audio`（路径由 artifact-paths 扩展登记）

详细字段见 L0 详设 §6–§8；落地时以 types + validator 为单一真相源。

---

## 6. 变更日志

| 日期 | 变更 |
|------|------|
| 2026-06-26 | 迁入详设；建立 scratch PRD/issue 包；新增 M1.5 导入 SRT 快路径与 DESIGN_ARCHIVE |


---

## 7. STT / 字幕（补充 2026-06-26）

- 权威格式与 Provider：**`docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`**
- `local_tts_stt` 当前 `/stt` **无时间轴**，Remix 必须走 whisper `-osrt`/JSON 或扩展 `/stt/segments`
- 机器读：**`transcripts/source_transcript.json`**；人工改：**`.srt`**


## 8. 编排与 UI（2026-06-26）

- 全片 whisper **1 次**，片段 LLM **队列 2–4 并发**；见 `remix-understanding-orchestration-and-ui.md`。
