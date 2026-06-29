# 08-4 RemixTranscriptService 默认切换实施计划

日期：2026-06-29

## 问题理解

在 `08-1/08-2/08-3` 已完成的前提下，需要把 `RemixTranscriptService` 的默认行为从“始终 Whisper”升级为：

- `auto` 模式优先 SenseVoice
- SenseVoice 不可用时自动回退 Whisper
- 强制 Whisper 保留旧链路
- 强制 SenseVoice 且资源不可用时报清晰错误

## 改动范围

- 修改 `electron/sceneforge/remix/remix-transcript-service.ts`
- 修改 `electron/sceneforge/remix/remix-transcript-types.ts`
- 修改 `electron/sceneforge/remix/remix-whisper-provider.ts`
- 修改 `tests/sceneforge-remix-transcript.test.ts`

## 风险点

1. SenseVoice 路径不生成精准 SRT，必须避免留下“看似可用但其实过期”的 `srtPath`。
2. 旧的 Whisper 对齐逻辑仍然要保留，不能破坏现有 understanding 链路。
3. 自动 fallback 的判断要依赖 provider 可用性探测，错误信息需要可诊断。

## 验证方式

1. `npx vitest run tests/sceneforge-remix-transcript.test.ts`
2. `npx vitest run tests/sceneforge-remix-segment-transcript-sensevoice.test.ts tests/sceneforge-remix-sensevoice-provider.test.ts`
3. `npx tsc --noEmit`

## 预期结果

- 默认本地资源齐全时走 SenseVoice 片段转写
- 资源缺失时无缝回退到 Whisper
- Source transcript 能表达 `segment_audio_asr` 聚合来源
- 不伪造 `source_transcript.srt`
