# Remix STT/ASR 接入与字幕产物格式设计

> 版本：v1.0  
> 日期：2026-06-26  
> 适用范围：Remix 原片理解 M1 / M1.5、video-import 可复用层、本地 `local_tts_stt` 方案迁移  
> 关联：`.scratch/sceneforge-remix-source-understanding/DESIGN_ARCHIVE.md`、`prd/01-audio-asr-foundation.md`、`prd/01b-imported-srt-transcript-fast-path.md`

---

## 1. 现状与缺口

### 1.1 本仓库已有能力

| 能力 | 位置 | 输出 |
|------|------|------|
| Bcut 云端 ASR | `electron/video-import/bcut-asr.ts` | `TranscriptResult`: `segments[{text,startMs,endMs}]`, `srtText`, `fullText`, `engine: bcut` |
| 写盘 | `electron/video-import/transcript-writer.ts` | `transcript.srt` + `transcript.md`（导入目录） |
| SRT 解析/序列化 | `src/lib/srt-parser.ts` | `SrtEntry[]` ↔ SRT 文本 |
| Remix 导入字段 | `remix-source-asset-service` | `transcriptPath`, `srtPath`（仅路径，未规范化到 Remix 目录） |

### 1.2 本地 Whisper（ggml-small）— **内嵌到 lingji-creator**

| 项 | 说明 |
|----|------|
| **集成方式** | Electron/Node **subprocess** 调用仓库内 `tools/local-stt/whisper/main`，**不**依赖 `local_tts_stt` 的 HTTP 服务 |
| 模型 | **ggml-small.bin**（与你在 `local_tts_stt` 里用的小模型一致，仅**拷贝二进制+权重**作参考来源） |
| 参考仓库 | `/Users/tangwujun/Documents/trae_projects/local_tts_stt`（实现思路、prompt、OpenCC 繁→简可借鉴） |
| 输出要求 | 必须带时间轴：`-osrt` 或 `-oj` 解析 utterances，禁止只要纯文本 |

**明确不做**：把 Remix STT 设计成「连 127.0.0.1:23879 /stt」；那是旧实验形态，不是本产品路径。

### 1.3 Remix PRD 层缺口（本轮补齐）

- 统一 **Remix 侧** canonical JSON（非仅 import 目录里的 md/srt）
- STT **Provider 抽象**（bcut / local_whisper / imported）
- 明确 **字幕三件套**：`source_transcript.json` + `.srt` + `.md`
- 明确 **分段产物** `segment_transcript.json` 与对齐算法
- 本地小模型 **迁移与配置** 路径

---

## 2. 设计目标

1. **一种 utterance 模型**：无论 Bcut、Whisper、导入 SRT，最终都变成同一 `TranscriptUtterance[]`。
2. **一种全片契约**：`RemixSourceTranscriptDocument` 落盘在 source asset 目录下，供 M2 理解只读 JSON。
3. **字幕文件可人工编辑**：标准 SRT 与 JSON 双向可重建（解析失败可降级仅 SRT）。
4. **本地内嵌优先**：默认 `local_whisper_cpp` 随应用分发或 `tools/local-stt` + 环境变量；云端 Bcut 仅作可选 fallback。
5. **与 video-import 解耦**：import 仍可 bcut；Remix 管线独立 `RemixSttService`，避免 Creation 链路被 Remix 绑死。

---

## 3. STT Provider 架构

```text
RemixAsrOrchestrator (electron/sceneforge/remix/)
  ├─ resolveTranscriptPlan(sourceAsset) → imported | local_whisper | bcut | none
  ├─ RemixTranscriptIngestionService     (M1.5 读 srt/md)
  ├─ RemixSttProviderRegistry
  │    ├─ imported_srt (ingestion only)
  │    ├─ local_whisper_cpp
  │    └─ bcut (复用 transcribeWithBcut)
  └─ RemixTranscriptWriter + SegmentTranscriptAligner
```

### 3.1 Provider 接口（实现决策）

```ts
// 概念类型 — 落地时放入 remix transcript 模块
type RemixSttEngine = 'imported_srt' | 'local_whisper_cpp' | 'bcut';

interface RemixSttTranscribeInput {
  sourceAssetId: string;
  projectDir: string;
  audioPath: string;          // 16k mono wav 或 mp3，由上游抽取
  durationMs: number;
  language?: 'zh' | 'auto';
}

interface RemixSttTranscribeResult {
  engine: RemixSttEngine;
  language: string;
  utterances: TranscriptUtterance[];
  plainText: string;
  srtText: string;
  raw?: unknown;              // 可选保留 whisper json / bcut payload
}

interface TranscriptUtterance {
  id: string;                 // utt_001 稳定生成
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
  speaker?: string | null;    // MVP null
}
```

与现有 `TranscriptSegment`（video-import）字段一致，Remix 层可 `map` 并补 `id`。

### 3.2 引擎选择策略（`resolveTranscriptPlan`）

| 优先级 | 条件 | 引擎 | mode 字段 |
|--------|------|------|-----------|
| 1 | `hasAudio` 且本地 whisper 二进制+模型可用 | `local_whisper_cpp` | `local_whisper_cpp` |
| 2 | 本地失败且配置允许 | `bcut` | `full_source_asr` |
| 3 | 无音轨 | — | `no_audio` |
| *边缘* | 极少数：导入已带可读 SRT 且用户未点「重新识别」 | ingestion | `imported_srt` |

默认 **不走** SRT 导入快路径；实现可保留 ingestion 代码，但不作为主线验收。

配置建议：

```json
{
  "remix": {
    "stt": {
      "preferredEngine": "local_whisper_cpp",
      "whisperBin": "",
      "whisperModel": "",
      "allowBcutFallback": false
    }
  }
}
```

空 `whisperBin` 时解析顺序：打包 `resources/local-stt/whisper/` → 仓库 `tools/local-stt/whisper/` → 环境变量 `REMIX_WHISPER_BIN` / `REMIX_WHISPER_MODEL`。

---

## 4. 本地 Whisper 内嵌（ggml-small）

### 4.1 视频 vs 音频：必须先抽音频

**结论（产品默认路径）**：

```text
source.mp4  ──ffmpeg──►  source_audio.wav（16kHz, mono, pcm_s16le）
                              │
                              └── whisper.cpp main -m ggml-small.bin -f source_audio.wav -osrt/-oj …
```

| 问题 | 答案 |
|------|------|
| 能否直接把 **整段视频** 丢给 whisper.cpp？ | **技术上** whisper.cpp 支持 flac/mp3/ogg/wav 等，部分构建也可对容器做解码，但 **Remix 不采用**「整片 mp4 直喂」作为默认管线。 |
| 为什么？ | 长视频占内存与解码时间；与「分段音频、单段重跑 ASR」架构不一致；抽一次全片 wav 可复用给分段切分。 |
| 分段要不要各自再 STT？ | **MVP 否**：全片 wav **一次** whisper → 得到带时间轴的 utterances → **按 segment 时间对齐** 切到各段。仅当某段对齐质量极差时再 **单段 wav 重跑**（补救）。 |

与 issue **02-audio-extraction** 的关系：抽音频是 STT 的**硬前置**，不是可选项。

### 4.2 从 `local_tts_stt` 迁移什么

| 迁移 | 不迁移 |
|------|--------|
| `models/whisper/main`、`ggml-small.bin` | FastAPI、`POST /stt`、端口 23879 |
| ffmpeg 16k mono 预处理 | Edge-TTS 部分 |
| 中文 prompt + OpenCC 繁→简 | 纯文本无时间轴返回 |

目录：

```text
lingji-creator/tools/local-stt/whisper/
  main
  ggml-small.bin
```

（大二进制是否入 git 由发布策略决定；见 `tools/local-stt/README.md`。）

### 4.3 调用方式（MVP 唯一）

Remix 主进程 `RemixLocalWhisperProvider`：

1. 校验 `source_audio.wav` 存在（由音频抽取步骤生成）。
2. `spawn(main, [-m, model, -f, wav, -l, zh, -osrt, -of, outPrefix, ...])`。
3. 解析 `.srt` 或 JSON → `TranscriptUtterance[]`。
4. OpenCC 繁→简（与参考实现一致）。
5. 写入 `transcripts/source_transcript.{json,srt,md}`。

**不要**在 MVP 再开 HTTP 子服务；后续若要做，也仅是内部实现细节，对外仍是 Provider 接口。

### 4.4 输出 JSON（相对旧版 voice_service）### 4.5 STT 响应结构（进程内，非 HTTP）

当前：

```json
{ "text": "整段纯文本", "status": "success" }
```

目标（Remix 消费）：

```json
{
  "status": "success",
  "engine": "local_whisper_cpp",
  "language": "zh",
  "plainText": "……",
  "utterances": [
    { "text": "第一句", "startMs": 420, "endMs": 2900, "confidence": 0.91 }
  ],
  "srtText": "1\n00:00:00,420 --> 00:00:02,900\n第一句\n\n"
}
```

实现要点（whisper.cpp）：

```bash
main -m ggml-small.bin -f audio.wav -l zh -osrt -of /tmp/out
# 或 -oj / -ojf 解析 segments[].timestamps
```

繁简：保持 OpenCC `t2s`（与现服务一致）。  
无语音：`utterances.length === 0` → `quality.hasSpeech = false`。

### 4.3 与 Bcut 并存

- `video-import` 默认 **不改**（仍 bcut），避免回归抖音导入。
- Remix `runSourceAsr` **单独**走 `RemixSttProviderRegistry`，默认优先 local（可配置），bcut 作 fallback。

---

## 5. 产物路径与文件格式（Canonical）

根：`sceneforge/remix/source-assets/<sourceAssetId>/`

| 文件 | 用途 |
|------|------|
| `audio/source_audio.wav` | 全片 16k mono（ASR 输入） |
| `audio/source_audio.json` | 抽取元数据：durationMs, sampleRate, hasAudio |
| `transcripts/source_transcript.json` | **单一真相源**（utterance 列表） |
| `transcripts/source_transcript.srt` | 人工可编辑字幕 |
| `transcripts/source_transcript.md` | 阅读用；**非** M2 机器读入 |
| `source_segments/<segmentId>/audio/segment_audio.wav` | 分段音频（回听/单段重跑） |
| `source_segments/<segmentId>/transcripts/segment_transcript.json` | 分段对齐结果 |

> 注：若与现有 `analysis/` 并存，以 **transcripts/** 为台词专用；`analysis/` 保留理解 rollup（M3）。

### 5.1 `source_transcript.json` Schema（version 1）

```json
{
  "schema": "sceneforge-remix-source-transcript",
  "version": 1,
  "sourceAssetId": "source-xxx",
  "language": "zh",
  "engine": "local_whisper_cpp",
  "mode": "full_source_asr",
  "generatedAt": "2026-06-26T12:00:00.000Z",
  "durationMs": 124320,
  "inputRefs": {
    "audioPath": "audio/source_audio.wav",
    "importSrtPath": null,
    "importMarkdownPath": null
  },
  "inputHash": {
    "audioSha256": "…",
    "promptVersion": "remix-stt-v1"
  },
  "quality": {
    "hasSpeech": true,
    "utteranceCount": 42,
    "avgConfidence": 0.88,
    "needsReview": false,
    "warnings": []
  },
  "utterances": [
    {
      "id": "utt_001",
      "text": "这里是台词",
      "startMs": 420,
      "endMs": 2900,
      "confidence": 0.91,
      "speaker": null
    }
  ],
  "plainText": "按行拼接 utterances.text",
  "srtPath": "transcripts/source_transcript.srt"
}
```

**规则**

- `startMs`/`endMs`：相对 **源视频时间轴**（与 `SourceSegment.timeRange` 同一坐标系）。
- `plainText`：utterances 按时间排序后用 `\n` 连接（与 bcut fullText 一致）。
- `mode`：`imported_srt` | `full_source_asr` | `segment_asr_rerun` | `no_audio`。

### 5.2 `source_transcript.srt` 格式

- 标准 SubRip（与 `serializeSrtEntries` / `parseSrt` 一致）。
- 每 cue 一条 utterance（MVP 不强制按字级拆分）。
- 时间格式：`HH:MM:SS,mmm --> HH:MM:SS,mmm`。
- 文本：UTF-8，允许多行（同 utterance 内 `\n`）。

示例：

```srt
1
00:00:00,420 --> 00:00:02,900
这里是第一句

2
00:00:03,100 --> 00:00:06,800
第二句对白
```

### 5.3 `source_transcript.md` 格式（人类可读）

```markdown
# Source Transcript

- Source Asset: source-xxx
- Engine: local_whisper_cpp
- Generated: 2026-06-26

## 全文

（plainText 或分段小标题）

## 分段索引（可选）

- [00:00.42 - 00:02.90] 这里是第一句
```

**M2 LLM 禁止只读 md**；必须以 JSON utterances 为准。

### 5.4 `segment_transcript.json` Schema（version 1）

```json
{
  "schema": "sceneforge-remix-segment-transcript",
  "version": 1,
  "segmentId": "seg-001",
  "sourceAssetId": "source-xxx",
  "timeRange": {
    "sourceStartMs": 0,
    "sourceEndMs": 10400,
    "durationMs": 10400
  },
  "source": "aligned_from_source_transcript",
  "sourceTranscriptPath": "transcripts/source_transcript.json",
  "utterances": [
    {
      "sourceUtteranceId": "utt_001",
      "text": "落在此段内的文本",
      "sourceStartMs": 1200,
      "sourceEndMs": 3800,
      "relativeStartMs": 1200,
      "relativeEndMs": 3800,
      "confidence": 0.91
    }
  ],
  "plainText": "本段台词合并",
  "quality": {
    "hasSpeech": true,
    "avgConfidence": 0.91,
    "needsReview": false
  }
}
```

### 5.5 分段对齐算法（单一实现）

输入：`utterances[]`，segment `[sourceStartMs, sourceEndMs)`（半开区间建议：`start <= t < end`）。

对每个 utterance，取与区间 **时间交集** 长度最大的归属段；交集不足阈值（如 100ms）可丢弃或标 `needsReview`。

跨段 utterance：**MVP 按中心点 ` (startMs+endMs)/2 ` 归属**（与 PRD 设计稿一致，简单可测）。

输出：每段 `plainText` = 段内 utterances 文本按时间拼接。

---

## 6. 管线步骤（Remix 资产处理）

```text
runSourceAudioExtraction
  → audio/source_audio.wav + segment_audio.wav

runSourceTranscript (新 IPC，或合入 understanding 前置)
  → resolveTranscriptPlan
  → ingestion | local_whisper | bcut
  → write source_transcript.{json,srt,md}
  → align → segment_transcript.json × N
  → update processingStageStates.remix_asr (建议新增子阶段，或记入 remix_understanding 依赖)

runSourceUnderstanding (M2)
  → 每段读 segment_transcript + keyframes → LLM
```

**阶段状态建议**

| 阶段 ID | 依赖产物 |
|---------|----------|
| `remix_audio`（可选显式） | source_audio + segment_audio |
| `remix_transcript` | source_transcript.json + 全 segment_transcript |
| `remix_understanding` | segment understanding JSON |

MVP 可将 audio+transcript 合并为一张 issue 链，但 **JSON 契约先定**。

---

## 7. 测试要点

| 用例 | 断言 |
|------|------|
| 解析样例 SRT | utterances 数量、首尾时间 |
| Whisper mock JSON | → source_transcript.json + srt 往返 parse |
| 对齐 | 两 utterance、两 segment 边界 → 正确 plainText |
| 导入快路径 | 有 srtPath 不调用 bcut/whisper |
| 无音轨 | mode=no_audio，理解侧标记无台词 |

---

## 8. 实施票映射（更新）

| Issue | 本设计章节 |
|-------|------------|
| 02-audio-extraction | §6 audio |
| 03b-imported-srt | §3.2 优先级 1、§5 |
| 03-asr | §3、§4、§5.1–5.2 |
| **03c（建议新增）** | §4 本地 whisper 迁移 + subprocess/HTTP segments |
| 04-understanding | 消费 §5.4 |

---

## 9. 变更日志

| 日期 | 说明 |
|------|------|
| 2026-06-26 | 初版：STT 接入、local_tts_stt 差距、canonical JSON/SRT/MD、对齐算法 |
