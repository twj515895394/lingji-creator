# SceneForge Remix SenseVoiceSmall GGUF ASR 接入开发设计方案

> 文档状态：设计方案  
> 所属模块：SceneForge Remix / 原片理解 V2 / ASR 与台词文本链路  
> 目标分支：`sceneforge2.0-remix`  
> 关联 Spike：`.scratch/funasr-sensevoice-spike/`  
> 关联测试提交：`9e25f43 feat(remix): implement sensevoice small gguf ASR spike test and report`

## 1. 结论先行

本方案决定将 **SenseVoiceSmall GGUF** 作为 Remix 原片理解流程的默认优先 ASR 引擎，用于生成“片段级台词文本”。

第一阶段不承诺生成精准 SRT，不承诺句级或词级时间戳。第一阶段目标是：

```text
视频片段范围 segment.timeRange
  + segment audio wav
  -> SenseVoiceSmall GGUF ASR
  -> 该片段范围内的台词文本 plainText
  -> 片段理解 / 原片理解 / 台词校对 / Rollup / Prompt 生成
```

也就是说，第一版关注：

```text
这个片段里大概说了什么台词
```

不关注：

```text
每一句台词从第几秒开始、到第几秒结束
```

默认策略：

1. 如果 SenseVoiceSmall GGUF binary 和模型可用，则优先使用 SenseVoiceSmall 生成片段级台词。
2. 如果 SenseVoiceSmall 不可用、执行失败或片段无音频，则自动降级到现有 Whisper.cpp 全片 ASR + 对齐流程。
3. 精准 SRT 仍然由现有 Whisper.cpp 链路保留；SenseVoice 第一阶段不得标记为精准字幕生成能力。
4. 后续如果完成 VAD 时间戳 JSON 输出，再升级为 `vad_segment` 级时间戳 Provider。

## 2. 背景与动机

当前 Remix 原片理解链路中，ASR 主要基于本地 Whisper.cpp。现有链路优点是稳定、能输出 SRT、能生成带 `startMs/endMs` 的 utterances；但在中文素材中容易出现同音词、错别字、英文/中文混排错误、断句不自然等问题。这些问题会继续污染：

- 片段理解输入；
- 片段卡片中的台词摘要；
- 台词校对层；
- 全片 Story Rollup；
- 二创 Prompt 中的 dialogue / sound / story 维度。

本地 Spike 已验证 SenseVoiceSmall GGUF 在 macOS arm64 上可以运行，并具备以下特点：

- 可以通过本地 `llama-funasr-sensevoice` binary 运行；
- 使用 `sensevoice-small-f16.gguf` 模型；
- 支持 `--keep-tags` 输出语言、情绪、事件、ITN 等标签；
- 开启 `fsmn-vad.gguf` 后可以将音频切成多段文本；
- 本地样本 `Roy1.wav` 中，无 VAD 约 11.5s，开启 VAD 约 4.3s，速度表现较好；
- VAD 模式可解析出 24 条文本段。

但当前 Spike 也明确暴露了限制：

- 当前输出没有 `startMs/endMs`；
- 不能直接生成精准 SRT；
- 当前 parsed utterance 只有 `text + tags`；
- VAD 段数量可见，但 VAD 段边界时间没有暴露给 Node 层。

因此，本设计将 SenseVoice 第一阶段定位为：

> **片段级 ASR 文本增强 Provider，而不是精准字幕 Provider。**

## 3. 术语说明

| 术语 | 含义 |
| --- | --- |
| Source Transcript | 全片转写文档，当前由 Whisper.cpp 全片 ASR 生成。 |
| Segment Transcript | 单个视频片段的台词文档，当前由全片 utterance 对齐到 segment 得到。 |
| Segment-level Transcript | 使用视频片段自身的 `timeRange` 作为台词范围，不表示句级时间戳。 |
| Accurate SRT | 精确字幕文件，每条字幕需要可靠的 `startMs/endMs`。 |
| SenseVoice Provider | 新增的 GGUF ASR Provider，第一阶段用于片段级文本识别。 |
| Timestamp Level | ASR 输出的时间戳能力级别，如 `none`、`segment_range`、`vad_segment`、`sentence`、`word`。 |
| Spike | 技术预研小实验，当前位于 `.scratch/funasr-sensevoice-spike/`。 |

## 4. 设计目标

### 4.1 第一阶段目标

第一阶段必须实现：

1. 新增 SenseVoiceSmall GGUF ASR Provider。
2. 默认优先使用 SenseVoice 进行片段级 ASR。
3. 复用现有音频抽取阶段生成的 `segmentAudioPath`。
4. 对每个 segment wav 独立执行 SenseVoice。
5. 输出每个 segment 的台词文本。
6. 保存到 segment transcript 文档。
7. 供 Understanding Service、Workbench、Report Export、台词校对使用。
8. SenseVoice 不可用时自动 fallback 到 Whisper。
9. 在元数据中明确标记 `timestampLevel: 'segment_range'`。
10. 不生成或不覆盖精准 SRT。

### 4.2 第一阶段不做

第一阶段不做：

- 不要求 SenseVoice 输出精准 SRT；
- 不要求句级时间戳；
- 不要求词级时间戳；
- 不 patch `llama-funasr-sensevoice` C++ 输出 JSONL；
- 不把 SenseVoice 输出当作全片 SRT 的唯一来源；
- 不移除 Whisper.cpp；
- 不引入 Python FunASR 作为正式依赖；
- 不要求用户手动运行外部服务。

### 4.3 后续目标

后续阶段可以继续扩展：

1. 支持 `llama-funasr-vad` 或 patch 后的 `llama-funasr-sensevoice --jsonl` 输出 VAD 时间戳。
2. 将 `timestampLevel` 从 `segment_range` 升级到 `vad_segment`。
3. 支持粗粒度 SRT。
4. 对过长 VAD 段做标点/字数二次切分。
5. 支持字幕导出质量标识：精准字幕 / 粗字幕 / 片段台词。
6. 支持 UI 设置 ASR 引擎优先级。
7. 支持模型资源打包、下载与完整性校验。

## 5. 当前代码链路分析

### 5.1 现有音频抽取能力

当前 `RemixAudioExtractionService` 已经完成两类音频产物：

1. 全片音频：`sourceAudioPath`；
2. 每个 segment 的片段音频：`segmentAudioPath`。

音频抽取格式为：

```text
16kHz / mono / pcm_s16le / wav
```

这正好符合 SenseVoiceSmall GGUF 的本地识别输入需求。

因此第一阶段无需新增音频切割能力，只需要复用已有 `segment.segmentAudioPath`。

### 5.2 现有 Transcript Service

当前 `RemixTranscriptService` 的主逻辑是：

```text
sourceAudioPath
  -> RemixLocalWhisperProvider.transcribeAudio()
  -> utterances + srtText
  -> source transcript json
  -> source srt
  -> alignUtterancesToSegments()
  -> segment transcript json
```

这个流程适合 Whisper，因为 Whisper 可以输出带时间戳的 SRT。

SenseVoice 第一阶段不适合直接替换这一段，因为它目前没有精准 `startMs/endMs`。如果强行接入全片文本，会导致 SRT 和 segment 对齐都不可靠。

### 5.3 当前 Segment Transcript 文档限制

当前 `RemixSegmentTranscriptDocument` 的 `source` 只有：

```ts
source: 'aligned_from_source_transcript';
```

这表示片段台词只能来源于全片 transcript 的对齐结果。接入 SenseVoice 后，需要新增 source 类型：

```ts
source:
  | 'aligned_from_source_transcript'
  | 'segment_audio_sensevoice_gguf';
```

同时需要能表达时间戳能力：

```ts
timestampLevel?: 'source_utterance' | 'segment_range' | 'vad_segment' | 'sentence' | 'word' | 'none';
```

第一阶段 SenseVoice 使用：

```ts
timestampLevel: 'segment_range'
```

## 6. 总体架构设计

### 6.1 改造前

```text
RemixTranscriptService
  -> RemixLocalWhisperProvider
  -> source transcript
  -> source SRT
  -> alignUtterancesToSegments
  -> segment transcripts
```

### 6.2 改造后

```text
RemixTranscriptService
  -> ASR Engine Resolver
      -> SenseVoiceSmall GGUF Provider（默认优先，片段级）
      -> Whisper.cpp Provider（fallback / SRT / 精准时间戳）

SenseVoice path:
  segments[].segmentAudioPath
    -> RemixSenseVoiceGgufProvider.transcribeSegmentAudio()
    -> segment transcript json
    -> optional source transcript aggregate without accurate SRT

Whisper fallback path:
  sourceAudioPath
    -> RemixLocalWhisperProvider.transcribeAudio()
    -> source transcript json
    -> source SRT
    -> alignUtterancesToSegments()
```

### 6.3 推荐架构图

```text
RemixAudioExtractionService
  ├── source.wav
  └── segments/{segmentId}/audio.wav

RemixTranscriptService
  ├── resolveAsrPlan()
  │     ├── preferred: sensevoice_gguf_segment
  │     └── fallback: local_whisper_cpp_source
  │
  ├── SenseVoiceSegmentTranscriptService
  │     ├── read segmentAudioPath
  │     ├── spawn llama-funasr-sensevoice
  │     ├── parse <|zh|><|NEUTRAL|><|Speech|><|woitn|>
  │     ├── build segment transcript
  │     └── build source transcript aggregate, no accurate SRT
  │
  └── WhisperSourceTranscriptService
        ├── sourceAudioPath
        ├── whisper.cpp SRT
        ├── source transcript
        └── align to segment transcripts
```

## 7. ASR Provider 抽象设计

### 7.1 Provider 能力描述

新增统一 Provider 能力模型：

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

export interface RemixAsrProviderCapabilities {
  engine: RemixAsrEngine;
  mode: 'segment_audio_asr' | 'source_audio_asr' | 'imported_srt' | 'no_audio';
  timestampLevel: RemixAsrTimestampLevel;
  canGenerateAccurateSrt: boolean;
  canProvideSegmentDialogue: boolean;
  supportsTags?: boolean;
  supportsEmotion?: boolean;
  supportsEvent?: boolean;
}
```

SenseVoice 第一阶段能力：

```ts
{
  engine: 'funasr_sensevoice_gguf',
  mode: 'segment_audio_asr',
  timestampLevel: 'segment_range',
  canGenerateAccurateSrt: false,
  canProvideSegmentDialogue: true,
  supportsTags: true,
  supportsEmotion: true,
  supportsEvent: true
}
```

Whisper 当前能力：

```ts
{
  engine: 'local_whisper_cpp',
  mode: 'source_audio_asr',
  timestampLevel: 'sentence',
  canGenerateAccurateSrt: true,
  canProvideSegmentDialogue: true
}
```

### 7.2 Provider 接口

第一阶段建议拆成两个接口，避免把 source ASR 和 segment ASR 混成一个复杂接口。

```ts
export interface RemixSegmentAsrProvider {
  readonly capabilities: RemixAsrProviderCapabilities;

  transcribeSegmentAudio(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
    audioPath: string;
    sourceStartMs: number;
    sourceEndMs: number;
    outputDir: string;
  }): Promise<RemixSegmentAsrResult>;
}

export interface RemixSourceAsrProvider {
  readonly capabilities: RemixAsrProviderCapabilities;

  transcribeSourceAudio(input: {
    projectDir: string;
    sourceAssetId: string;
    audioPath: string;
    outputDir: string;
  }): Promise<RemixSourceAsrResult>;
}
```

### 7.3 Segment ASR Result

```ts
export interface RemixSenseVoiceTags {
  language?: string;
  emotion?: string;
  event?: string;
  itn?: string;
}

export interface RemixSegmentAsrResult {
  engine: 'funasr_sensevoice_gguf';
  mode: 'segment_audio_asr';
  timestampLevel: 'segment_range';
  text: string;
  tags?: RemixSenseVoiceTags;
  rawOutput?: string;
  stderr?: string;
  durationMs: number;
  audioSha256?: string;
  warnings: string[];
}
```

## 8. 数据结构改造设计

### 8.1 Transcript Engine 扩展

当前 source transcript engine 需要扩展：

```ts
engine:
  | 'funasr_sensevoice_gguf'
  | 'local_whisper_cpp'
  | 'bcut'
  | 'imported_srt'
  | 'no_audio';
```

mode 扩展：

```ts
mode:
  | 'segment_audio_asr'
  | 'full_source_asr'
  | 'imported_srt'
  | 'segment_asr_rerun'
  | 'no_audio';
```

### 8.2 Source Transcript 文档扩展

第一阶段 SenseVoice 可以生成一个全片聚合 transcript，但必须明确其不是精准 SRT 来源。

```ts
export interface RemixSourceTranscriptDocument {
  schema: 'sceneforge-remix-source-transcript';
  version: 2;
  sourceAssetId: string;
  language: string;
  engine: RemixAsrEngine;
  mode: RemixTranscriptMode;
  timestampLevel?: RemixAsrTimestampLevel;
  canGenerateAccurateSrt?: boolean;
  generatedAt: string;
  durationMs: number;
  inputRefs: {
    audioPath: string | null;
    segmentAudioPaths?: Record<string, string | null>;
    importSrtPath?: string | null;
    importMarkdownPath?: string | null;
  };
  inputHash?: {
    audioSha256?: string;
    segmentAudioSha256?: Record<string, string>;
    promptVersion?: string;
  };
  quality: {
    hasSpeech: boolean;
    utteranceCount: number;
    avgConfidence: number | null;
    needsReview: boolean;
    warnings: string[];
  };
  utterances: RemixTranscriptUtterance[];
  plainText: string;
  srtPath?: string | null;
  srtStatus?: 'not_generated' | 'accurate' | 'coarse' | 'fallback_whisper';
}
```

SenseVoice 第一阶段 source transcript 推荐：

```ts
{
  engine: 'funasr_sensevoice_gguf',
  mode: 'segment_audio_asr',
  timestampLevel: 'segment_range',
  canGenerateAccurateSrt: false,
  srtPath: null,
  srtStatus: 'not_generated'
}
```

### 8.3 Segment Transcript 文档扩展

推荐将 segment transcript version 升级到 2：

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

SenseVoice 片段台词示例：

```json
{
  "schema": "sceneforge-remix-segment-transcript",
  "version": 2,
  "segmentId": "seg_001",
  "sourceAssetId": "asset_001",
  "timeRange": {
    "sourceStartMs": 12000,
    "sourceEndMs": 18500,
    "durationMs": 6500
  },
  "source": "segment_audio_sensevoice_gguf",
  "engine": "funasr_sensevoice_gguf",
  "mode": "segment_audio_asr",
  "timestampLevel": "segment_range",
  "segmentAudioPath": "sceneforge/remix/source-assets/asset_001/segments/seg_001/audio.wav",
  "utterances": [
    {
      "sourceUtteranceId": "sensevoice_seg_001_001",
      "text": "他曾因学业成绩太差而错过了二零零二年选秀",
      "sourceStartMs": 12000,
      "sourceEndMs": 18500,
      "relativeStartMs": 0,
      "relativeEndMs": 6500,
      "confidence": null,
      "tags": {
        "language": "zh",
        "emotion": "NEUTRAL",
        "event": "Speech",
        "itn": "woitn"
      }
    }
  ],
  "plainText": "他曾因学业成绩太差而错过了二零零二年选秀",
  "quality": {
    "hasSpeech": true,
    "avgConfidence": null,
    "needsReview": true,
    "warnings": [
      "SenseVoice 当前为片段级时间范围，不提供精准 SRT 时间戳"
    ]
  }
}
```

## 9. 文件路径与产物设计

### 9.1 新增 Provider 代码文件

建议新增：

```text
electron/sceneforge/remix/remix-asr-types.ts
electron/sceneforge/remix/remix-asr-provider-resolver.ts
electron/sceneforge/remix/remix-sensevoice-gguf-provider.ts
electron/sceneforge/remix/remix-segment-transcript-service.ts
```

职责：

| 文件 | 职责 |
| --- | --- |
| `remix-asr-types.ts` | 统一定义 ASR engine、timestampLevel、capabilities、result。 |
| `remix-asr-provider-resolver.ts` | 根据配置、环境变量、资源可用性选择默认 ASR Provider。 |
| `remix-sensevoice-gguf-provider.ts` | 封装 `llama-funasr-sensevoice` 调用、输出解析、错误处理。 |
| `remix-segment-transcript-service.ts` | 对 segment audio 批量执行片段级 ASR 并写入 segment transcript。 |

### 9.2 资源路径约定

Spike 当前使用本机路径：

```text
/Users/tangwujun/Downloads/sensevoice-small-f16.gguf
/Users/tangwujun/Downloads/fsmn-vad.gguf
```

正式代码不应写死本机路径。建议支持以下解析顺序：

#### Binary 解析顺序

```text
1. REMIX_FUNASR_SENSEVOICE_BIN
2. tools/local-stt/funasr/llama-funasr-sensevoice
3. resources/local-stt/funasr/llama-funasr-sensevoice
4. .scratch/funasr-sensevoice-spike/llama-funasr-sensevoice（仅开发模式）
```

#### SenseVoice 模型解析顺序

```text
1. REMIX_FUNASR_SENSEVOICE_MODEL
2. tools/local-stt/funasr/sensevoice-small-f16.gguf
3. resources/local-stt/funasr/sensevoice-small-f16.gguf
4. /Users/tangwujun/Downloads/sensevoice-small-f16.gguf（仅开发模式可提示，不建议默认）
```

#### VAD 模型解析顺序

第一阶段 VAD 模型不是必须项，因为我们走 segment audio ASR；但可以保留配置，供后续 VAD 模式使用。

```text
1. REMIX_FUNASR_VAD_MODEL
2. tools/local-stt/funasr/fsmn-vad.gguf
3. resources/local-stt/funasr/fsmn-vad.gguf
4. /Users/tangwujun/Downloads/fsmn-vad.gguf（仅开发模式可提示，不建议默认）
```

### 9.3 Transcript 产物路径

继续复用现有路径：

```text
sceneforge/remix/source-assets/{sourceAssetId}/transcripts/source-transcript.json
sceneforge/remix/source-assets/{sourceAssetId}/transcripts/source-transcript.md
sceneforge/remix/source-assets/{sourceAssetId}/segments/{segmentId}/transcript.json
```

第一阶段建议：

- `source-transcript.json`：聚合所有 segment transcript 的 plainText；
- `source-transcript.md`：展示每个片段的台词文本；
- `source.srt`：不由 SenseVoice 生成；如有旧 Whisper SRT 可保留但标记来源；
- `segment transcript.json`：作为 Understanding 的主要输入。

## 10. SenseVoice Provider 详细设计

### 10.1 命令行调用

第一阶段对每个 segment wav 执行：

```bash
llama-funasr-sensevoice \
  -m sensevoice-small-f16.gguf \
  -a segment.wav \
  --keep-tags
```

是否使用 `--vad`：

- 对较短 segment，默认不加 `--vad`；
- 如果 segment 较长，例如大于 20 秒，可以加 `--vad fsmn-vad.gguf`，但输出仍然没有精准时间戳；
- 开启 `--vad` 后，stdout 可能会解析出多个文本段，最终应合并为当前 segment 的 `plainText`；
- `--vad` 对长片段有助于减少长音频识别异常。

推荐策略：

```ts
const shouldUseVad = segmentDurationMs > 20_000 && vadModelAvailable;
```

### 10.2 输出解析

SenseVoice `--keep-tags` 输出示例：

```text
<|zh|><|NEUTRAL|><|Speech|><|woitn|>他曾因学业成绩太差而错过了二零零二年参加和姚明同届选秀
```

解析逻辑：

```ts
const segmentRegex = /((?:<\|[^>]+\|>)+)([^<]*)/g;
const tagRegex = /<\|([^>|]+)\|>/g;
```

Tag 映射：

| Tag | 字段 |
| --- | --- |
| `zh` / `en` / `ja` / `ko` / `yue` | `language` |
| `NEUTRAL` / `HAPPY` / `ANGRY` / `SAD` | `emotion` |
| `Speech` / `Sing` / `Laughter` / `Crying` | `event` |
| `woitn` / `itn` | `itn` |

如果 stdout 没有 tag，则降级为纯文本：

```ts
{
  text: cleanStdout,
  tags: {}
}
```

### 10.3 文本清洗

需要做最小清洗：

1. 去除首尾空白；
2. 去除多余换行；
3. 合并多个 VAD 段文本；
4. 可选：将连续空格压缩成单空格；
5. 不做激进文本修正；
6. 不自动把 “n b a” 修成 “NBA”，这类应留给后续 LLM 校正或人工修正。

推荐函数：

```ts
function normalizeSenseVoiceText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}
```

中文场景中是否去掉空格要谨慎，因为输出可能包含英文缩写、数字、英文单词。第一版可以保留单空格。

### 10.4 超时与并发

对每个 segment 启动一次 binary 会有进程启动成本，但第一阶段优先实现简单可靠。

建议配置：

```ts
const DEFAULT_SEGMENT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_CONCURRENCY = 1;
```

第一版先串行执行，避免：

- 同时加载多个 GGUF 模型导致内存峰值过高；
- 多进程抢 CPU；
- UI 进度难以管理；
- 错误处理复杂。

后续可优化为：

```ts
maxConcurrency: 2
```

但必须实测内存和速度。

### 10.5 错误处理

单个 segment ASR 失败时不应中断整个资产处理。

推荐策略：

```text
segment ASR 失败
  -> 写入空 transcript
  -> quality.hasSpeech = false
  -> quality.needsReview = true
  -> warnings 包含错误信息
  -> 继续处理下一个 segment
```

如果 SenseVoice Provider 初始化失败，例如 binary/model 不存在：

```text
SenseVoice unavailable
  -> fallback 到 Whisper.cpp 现有链路
```

如果 Whisper 也不可用：

```text
transcript stage failed
  -> 返回明确错误：未配置可用 ASR 引擎
```

## 11. RemixTranscriptService 改造设计

### 11.1 新增 ASR Plan

```ts
export type RemixAsrPlan =
  | {
      kind: 'sensevoice_segment_first';
      provider: RemixSenseVoiceGgufProvider;
      fallbackProvider?: RemixLocalWhisperProvider;
    }
  | {
      kind: 'whisper_source';
      provider: RemixLocalWhisperProvider;
    }
  | {
      kind: 'no_audio';
    };
```

Resolver 逻辑：

```ts
async function resolveRemixAsrPlan(): Promise<RemixAsrPlan> {
  if (process.env.REMIX_STT_ENGINE === 'local_whisper_cpp') {
    return whisperPlan();
  }

  if (process.env.REMIX_STT_ENGINE === 'funasr_sensevoice_gguf') {
    return senseVoicePlanOrThrow();
  }

  // 默认策略：SenseVoice 优先，Whisper fallback
  const senseVoice = await tryResolveSenseVoice();
  if (senseVoice.available) {
    return {
      kind: 'sensevoice_segment_first',
      provider: senseVoice.provider,
      fallbackProvider: await tryResolveWhisperProvider(),
    };
  }

  return whisperPlan();
}
```

### 11.2 SenseVoice 主流程

```text
RemixTranscriptService.run()
  -> readStoredSourceAsset
  -> check audio exists
  -> resolveAsrPlan
  -> if sensevoice_segment_first:
       runSenseVoiceSegmentTranscripts()
       buildSourceTranscriptAggregateFromSegments()
       write source transcript json/md
       do not write accurate source srt
       update segment manifests
     else:
       existing whisper flow
```

### 11.3 Source Transcript 聚合

聚合规则：

```ts
const segmentPlainTexts = segmentTranscripts
  .filter((item) => item.quality.hasSpeech)
  .map((item) => `[${item.segmentId}] ${item.plainText}`);

sourceTranscript.plainText = segmentPlainTexts.join('\n');
```

source utterances 可以用 segment 范围构造：

```ts
const sourceUtterances = segmentTranscripts.map((segmentTranscript, index) => ({
  id: `segutt_${String(index + 1).padStart(3, '0')}`,
  text: segmentTranscript.plainText,
  startMs: segmentTranscript.timeRange.sourceStartMs,
  endMs: segmentTranscript.timeRange.sourceEndMs,
  confidence: null,
  speaker: null,
}));
```

注意：这些 utterances 是 `segment_range`，不是精准句级时间戳。

### 11.4 SRT 策略

第一阶段默认：

```ts
canGenerateAccurateSrt = false;
srtStatus = 'not_generated';
srtPath = null;
```

不建议用 segment_range 直接生成 `.srt`，除非 UI 明确标记为“粗字幕/片段字幕”。

如果为了兼容现有字段必须保留 `srtPath`，可以写一个说明文件：

```text
source.srt not generated because funasr_sensevoice_gguf currently provides segment-level transcript only.
```

更推荐 schema 升级为 `srtPath?: string | null`。

## 12. 默认优先级与配置设计

### 12.1 默认优先级

默认优先级：

```text
1. funasr_sensevoice_gguf segment ASR
2. local_whisper_cpp source ASR
3. no_audio / failed
```

### 12.2 环境变量

```bash
# 可选。默认 auto。auto 表示 SenseVoice 优先，Whisper fallback。
REMIX_STT_ENGINE=auto

# 强制使用 SenseVoice。
REMIX_STT_ENGINE=funasr_sensevoice_gguf

# 强制使用 Whisper。
REMIX_STT_ENGINE=local_whisper_cpp

# SenseVoice binary 和模型。
REMIX_FUNASR_SENSEVOICE_BIN=/path/to/llama-funasr-sensevoice
REMIX_FUNASR_SENSEVOICE_MODEL=/path/to/sensevoice-small-f16.gguf
REMIX_FUNASR_VAD_MODEL=/path/to/fsmn-vad.gguf

# 可选。
REMIX_FUNASR_USE_VAD_FOR_LONG_SEGMENTS=true
REMIX_FUNASR_VAD_MIN_SEGMENT_MS=20000
REMIX_FUNASR_SEGMENT_TIMEOUT_MS=60000
REMIX_FUNASR_MAX_CONCURRENCY=1
```

### 12.3 UI 设置

第一阶段可以不做 UI 设置，先用默认优先级和环境变量。

后续可在设置页加入：

```text
ASR 引擎：
  - 自动：SenseVoice 优先，Whisper fallback
  - SenseVoiceSmall GGUF：片段级台词，非精准字幕
  - Whisper.cpp：支持精准 SRT
```

UI 文案必须明确：

```text
SenseVoiceSmall 当前用于片段级台词识别，不生成精准 SRT 字幕。
```

## 13. UI 与 Workbench 影响

### 13.1 Segment Card 展示

片段卡片中的台词显示优先读取 segment transcript：

```text
segmentTranscript.plainText
```

如果 source 为 `segment_audio_sensevoice_gguf`，显示一个轻量标识：

```text
ASR: SenseVoice / 片段级
```

### 13.2 Transcript Correction

台词校对层应该支持来源标识：

```text
来源：SenseVoice 片段识别
时间范围：00:12.000 - 00:18.500
时间戳级别：片段范围，非句级字幕
```

用户编辑后，校正文本仍然可以触发 understanding stale 机制。

### 13.3 Report Export

导出原片理解报告时：

- 可以展示 SenseVoice 识别台词；
- 标注 ASR engine；
- 标注 timestampLevel；
- 不应宣称提供精准 SRT。

示例：

```md
## 台词识别

- ASR Engine: funasr_sensevoice_gguf
- Timestamp Level: segment_range
- Accurate SRT: No
```

## 14. 与原片理解 V2 的关系

SenseVoice 接入后，片段理解 prompt 应优先使用：

```text
segmentTranscript.plainText
```

如果该字段为空，再使用旧的 dialogue summary 或 source transcript 对齐结果。

理解服务输入建议增加：

```ts
transcriptContext: {
  text: segmentTranscript.plainText;
  source: segmentTranscript.source;
  engine: segmentTranscript.engine;
  timestampLevel: segmentTranscript.timestampLevel;
  needsReview: segmentTranscript.quality.needsReview;
}
```

LLM 提示词中可以描述：

```text
以下台词来自片段级 ASR，时间范围为整个视频片段，不代表句级字幕时间戳。
```

这样能避免模型误解台词时间粒度。

## 15. 测试设计

### 15.1 Unit Tests

新增：

```text
tests/sceneforge-remix-sensevoice-provider.test.ts
tests/sceneforge-remix-asr-provider-resolver.test.ts
tests/sceneforge-remix-segment-transcript-sensevoice.test.ts
```

测试点：

1. 解析 `<|zh|><|NEUTRAL|><|Speech|><|woitn|>` tags；
2. 解析多个 VAD stdout 段；
3. 无 tag 输出 fallback；
4. 空输出处理；
5. binary 不存在时 resolver fallback 到 Whisper；
6. model 不存在时 resolver fallback 到 Whisper；
7. segment ASR 失败只写 warning，不中断全部 segment；
8. segment transcript version 2 schema 校验；
9. source transcript aggregate 生成；
10. `canGenerateAccurateSrt=false` 时不写精准 SRT。

### 15.2 Integration Tests

使用 mock provider：

```ts
new RemixSenseVoiceGgufProvider({
  transcribe: async () => ({
    text: '测试台词',
    tags: { language: 'zh', emotion: 'NEUTRAL', event: 'Speech' },
    durationMs: 123,
    warnings: [],
  }),
});
```

验证：

- RemixTranscriptService 默认走 SenseVoice；
- 每个 segment 写入 transcript；
- source transcript 聚合成功；
- segment manifest 更新成功；
- Workbench 能读取到台词。

### 15.3 Manual QA

真实素材测试：

1. 短视频，单人中文口播；
2. 电影对白，多人对话；
3. 背景音乐较强素材；
4. 无人声素材；
5. 中英混杂素材；
6. 片段长度超过 20 秒素材；
7. 无音轨素材。

观察指标：

| 指标 | 目标 |
| --- | --- |
| 识别质量 | 中文错字明显少于 Whisper |
| 速度 | 不慢于现有流程，最好更快 |
| 稳定性 | 单段失败不影响整体 |
| 片段匹配 | 台词属于当前片段范围 |
| UI 清晰度 | 用户不会误以为这是精准 SRT |
| 回退 | SenseVoice 不可用时 Whisper 能继续工作 |

## 16. 风险与规避

### 16.1 时间戳误解风险

风险：用户误以为 SenseVoice 生成了精准字幕。

规避：

- 数据中标记 `timestampLevel: 'segment_range'`；
- UI 显示“片段级台词”；
- SRT 导出禁用或提示；
- Report 标明 `Accurate SRT: No`。

### 16.2 片段边界不等于说话边界

风险：一句话跨越两个视频片段，会被切断。

规避：

- 第一阶段接受该限制；
- 后续可在 ASR 输入中增加片段前后 padding，例如前后各 300ms；
- 保存时仍只归属当前 segment；
- 更高级方案是 VAD 时间戳 Provider。

### 16.3 进程启动开销

风险：每个 segment 启动一次 binary 导致总耗时增加。

规避：

- 第一版串行，优先稳定；
- 实测如果耗时高，再做进程复用或批处理；
- 长期可 patch binary 支持批量文件列表。

### 16.4 模型打包体积

风险：`sensevoice-small-f16.gguf` 约数百 MB，影响应用体积。

规避：

- 第一阶段本地开发使用外部路径；
- 后续设计模型下载器；
- 应用首次使用时提示下载；
- 支持自定义模型路径。

### 16.5 兼容性风险

风险：macOS 可用，不代表 Windows/Linux 可用。

规避：

- resolver 做平台路径解析；
- binary 不存在时 fallback；
- 后续为各平台准备 binary。

## 17. 实施阶段建议

### Phase 1：Provider 与解析器

目标：新增 SenseVoice provider，可以对单个 wav 输出 text/tags。

产物：

- `remix-asr-types.ts`
- `remix-sensevoice-gguf-provider.ts`
- provider 单测

验收：

- 能 parse Spike 输出；
- 能处理 no tag 输出；
- 能处理错误和超时；
- 不涉及主流程。

### Phase 2：Segment Transcript Service

目标：批量对 segment audio 执行 SenseVoice，写入 segment transcript v2。

产物：

- `remix-segment-transcript-service.ts`
- segment transcript v2 类型
- segment manifest 更新

验收：

- 每个 segment 有 transcript json；
- 失败 segment 有 warnings；
- 无音频 segment 正确 skipped。

### Phase 3：RemixTranscriptService 默认切换

目标：默认优先 SenseVoice，失败 fallback Whisper。

产物：

- `remix-asr-provider-resolver.ts`
- `RemixTranscriptService` 改造
- source transcript aggregate

验收：

- 默认 auto 使用 SenseVoice；
- 缺 binary/model 时 fallback Whisper；
- `REMIX_STT_ENGINE=local_whisper_cpp` 可强制 Whisper；
- `REMIX_STT_ENGINE=funasr_sensevoice_gguf` 可强制 SenseVoice，不可用时报明确错误。

### Phase 4：Workbench / Export / Correction 兼容

目标：前端和导出能识别 SenseVoice 片段台词。

产物：

- Workbench 台词展示；
- Report Export 元数据；
- Correction stale 机制兼容；
- UI 文案说明非精准 SRT。

验收：

- 片段理解优先用 SenseVoice 台词；
- 用户能看到 ASR 来源；
- 不显示精准 SRT 导出承诺。

### Phase 5：后续 VAD 时间戳升级

目标：解决精准/粗粒度 SRT。

可能路径：

1. 引入 `llama-funasr-vad`，将 VAD `[start_ms,end_ms]` 与文本段配对；
2. patch `llama-funasr-sensevoice`，新增 `--jsonl` 输出；
3. 增加 `timestampLevel: 'vad_segment'`；
4. 支持粗 SRT 导出；
5. 支持过长字幕二次切分。

该阶段不是第一阶段必需。

## 18. 验收标准

第一阶段完成后必须满足：

- [ ] 默认优先使用 SenseVoiceSmall GGUF 作为 ASR；
- [ ] SenseVoice 可用时，对每个 segment 生成台词文本；
- [ ] Segment transcript 标记 `engine=funasr_sensevoice_gguf`；
- [ ] Segment transcript 标记 `timestampLevel=segment_range`；
- [ ] Source transcript 可以聚合所有 segment 台词；
- [ ] 不生成或不覆盖精准 SRT；
- [ ] SenseVoice 不可用时 fallback 到 Whisper；
- [ ] Whisper 原有 SRT 能力不被破坏；
- [ ] Understanding Service 优先使用 segment transcript plainText；
- [ ] Workbench 能展示 SenseVoice 台词；
- [ ] Report Export 能标注 ASR 来源与时间戳能力；
- [ ] 所有新增逻辑有单测或 mock integration test 覆盖。

## 19. 推荐实施计划生成依据

后续可基于本设计拆成以下实施任务：

1. 定义 ASR 类型与能力模型。
2. 实现 SenseVoice GGUF Provider。
3. 实现 SenseVoice stdout tag parser。
4. 实现 ASR Provider Resolver。
5. 扩展 transcript schema。
6. 实现 Segment Transcript Service。
7. 改造 RemixTranscriptService 默认策略。
8. 添加 fallback 到 Whisper。
9. 改造 Understanding 输入优先级。
10. 改造 Workbench 台词展示。
11. 改造 Report Export 元数据。
12. 添加测试覆盖。
13. 更新开发文档与使用说明。
14. 单独规划 VAD 时间戳 / SRT 后续升级。

## 20. 最终设计原则

本次接入的核心原则是：

```text
优先提升中文台词文本质量，但不伪装成精准字幕能力。
```

因此第一阶段的正确定位是：

```text
SenseVoiceSmall GGUF = 默认片段级 ASR 文本 Provider
Whisper.cpp = 精准 SRT / fallback Provider
```

后续当 SenseVoice 能稳定输出 `{ text, startMs, endMs }` 后，再升级为正式时间戳 Provider。