# Handoff - SenseVoiceSmall GGUF ASR 默认接入设计

> 日期：2026-06-29  
> 分支：`sceneforge2.0-remix`  
> 仓库：`twj515895394/lingji-creator`  
> 主题：SceneForge Remix 原片理解 V2 / SenseVoiceSmall GGUF 片段级 ASR 默认接入  
> 当前目标：基于已完成 Spike 与设计文档，后续生成实施计划并进入代码实现。

---

## 1. 当前上下文状态

本 handoff 记录的是围绕 **SenseVoiceSmall GGUF ASR 接入 SceneForge Remix** 的设计决策、现状、边界和后续实施建议。

用户当前诉求已经从“是否能生成精准 SRT”调整为：

```text
暂时不要求精准 SRT 时间戳，也不要求生成带时间戳的字幕文件；
只需要知道某个视频片段范围内大概说了什么台词。
```

因此当前方案的定位已经明确：

```text
SenseVoiceSmall GGUF = 默认优先的片段级 ASR 文本 Provider
Whisper.cpp = 精准 SRT / fallback Provider
```

第一阶段不要把 SenseVoice 伪装成精准字幕能力。它只负责：

```text
segment audio wav -> 片段范围内的台词文本 plainText
```

而不是：

```text
source audio wav -> 精准句级 / 词级 SRT
```

---

## 2. 关键提交与文档路径

### 2.1 Spike 测试提交

用户已同步本地与远程 `sceneforge2.0-remix` 到：

```text
9e25f43 feat(remix): implement sensevoice small gguf ASR spike test and report
```

该提交中新增/更新了 SenseVoice Spike 相关内容，包括：

```text
.scratch/funasr-sensevoice-spike/spike.test.ts
.scratch/funasr-sensevoice-spike/spike-report.md
.scratch/funasr-sensevoice-spike/download-funasr-model.sh
.scratch/funasr-sensevoice-spike/README.md
.gitignore
```

注意：当前 `.scratch/funasr-sensevoice-spike/README.md` 是 FunASR upstream `runtime/llama.cpp` README 内容，不是最早写的中文 Spike 方案文档。当前真正有价值的 Spike 结论主要在：

```text
.scratch/funasr-sensevoice-spike/spike-report.md
.scratch/funasr-sensevoice-spike/spike.test.ts
```

### 2.2 设计文档提交

已新增详细设计方案：

```text
docs/sceneforge-remix/sensevoice-asr-integration-design.md
```

提交：

```text
13012af105af0d148814eeb85f017a95a0f8429d docs(remix): add sensevoice asr integration design
```

该文档是后续生成实施计划的主要依据。

### 2.3 本 handoff 文件

当前 handoff 文件：

```text
.handoff/handoff-20260629-sensevoice-asr-integration.md
```

---

## 3. Spike 测试结论摘要

### 3.1 本地测试环境

Spike 报告中记录的本地路径：

```text
Binary Path: /Users/tangwujun/Documents/trae_projects/lingji-creator/.scratch/funasr-sensevoice-spike/llama-funasr-sensevoice
Model Path: /Users/tangwujun/Downloads/sensevoice-small-f16.gguf
VAD Model Path: /Users/tangwujun/Downloads/fsmn-vad.gguf
Test Audio: /Users/tangwujun/Downloads/Roy1.wav
```

### 3.2 测试结果

无 VAD：

```text
Transcription Duration: 11572 ms
Parsed Utterances: 1
Detected Language: zh
Detected Emotion: NEUTRAL
Detected Event: Speech
```

开启 FSMN-VAD：

```text
Transcription Duration: 4368 ms
VAD Segment Count: 24
Parsed Utterances: 24
```

本地测试结论：

1. `llama-funasr-sensevoice` 可在 macOS arm64 运行。
2. `sensevoice-small-f16.gguf` 可以识别中文口播。
3. `--keep-tags` 可以输出并解析类似 `<|zh|><|NEUTRAL|><|Speech|><|woitn|>` 的标签。
4. `fsmn-vad.gguf` 可以将长音频切成多段输出。
5. 当前输出可以解析为 `{ text, tags }`。
6. 当前输出还没有 `startMs/endMs`，不能直接生成精准 SRT。

### 3.3 关键边界

当前 SenseVoice Spike 的 parsed utterance 类型大致是：

```ts
interface SenseVoiceUtterance {
  text: string;
  tags: {
    language?: string;
    emotion?: string;
    event?: string;
    itn?: string;
  };
}
```

没有：

```ts
startMs: number;
endMs: number;
```

因此它暂时只能做“片段台词文本”，不能做“精准字幕时间轴”。

---

## 4. 已达成的核心设计决策

### 4.1 默认优先使用 SenseVoice

用户明确要求：“默认优先使用该方案的 ASR”。

因此默认 ASR 优先级设计为：

```text
1. funasr_sensevoice_gguf segment ASR
2. local_whisper_cpp source ASR fallback
3. no_audio / failed
```

但默认优先使用 SenseVoice 的前提是：

```text
SenseVoice binary + model 可用。
```

如果不可用，应自动降级到 Whisper，不能直接失败。

### 4.2 SenseVoice 第一阶段只做片段级台词

第一阶段的核心输入是已经抽取好的 `segmentAudioPath`。

流程为：

```text
RemixAudioExtractionService
  -> 每个 segment 已经有 16k mono wav
  -> SenseVoice 对每个 segment wav 单独转写
  -> 生成 segment transcript plainText
```

不要第一阶段直接做：

```text
sourceAudioPath -> SenseVoice 全片 ASR -> source SRT
```

原因：当前 SenseVoice 输出没有精准时间戳，全片转写无法可靠对齐到视频片段。

### 4.3 Whisper 保留为 SRT 与 fallback

Whisper 仍保留两个用途：

1. 需要精准 SRT 时继续使用 Whisper.cpp；
2. SenseVoice 不可用时 fallback。

后续 UI/文档中必须明确：

```text
SenseVoiceSmall 当前用于片段级台词识别，不生成精准 SRT 字幕。
```

### 4.4 时间戳能力必须显式标记

为避免误解，所有 SenseVoice 片段 transcript 应标记：

```ts
timestampLevel: 'segment_range'
canGenerateAccurateSrt: false
```

含义：

```text
该文本属于整个视频片段范围，不代表句级或词级字幕时间戳。
```

---

## 5. 需要重点阅读的设计文档

后续实施前，必须先完整阅读：

```text
docs/sceneforge-remix/sensevoice-asr-integration-design.md
```

该文档已经包含：

1. 背景与动机；
2. 第一阶段目标与非目标；
3. 当前代码链路分析；
4. 总体架构图；
5. ASR Provider 抽象设计；
6. 数据结构改造设计；
7. 文件路径与产物设计；
8. SenseVoice Provider 命令行调用与输出解析；
9. RemixTranscriptService 改造设计；
10. 默认优先级与环境变量；
11. UI / Workbench / Report Export 影响；
12. 测试设计；
13. 风险与规避；
14. 分阶段实施建议；
15. 验收标准。

这是后续拆实施计划的主文档。

---

## 6. 当前相关代码入口

### 6.1 音频抽取

当前已有音频抽取服务：

```text
electron/sceneforge/remix/remix-audio-extraction-service.ts
```

关键能力：

- 抽取全片 source wav；
- 抽取每个 segment 的 wav；
- 音频格式为 `16kHz / mono / pcm_s16le / wav`；
- 每个 segment 会记录 `segmentAudioPath`。

SenseVoice 第一阶段应优先复用这个能力，不新增切片逻辑。

### 6.2 当前 Transcript Service

当前主服务：

```text
electron/sceneforge/remix/remix-transcript-service.ts
```

当前流程：

```text
sourceAudioPath
  -> RemixLocalWhisperProvider.transcribeAudio()
  -> utterances + srtText
  -> source transcript json
  -> source srt
  -> alignUtterancesToSegments()
  -> segment transcript json
```

SenseVoice 不应直接替换这条全片 Whisper SRT 路径，而是新增一个“片段级 ASR 路径”。

### 6.3 Whisper Provider

当前 provider：

```text
electron/sceneforge/remix/remix-whisper-provider.ts
```

当前能力：

- 调用 whisper.cpp binary；
- 输出 `.srt`；
- 从 SRT 解析 utterances；
- `buildSrtFromUtterances()` 使用 `startMs/endMs/text` 生成 SRT。

SenseVoice 第一阶段没有 `startMs/endMs`，因此不应复用这个 SRT 生成语义，除非明确是“片段级粗字幕”。

### 6.4 Transcript 类型

当前类型：

```text
electron/sceneforge/remix/remix-transcript-types.ts
```

当前 `RemixTranscriptUtterance` 强依赖：

```ts
id: string;
text: string;
startMs: number;
endMs: number;
```

后续需要扩展：

```ts
engine: 'funasr_sensevoice_gguf' | ...
mode: 'segment_audio_asr' | ...
timestampLevel?: 'segment_range' | 'vad_segment' | 'sentence' | 'word' | 'none'
```

---

## 7. 推荐新增/修改文件

设计文档建议新增：

```text
electron/sceneforge/remix/remix-asr-types.ts
electron/sceneforge/remix/remix-asr-provider-resolver.ts
electron/sceneforge/remix/remix-sensevoice-gguf-provider.ts
electron/sceneforge/remix/remix-segment-transcript-service.ts
```

### 7.1 `remix-asr-types.ts`

职责：统一 ASR engine、timestampLevel、capabilities、provider result 类型。

建议包含：

```ts
export type RemixAsrEngine =
  | 'funasr_sensevoice_gguf'
  | 'local_whisper_cpp'
  | 'bcut'
  | 'imported_srt'
  | 'no_audio';

export type RemixAsrTimestampLevel =
  | 'none'
  | 'segment_range'
  | 'vad_segment'
  | 'sentence'
  | 'word';
```

### 7.2 `remix-sensevoice-gguf-provider.ts`

职责：

- 解析 binary/model/vad model 路径；
- spawn `llama-funasr-sensevoice`；
- 支持 `--keep-tags`；
- 可选长片段使用 `--vad`；
- parse stdout；
- 返回 `text + tags + rawOutput + warnings`。

### 7.3 `remix-asr-provider-resolver.ts`

职责：根据环境变量和资源可用性选择 ASR plan。

默认：

```text
REMIX_STT_ENGINE=auto 或未设置
  -> SenseVoice 可用则 SenseVoice
  -> 否则 Whisper
```

支持：

```text
REMIX_STT_ENGINE=funasr_sensevoice_gguf
REMIX_STT_ENGINE=local_whisper_cpp
```

### 7.4 `remix-segment-transcript-service.ts`

职责：

- 遍历 sourceAsset.segments；
- 读取每个 segment 的 `segmentAudioPath`；
- 调 SenseVoice provider；
- 写 `segment transcript v2`；
- 写回 segment manifest；
- 单个片段失败不影响后续片段。

---

## 8. 关键数据结构建议

### 8.1 Segment Transcript V2

建议扩展为：

```ts
export interface RemixSegmentTranscriptDocumentV2 {
  schema: 'sceneforge-remix-segment-transcript';
  version: 2;
  segmentId: string;
  sourceAssetId: string;
  timeRange: {
    sourceStartMs: number;
    sourceEndMs: number;
    durationMs: number;
  };
  source:
    | 'aligned_from_source_transcript'
    | 'segment_audio_sensevoice_gguf';
  engine?: RemixAsrEngine;
  mode?: RemixTranscriptMode;
  timestampLevel?: RemixAsrTimestampLevel;
  sourceTranscriptPath?: string;
  segmentAudioPath?: string | null;
  utterances: Array<{
    sourceUtteranceId: string;
    text: string;
    sourceStartMs: number;
    sourceEndMs: number;
    relativeStartMs: number;
    relativeEndMs: number;
    confidence?: number | null;
    tags?: RemixSenseVoiceTags;
  }>;
  plainText: string;
  rawText?: string;
  quality: {
    hasSpeech: boolean;
    avgConfidence: number | null;
    needsReview: boolean;
    warnings?: string[];
  };
}
```

### 8.2 SenseVoice Segment Utterance

第一阶段的 utterance 使用整个 segment 的时间范围：

```ts
{
  sourceUtteranceId: `sensevoice_${segmentId}_001`,
  text: parsedText,
  sourceStartMs: segment.timeRange.startMs,
  sourceEndMs: segment.timeRange.endMs,
  relativeStartMs: 0,
  relativeEndMs: segment.timeRange.durationMs,
  confidence: null,
  tags,
}
```

注意：这是 `segment_range`，不是精准句级时间戳。

### 8.3 Source Transcript Aggregate

可从所有 segment transcripts 聚合生成 source transcript：

```ts
plainText = segmentTranscripts
  .filter(item => item.quality.hasSpeech)
  .map(item => `[${item.segmentId}] ${item.plainText}`)
  .join('\n');
```

source utterances 也可以按 segment 范围构造，但必须标记：

```ts
timestampLevel: 'segment_range'
canGenerateAccurateSrt: false
srtStatus: 'not_generated'
```

---

## 9. 环境变量与资源解析

### 9.1 ASR 引擎选择

```bash
# 默认 auto，SenseVoice 优先，Whisper fallback
REMIX_STT_ENGINE=auto

# 强制 SenseVoice
REMIX_STT_ENGINE=funasr_sensevoice_gguf

# 强制 Whisper
REMIX_STT_ENGINE=local_whisper_cpp
```

### 9.2 SenseVoice 资源路径

```bash
REMIX_FUNASR_SENSEVOICE_BIN=/path/to/llama-funasr-sensevoice
REMIX_FUNASR_SENSEVOICE_MODEL=/path/to/sensevoice-small-f16.gguf
REMIX_FUNASR_VAD_MODEL=/path/to/fsmn-vad.gguf
```

Spike 本机路径仅供开发参考，不应写死进正式代码：

```text
/Users/tangwujun/Downloads/sensevoice-small-f16.gguf
/Users/tangwujun/Downloads/fsmn-vad.gguf
```

### 9.3 建议解析顺序

Binary：

```text
1. REMIX_FUNASR_SENSEVOICE_BIN
2. tools/local-stt/funasr/llama-funasr-sensevoice
3. resources/local-stt/funasr/llama-funasr-sensevoice
4. .scratch/funasr-sensevoice-spike/llama-funasr-sensevoice（开发模式）
```

Model：

```text
1. REMIX_FUNASR_SENSEVOICE_MODEL
2. tools/local-stt/funasr/sensevoice-small-f16.gguf
3. resources/local-stt/funasr/sensevoice-small-f16.gguf
```

VAD model：

```text
1. REMIX_FUNASR_VAD_MODEL
2. tools/local-stt/funasr/fsmn-vad.gguf
3. resources/local-stt/funasr/fsmn-vad.gguf
```

---

## 10. SenseVoice 命令调用设计

### 10.1 普通片段

```bash
llama-funasr-sensevoice \
  -m sensevoice-small-f16.gguf \
  -a segment.wav \
  --keep-tags
```

### 10.2 长片段可选 VAD

```bash
llama-funasr-sensevoice \
  -m sensevoice-small-f16.gguf \
  -a segment.wav \
  --vad fsmn-vad.gguf \
  --keep-tags
```

建议规则：

```ts
const shouldUseVad = segmentDurationMs > 20_000 && vadModelAvailable;
```

即使使用 VAD，第一阶段也只把多段文本合并到当前 segment 的 `plainText`。不要把它当精准字幕时间戳。

---

## 11. 输出解析逻辑

Spike 中已有解析逻辑，可迁移到正式 provider：

```ts
const segmentRegex = /((?:<\|[^>]+\|>)+)([^<]*)/g;
const tagRegex = /<\|([^>|]+)\|>/g;
```

Tag 映射：

```text
zh / en / ja / ko / yue -> language
NEUTRAL / HAPPY / ANGRY / SAD -> emotion
Speech / Sing / Laughter / Crying -> event
woitn / itn -> itn
```

如果 stdout 中没有 tag：

```text
把 stdout 清洗后作为纯文本，tags = {}
```

文本清洗第一版要保守：

```ts
text.replace(/\s+/g, ' ').trim()
```

不要自动做复杂文本纠错，例如不要强行把 `n b a` 改为 `NBA`。后续可以交给 LLM 校正层或人工校对层。

---

## 12. RemixTranscriptService 改造路径

### 12.1 伪代码

```ts
async run(projectDir: string, sourceAssetId: string) {
  const document = await readStoredSourceAsset(projectDir, sourceAssetId);

  if (!hasAudio) {
    return writeNoAudioTranscript();
  }

  const plan = await resolveRemixAsrPlan();

  if (plan.kind === 'sensevoice_segment_first') {
    try {
      const segmentTranscripts = await segmentTranscriptService.runSenseVoiceSegments(
        projectDir,
        document,
      );
      const sourceTranscript = buildSourceTranscriptAggregate(segmentTranscripts);
      await writeSourceTranscriptJsonAndMd(sourceTranscript);
      await updateStoredSourceAsset(document);
      return document;
    } catch (error) {
      if (plan.fallbackProvider) {
        return runWhisperSourceTranscriptFlow();
      }
      throw error;
    }
  }

  return runWhisperSourceTranscriptFlow();
}
```

### 12.2 注意事项

1. SenseVoice 单个 segment 失败，不应导致整个 flow 失败。
2. SenseVoice provider 初始化失败，才走 Whisper fallback。
3. `REMIX_STT_ENGINE=funasr_sensevoice_gguf` 强制 SenseVoice 时，如果资源缺失，应报明确错误，不要静默 fallback，方便开发调试。
4. `REMIX_STT_ENGINE=auto` 时可以静默 fallback。
5. Whisper 原有 source SRT 生成逻辑不要破坏。

---

## 13. UI / Workbench / Export 影响

### 13.1 Workbench

片段卡片中应优先展示：

```text
segmentTranscript.plainText
```

并显示来源：

```text
ASR: SenseVoice / 片段级
```

### 13.2 台词校对

校对层需要知道：

```text
来源：SenseVoice 片段识别
时间范围：当前视频片段
时间戳级别：segment_range
非精准 SRT 字幕
```

用户修正后仍应触发 understanding stale 机制。

### 13.3 Report Export

报告中应标注：

```text
ASR Engine: funasr_sensevoice_gguf
Timestamp Level: segment_range
Accurate SRT: No
```

不要在报告中暗示它提供精准字幕。

---

## 14. 后续实施计划建议

下一步可以基于设计文档拆正式 issue 或 task。推荐拆法：

### Issue 08-1：ASR 类型与 Provider 抽象

产物：

```text
remix-asr-types.ts
remix-asr-provider-resolver.ts
```

验收：

- 类型可表达 engine/mode/timestampLevel/capabilities；
- resolver 支持 auto / forced SenseVoice / forced Whisper；
- 资源缺失 fallback 逻辑明确。

### Issue 08-2：SenseVoice GGUF Provider

产物：

```text
remix-sensevoice-gguf-provider.ts
```

验收：

- 支持 spawn binary；
- 支持 parse tags；
- 支持 empty/no-tag stdout；
- 支持 timeout；
- 支持 rawOutput/stderr/warnings；
- 单测覆盖。

### Issue 08-3：Segment Transcript Service

产物：

```text
remix-segment-transcript-service.ts
```

验收：

- 遍历 segment audio；
- 写 segment transcript v2；
- 失败 segment 写 warning；
- 无音频 segment skipped；
- 更新 segment manifest。

### Issue 08-4：RemixTranscriptService 默认切换

产物：

```text
RemixTranscriptService 改造
source transcript aggregate
fallback Whisper
```

验收：

- 默认 auto 优先 SenseVoice；
- SenseVoice 不可用 fallback Whisper；
- 强制 Whisper 可用；
- 强制 SenseVoice 缺资源时报错；
- 不覆盖精准 SRT。

### Issue 08-5：Workbench / Export / Correction 兼容

产物：

```text
UnderstandingWorkbenchPanel 读取 SenseVoice 片段台词
Report Export 标注 ASR 来源
Correction stale 兼容 segment transcript v2
```

验收：

- UI 展示台词与来源；
- report 标明 timestampLevel；
- 修正台词后 understanding stale 生效。

### Issue 08-6：测试与文档

产物：

```text
tests/sceneforge-remix-sensevoice-provider.test.ts
tests/sceneforge-remix-asr-provider-resolver.test.ts
tests/sceneforge-remix-segment-transcript-sensevoice.test.ts
```

验收：

- parser、resolver、segment transcript、fallback 都有覆盖；
- docs 更新开发运行方法；
- handoff 与设计文档保持一致。

---

## 15. 后续 VAD 时间戳升级方向

当前第一阶段不做精准 SRT。但已确认后续可以继续研究：

1. 独立 `llama-funasr-vad` 输出 `[start_ms,end_ms]`；
2. patch `llama-funasr-sensevoice` 增加 `--jsonl`；
3. 每个 VAD segment 输出 `{ startMs, endMs, text, tags }`；
4. 将 `timestampLevel` 从 `segment_range` 升级到 `vad_segment`；
5. 支持粗粒度 SRT；
6. 对过长字幕做二次切分。

该方向不是当前第一阶段阻塞项。

---

## 16. 风险提醒

### 16.1 不要混淆“片段范围”与“字幕时间戳”

这是最重要的风险。

SenseVoice 第一阶段生成的是：

```text
当前视频片段范围内的台词
```

不是：

```text
每一句台词的精准出现时间
```

因此所有数据、UI、导出都必须标记清楚。

### 16.2 每片段 spawn 可能有性能开销

第一阶段为了简单稳定，建议串行执行。后续如性能不够，再考虑：

- 并发 2；
- binary 批处理；
- patch 支持 file list；
- 长片段使用 VAD。

### 16.3 模型打包体积

`sensevoice-small-f16.gguf` 是数百 MB 级别。第一阶段可以用本地路径，后续需要设计：

- 模型下载器；
- 完整性校验；
- 自定义模型路径；
- 各平台 binary 分发。

### 16.4 一句话跨 segment 会被切断

因为第一阶段对 segment wav 独立识别，如果一句话跨越两个视频片段，文本可能被切开。

可接受，因为当前目标是片段理解。后续可考虑：

- segment audio 前后 padding 300ms；
- VAD source-level transcript；
- LLM 台词修复。

---

## 17. 建议给下一个 Agent / Codex 的开场指令

可以这样启动下一轮开发：

```text
请阅读 docs/sceneforge-remix/sensevoice-asr-integration-design.md 和 .handoff/handoff-20260629-sensevoice-asr-integration.md，基于设计文档为 SenseVoiceSmall GGUF 默认片段级 ASR 接入生成实施计划。注意第一阶段不做精准 SRT，只做 segment_range 台词文本；默认 SenseVoice 优先，Whisper fallback。
```

如果要直接进入代码实现，可以这样说：

```text
请基于 docs/sceneforge-remix/sensevoice-asr-integration-design.md 实施 Phase 1：ASR 类型、Provider Resolver、SenseVoice GGUF Provider 与 parser 单测。不要改 UI，不要生成精准 SRT。
```

---

## 18. 最终共识

当前项目的 ASR 演进方向为：

```text
短期：SenseVoiceSmall GGUF 默认片段级台词识别，提升中文文本质量。
中期：Whisper 保留为精准 SRT/fallback。
长期：SenseVoice 增加 VAD JSON 时间戳，升级为 vad_segment 级字幕能力。
```

第一阶段的产品表达必须保持克制：

```text
这是“片段级台词识别”，不是“精准字幕生成”。
```

后续所有实施计划都应围绕这个边界展开。
