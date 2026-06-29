Status: ready-for-agent

# SceneForge Remix 原片理解 — Issue 总索引（检索入口）

> **从本文件可跳到所有分叉 issue、模块 PRD、详设。**  
> 上级入口：[`PRD.md`](PRD.md) · [`EXECUTION_ORDER.md`](EXECUTION_ORDER.md) · [`DESIGN_ARCHIVE.md`](DESIGN_ARCHIVE.md)

---

## 1. 分叉树（主线 vs 边缘）

```text
01 门禁 M0
 └─ 02 抽音频 M1
      ├─ 03c 内嵌 whisper ★主线 STT
      ├─ 03  Bcut fallback（可选）
      └─ 03b 导入 SRT（边缘/可延后）
           └─ [对齐器] segment_transcript × N
                └─ 04 片段 LLM M2
                     ├─ 05 rollup M3
                     ├─ 06 工作台 UI M4
                     └─ 07 一键编排（串联 A→B→05）

SenseVoice 扩展分支
  └─ 08-1 ASR 类型与 Provider 抽象
      └─ 08-2 SenseVoice GGUF Provider
          └─ 08-3 Segment Transcript Service
              └─ 08-4 RemixTranscriptService 默认切换
                  └─ 08-5 Workbench / Export / Correction 兼容
                      └─ 08-6 测试与文档
```

★ 默认产品路径：**02 → 03c → 对齐 → 04 → 05**；用户通过 **07** 一次点击触发。

---

## 2. Issue 一览（可检索表）

| ID | 文件 | 标题 | 模块 | 类型 | 阻塞于 | 关键词 |
|----|------|------|------|------|--------|--------|

| **01** | [`issues/01-stage-truth-gate-and-validator.md`](issues/01-stage-truth-gate-and-validator.md) | 原片理解阶段真实性门禁与校验 | M0 | AFK | 无 | validator, stale, approved, 假完成 |
| **02** | [`issues/02-audio-extraction-and-segment-cache.md`](issues/02-audio-extraction-and-segment-cache.md) | 全片与分段音频抽取缓存 | M1 | AFK | 01（建议） | ffmpeg, source_audio, segment_audio |
| **03b** | [`issues/03b-imported-srt-transcript-fast-path.md`](issues/03b-imported-srt-transcript-fast-path.md) | 导入 SRT 字幕快路径（边缘） | M1.5 | AFK | 02 | imported_srt, ingestion, 边缘 |
| **03** | [`issues/03-asr-full-source-and-segment-alignment.md`](issues/03-asr-full-source-and-segment-alignment.md) | 全片 ASR 与分段对齐（Bcut 可选） | M1 | AFK | 02 | bcut, fallback, align |
| **03c** | [`issues/03c-local-whisper-stt-provider.md`](issues/03c-local-whisper-stt-provider.md) | 内嵌 Whisper ggml-small + 时间轴 | M1 | AFK | 02 | whisper, subprocess, ggml-small, STT |
| **04** | [`issues/04-segment-understanding-balanced-mvp.md`](issues/04-segment-understanding-balanced-mvp.md) | 片段级结构化理解（Balanced） | M2 | AFK | 01, 03c | LLM, segment_understanding, videoPrompt |
| **05** | [`issues/05-source-understanding-rollup-and-artifacts.md`](issues/05-source-understanding-rollup-and-artifacts.md) | 全片理解汇总与 Artifact 契约 | M3 | AFK | 04 | rollup, source_overview |
| **06** | [`issues/06-understanding-workbench-and-annotation-prefill.md`](issues/06-understanding-workbench-and-annotation-prefill.md) | 理解工作台与标注预填 | M4 | AFK | 05 | UI, segment card, copy prompt |
| **07** | [`issues/07-source-understanding-orchestrator.md`](issues/07-source-understanding-orchestrator.md) | 一键编排 Transcript→LLM→Rollup | 编排 | AFK | 01,02,03c,04,05 | orchestrator, job, progress, concurrency |
| **08-1** | [`issues/08-1-asr-types-and-provider-resolver.md`](issues/08-1-asr-types-and-provider-resolver.md) | SenseVoice 接入：ASR 类型与 Provider Resolver | SenseVoice | AFK | 无 | resolver, engine, timestampLevel, fallback |
| **08-2** | [`issues/08-2-sensevoice-gguf-provider.md`](issues/08-2-sensevoice-gguf-provider.md) | SenseVoiceSmall GGUF Provider | SenseVoice | AFK | 08-1 | provider, parser, tags, timeout |
| **08-3** | [`issues/08-3-segment-transcript-service.md`](issues/08-3-segment-transcript-service.md) | SenseVoice Segment Transcript Service | SenseVoice | AFK | 08-1,08-2 | segment transcript, manifest, v2 |
| **08-4** | [`issues/08-4-remix-transcript-service-default-switch.md`](issues/08-4-remix-transcript-service-default-switch.md) | RemixTranscriptService 默认切换到 SenseVoice 优先 | SenseVoice | AFK | 08-1,08-2,08-3 | auto, fallback, whisper, aggregate |
| **08-5** | [`issues/08-5-workbench-export-correction-compat.md`](issues/08-5-workbench-export-correction-compat.md) | Workbench / Export / Correction 对 SenseVoice 兼容 | SenseVoice | AFK | 08-3,08-4 | workbench, export, correction, stale |
| **08-6** | [`issues/08-6-tests-and-docs.md`](issues/08-6-tests-and-docs.md) | SenseVoice 测试与文档收口 | SenseVoice | AFK | 08-1,08-2,08-3,08-4,08-5 | tests, docs, fallback |

---

## 3. 模块 PRD 索引

| 模块 | 文件 |
|------|------|
| M0 | [`prd/00-stage-truth-gate.md`](prd/00-stage-truth-gate.md) |
| M1 | [`prd/01-audio-asr-foundation.md`](prd/01-audio-asr-foundation.md) |
| M1.5 边缘 | [`prd/01b-imported-srt-transcript-fast-path.md`](prd/01b-imported-srt-transcript-fast-path.md) |
| M2 | [`prd/02-segment-understanding-generation.md`](prd/02-segment-understanding-generation.md) |
| M3 | [`prd/03-source-understanding-rollup.md`](prd/03-source-understanding-rollup.md) |
| M4 | [`prd/04-understanding-workbench-and-annotation.md`](prd/04-understanding-workbench-and-annotation.md) |

---

## 4. 详设文档（docs/sceneforge-remix）

| 文档 | 内容 |
|------|------|
| [source-understanding-design-and-implementation-plan.md](../../docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md) | 迁入完整设计 Phase 0–6 |
| [remix-stt-asr-integration-and-transcript-formats.md](../../docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md) | 内嵌 whisper、JSON/SRT、对齐 |
| [remix-understanding-orchestration-and-ui.md](../../docs/sceneforge-remix/remix-understanding-orchestration-and-ui.md) | ASR/理解分离、UI、并发、job progress |

---

## 5. 推荐执行顺序（简）

`01` → `02` → `03c` → `04` → `05` → `06`；`07` 在 03c+04+05 能力就绪后接入按钮。  
SenseVoice 第一阶段：`08-1` → `08-2` → `08-3` → `08-4` → `08-5` → `08-6`。  
边缘：`03b`、`03` 非主线验收。

完整表见 [`EXECUTION_ORDER.md`](EXECUTION_ORDER.md)。

---

## 6. 检索提示（grep / agent）

- STT / whisper / 音频：`02`, `03c`, `remix-stt-asr`
- 台词对齐 / transcript：`03c`, `03`, `03b`
- LLM / 片段理解：`04`
- 进度条 / 卡片 / UI：`06`, `orchestration-and-ui`
- 一键生成 / job：`07`, `orchestration`
- 假完成 / stale：`01`
- SenseVoice / provider / segment_range：`08-1` ~ `08-6`, `sensevoice-asr-integration`
