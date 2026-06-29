# 08-2 SenseVoice GGUF Provider 实施计划

日期：2026-06-29

## 问题理解

在 `08-1` 已经补齐 ASR 类型和 provider 选择器的前提下，本阶段需要实现一个独立的 `SenseVoiceSmall GGUF` 本地 provider，用于对单个 segment 音频执行转写，并返回文本、标签、原始输出与告警信息。

本阶段不接入 `RemixTranscriptService` 主流程，不改默认转写策略，只把 provider 层做完整、可测试、可复用。

## 改动范围

- 新增 `electron/sceneforge/remix/remix-sensevoice-gguf-provider.ts`
- 扩展 `electron/sceneforge/remix/remix-asr-types.ts`
- 新增 `tests/sceneforge-remix-sensevoice-provider.test.ts`

## 风险点

1. `llama-funasr-sensevoice` 输出不是 JSON，而是 tag + text 混合文本，解析要兼容：
   - 多段 VAD 输出
   - 无 tag 输出
   - 仅空白输出
2. Provider 需要和现有 `whisper` 一样兼容源码态 / `dist-electron` 打包态的资源寻址。
3. 超时、非零退出码、stderr 告警要做成稳定错误语义，避免后续主流程很难诊断。

## 设计决策

### 1. 资源解析

按设计文档约定解析：

- Binary：
  - `REMIX_FUNASR_SENSEVOICE_BIN`
  - `tools/local-stt/funasr/llama-funasr-sensevoice`
  - `resources/local-stt/funasr/llama-funasr-sensevoice`
  - `.scratch/funasr-sensevoice-spike/llama-funasr-sensevoice`
- Model：
  - `REMIX_FUNASR_SENSEVOICE_MODEL`
  - `tools/local-stt/funasr/sensevoice-small-f16.gguf`
  - `resources/local-stt/funasr/sensevoice-small-f16.gguf`
- VAD：
  - `REMIX_FUNASR_VAD_MODEL`
  - `tools/local-stt/funasr/fsmn-vad.gguf`
  - `resources/local-stt/funasr/fsmn-vad.gguf`

### 2. Provider 接口

新增 `RemixSegmentAsrProvider` / `RemixSegmentAsrResult` / `RemixSenseVoiceTags` 类型，并在 provider 中实现：

- `probeAvailability()`
- `transcribeSegmentAudio(...)`

### 3. 解析与返回

- 支持解析 `<|zh|><|NEUTRAL|><|Speech|><|woitn|>文本`
- 多段输出合并为单个 segment 的 `text`
- 保留：
  - `rawOutput`
  - `stderr`
  - `warnings`
- 若没有 tag，则降级为纯文本

### 4. 异常路径

- 空 stdout：抛明确错误
- 非零退出码：抛包含退出码和 stderr 的错误
- timeout：抛超时错误

## 验证方式

1. `npx vitest run tests/sceneforge-remix-sensevoice-provider.test.ts`
2. `npx tsc --noEmit`
3. 若相关测试受影响，再补跑：
   - `npx vitest run tests/sceneforge-remix-whisper-provider.test.ts`

## 预期结果

- 可以独立探测 SenseVoice binary/model 是否可用
- 可以对单个 segment 音频返回结构化片段级 ASR 结果
- 解析和异常处理有稳定单测覆盖
