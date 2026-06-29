Status: ready-for-agent

# SceneForge Remix Source Understanding 执行顺序

**Issue 总索引（含分叉检索）：[`ISSUE_INDEX.md`](ISSUE_INDEX.md)**

## 批次

| 顺序 | Issue | 模块 | 说明 |
|------|-------|------|------|
| 1 | [01](issues/01-stage-truth-gate-and-validator.md) | M0 | 门禁 |
| 2 | [02](issues/02-audio-extraction-and-segment-cache.md) | M1 | 抽音频 |
| 3 | [03c](issues/03c-local-whisper-stt-provider.md) | M1 | ★主线 STT |
| 3′ | [03](issues/03-asr-full-source-and-segment-alignment.md) | M1 | Bcut 可选 |
| 3″ | [03b](issues/03b-imported-srt-transcript-fast-path.md) | M1.5 | 边缘可延后 |
| 4 | [04](issues/04-segment-understanding-balanced-mvp.md) | M2 | 片段 LLM |
| 5 | [05](issues/05-source-understanding-rollup-and-artifacts.md) | M3 | rollup |
| 6 | [06](issues/06-understanding-workbench-and-annotation-prefill.md) | M4 | UI |
| 7 | [07](issues/07-source-understanding-orchestrator.md) | 编排 | 一键 A→B→05 |
| 8 | [08-1](issues/08-1-asr-types-and-provider-resolver.md) | SenseVoice | ASR 类型与 Resolver |
| 9 | [08-2](issues/08-2-sensevoice-gguf-provider.md) | SenseVoice | GGUF Provider |
| 10 | [08-3](issues/08-3-segment-transcript-service.md) | SenseVoice | Segment transcript v2 |
| 11 | [08-4](issues/08-4-remix-transcript-service-default-switch.md) | SenseVoice | 默认切换与 fallback |
| 12 | [08-5](issues/08-5-workbench-export-correction-compat.md) | SenseVoice | Workbench / Export / Correction |
| 13 | [08-6](issues/08-6-tests-and-docs.md) | SenseVoice | 测试与文档 |

## 主线

`01 → 02 → 03c → 04 → 05 → 06`，**07** 在 03c/04/05 就绪后挂接「生成原片理解」。

SenseVoice 第一阶段建议顺序：

`08-1 → 08-2 → 08-3 → 08-4 → 08-5 → 08-6`

## 并行

- 01 ∥ 02 可并行；04 前须 01 合并。  
- 03c ∥ 03/03b 仅共享 schema/aligner 代码，产品验收走 03c。
- 08-1 可独立起步；08-2 依赖 08-1；08-3 依赖 08-1/08-2；08-4 依赖 08-1/08-2/08-3；08-5 依赖 08-3/08-4；08-6 最后收口。

## 完成标志

见 ISSUE_INDEX §5；编排见 issue 07。
