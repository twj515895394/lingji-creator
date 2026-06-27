Status: ready-for-agent

# M1.5：导入已有字幕 / SRT 快路径（免全片 ASR）

## 问题陈述

Remix 创建 Source Asset 时，经 video-import 的素材往往已带有 `transcriptPath` / `srtPath`。若仍强制走全片 bcut ASR，会重复耗时、重复成本，且可能与用户已校对字幕不一致。

## 解决方案

在 M1 音频基座之上，增加 **Transcript Ingestion** 分支：当导入链路已提供合格 SRT/VTT 时，规范化写入 Remix 全片 transcript 契约，并复用与 M1 相同的 **按 segment 时间对齐** 逻辑生成分段 transcript；仅当缺失、不可读、时间轴不可信或用户显式要求时，才回退全片 ASR。

## 用户故事

1. 作为从抖音/本地导入的用户，我想沿用已有字幕进入原片理解，以便不再等一轮 ASR。
2. 作为资产处理用户，我想在 UI/任务日志里看到「使用导入字幕」还是「已重新 ASR」，以便知道台词来源。
3. 作为开发者，我想 SRT 与 ASR 两条路径产出同一 `source_transcript` schema，以便 M2 只消费一种契约。
4. 作为资产处理用户，我想在字幕明显错位时能强制重跑 ASR，以便不带着错误台词生成理解。
5. 作为资产处理用户，我想更换源视频后旧字幕自动标记 stale，以便不会静默用错台词。

## 实现决策

### 触发条件（满足才可走快路径）

- `sourceAsset.transcriptPath` 或 `srtPath` 非空且文件可读。
- 解析后至少一条带时间戳的 utterance；时间轴落在 `[0, durationMs]` 可容差范围内。
- 可选质量门槛：非空文本占比、最大断档（MVP 可用启发式，不做人审）。

### 规范化契约

- 全片产物统一为 Remix `source_transcript.json`（与 ASR 路径字段一致：`items[]` 含 start/end/text/confidence，`plainText`，`provider`，`mode`）。
- `mode` 取值示例：`imported_srt` | `full_source_asr` | `segment_asr_rerun`。
- 记录 `sourceRefs`：`importTranscriptPath` / `importSrtPath` / `ingestedAt` / `inputHash`。

### 与分段对齐的关系

- **不**因走快路径而跳过分段 transcript：仍执行 M1 的 segment 对齐，写入每段 `segment_transcript.json`（或等价路径）。
- 分段音频（M1 issue 02）仍建议生成：供回听、单段 ASR 重跑、后续 audio_features；快路径仅跳过 **全片 ASR 调用**。

### 回退与 stale

- 解析失败、utterance 为空、时间轴严重越界 → 自动回退 `full_source_asr`（若 hasAudio）。
- 用户操作「强制重新 ASR」→ 覆盖 `mode`，旧 import hash 作废。
- 源视频 duration 变化或重新导入字幕 → `asr`/`understanding` 阶段标记 stale（与 M0 联动）。

### 模块边界

- **RemixTranscriptIngestionService**（建议名）：parse SRT/VTT/md、normalize、write source_transcript、触发 segment aligner。
- **RemixAsrService**：仅负责需要声学识别的路径。
- 对齐器单一：ingestion 与 ASR 输出都进入同一 align 函数。

## 测试决策

- 单元：样例 SRT → `source_transcript` items 数量与时间；越界 SRT 触发回退标记。
- 单元：同一 utterance 轴 + segment 边界 → 与 M1 issue 03 对齐结果一致。
- 集成：createFromImport 带 mock transcriptPath → 无 bcut 调用、分段 transcript 落盘。
- 先例：`video-import-service.test.ts`、`bcut-asr` 解析测试。

## 超出范围

- 导入链路本身生成字幕（属 video-import）
- LLM 校对字幕
- 多语言自动检测（MVP 默认 zh 或跟随 import 元数据）

## 进一步说明

- 父 PRD：`.scratch/sceneforge-remix-source-understanding/PRD.md`
- 姊妹模块：`prd/01-audio-asr-foundation.md`（全片 ASR 慢路径）
- 设计留档：`DESIGN_ARCHIVE.md` § M1.5
