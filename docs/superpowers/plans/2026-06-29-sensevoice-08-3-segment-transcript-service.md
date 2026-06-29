# 08-3 SenseVoice Segment Transcript Service 实施计划

日期：2026-06-29

## 问题理解

`08-2` 已经有可独立运行的 SenseVoice provider，但还没有把它落成面向 Remix 项目的批量片段转写服务。本阶段目标是：

- 遍历已有 `segmentAudioPath` 的片段
- 调用 SenseVoice provider
- 写出 `segment transcript v2`
- 更新 `segment_manifest.json` 与 `source_manifest.json`

本阶段不切换默认 transcript 主流程，只构建独立 service，给 `08-4` 做接入准备。

## 改动范围

- 新增 `electron/sceneforge/remix/remix-segment-transcript-service.ts`
- 扩展 `electron/sceneforge/remix/remix-transcript-types.ts`
- 新增 `tests/sceneforge-remix-segment-transcript-sensevoice.test.ts`

## 风险点

1. 当前 `segment transcript` 结构默认是 Whisper 对齐产物，需要向下兼容已有消费者。
2. 单个 segment 转写失败不能中断整个批处理，需要把失败落成 warning 文档。
3. 没有 `segmentAudioPath` 的 segment 要明确 skip，但不能误删已有 transcriptPath。

## 设计决策

### 1. Segment Transcript V2

- `version` 扩为 `1 | 2`
- `source` 扩为：
  - `aligned_from_source_transcript`
  - `segment_audio_sensevoice_gguf`
- 新增可选字段：
  - `segmentAudioPath`
  - `rawText`
  - `quality.warnings`
  - `utterances[].tags`

### 2. 失败策略

若单个 segment ASR 失败：

- 仍写出 `segment_transcript.json`
- `plainText=''`
- `quality.hasSpeech=false`
- `quality.needsReview=true`
- `quality.warnings` 写入错误信息
- 继续处理下一个 segment

### 3. Skip 策略

若 segment 没有 `segmentAudioPath`：

- 不调用 provider
- 不强制写 transcript 文件
- 保留 manifest 原状

## 验证方式

1. `npx vitest run tests/sceneforge-remix-segment-transcript-sensevoice.test.ts`
2. `npx tsc --noEmit`
3. 如有需要，补跑：
   - `npx vitest run tests/sceneforge-remix-transcript.test.ts`
   - `npx vitest run tests/sceneforge-remix-understanding-workbench.test.ts`

## 预期结果

- SenseVoice segment transcript service 可独立运行
- 成功 / skipped / partial failure 三类路径都有稳定单测覆盖
- 后续 `08-4` 只需要做 provider 选择与主流程接线
