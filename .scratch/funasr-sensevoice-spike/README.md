# SenseVoiceSmall GGUF 最小 Spike 测试方案

> Spike：这里可以理解为“技术预研小实验”或“最小可行性验证”。  
> 目的不是马上改造主流程，而是用最小成本验证 SenseVoiceSmall GGUF 是否值得正式接入 SceneForge Remix 的 ASR 链路。

## 1. 背景

当前 Remix 原片理解流程中，ASR 主要由本地 Whisper.cpp provider 完成。它的优点是本地可运行、集成方式稳定、能输出 SRT；缺点是中文识别经常出现同音词、错别字、断句不准，后续会污染片段理解、台词校对、全片 Rollup 和二创 prompt。

FunASR 的 `runtime/llama.cpp/sensevoice` 路线与 Whisper.cpp 很接近：

```text
Electron 主进程 / Node 脚本
  -> spawn 本地 C++ binary
  -> 输入 wav
  -> 输入 GGUF 模型
  -> 输出识别文本
```

因此它比 Python `funasr` 方案更适合桌面端长期集成。但在正式接入前，需要先验证：

1. 本机能否稳定运行 `llama-funasr-sensevoice`。
2. SenseVoiceSmall 对我们真实视频素材的中文识别效果是否明显好于 Whisper。
3. 输出内容里到底有哪些信息：纯文本、语言标签、情绪标签、事件标签、ITN 标记等。
4. VAD 模式下是否能获得可用的时间切分信息。
5. 如果当前 CLI 无法直接输出结构化时间戳，逐片段 ASR 是否足够满足原片理解阶段。

## 2. 当前本机模型路径

你已经下载好的模型：

```bash
/Users/tangwujun/Downloads/sensevoice-small-f16.gguf
/Users/tangwujun/Downloads/fsmn-vad.gguf
```

建议先不要移动模型，Spike 阶段直接通过环境变量引用这两个路径。

```bash
export REMIX_FUNASR_SENSEVOICE_MODEL="/Users/tangwujun/Downloads/sensevoice-small-f16.gguf"
export REMIX_FUNASR_VAD_MODEL="/Users/tangwujun/Downloads/fsmn-vad.gguf"
```

还需要准备一个可执行文件：

```bash
llama-funasr-sensevoice
```

建议通过以下两种方式之一获得：

1. 从 FunASR / llama.cpp runtime 自行构建。
2. 如果后续 FunASR 提供对应平台的预编译 binary，则直接下载使用。

Spike 阶段先通过环境变量指定 binary 路径：

```bash
export REMIX_FUNASR_SENSEVOICE_BIN="/path/to/llama-funasr-sensevoice"
```

## 3. 为什么文档放在 `.scratch/`

本测试还不是正式产品能力，也不是最终架构设计文档，因此不放到 `docs/`。

目录选择：

```text
.scratch/funasr-sensevoice-spike/
```

原因：

- `.scratch/` 适合放技术预研、实验记录、阶段性验证方案。
- 不污染正式功能目录。
- 测试通过后，再把结论沉淀到 `docs/sceneforge-remix/` 或拆成正式 issue。
- 如果测试失败，也可以保留为评估记录，不影响主线。

## 4. 本次 Spike 的目标

### 4.1 必须回答的问题

1. SenseVoiceSmall GGUF 在当前 Mac 上是否能正常运行？
2. 对中文素材，识别质量是否明显优于当前 Whisper.cpp？
3. 转写速度是否满足资产入库流程？
4. `--keep-tags` 输出中是否包含稳定可解析的语言、情绪、事件、ITN 标签？
5. `--vad fsmn-vad.gguf` 是否能改善长音频识别质量？
6. 当前 CLI 能否直接输出可解析的时间戳？
7. 如果无法直接获得时间戳，逐片段 ASR 是否可接受？

### 4.2 不做的事情

本 Spike 不做：

- 不改 `RemixTranscriptService` 主流程。
- 不替换现有 Whisper.cpp。
- 不做 UI 设置项。
- 不做 Electron 打包方案。
- 不做完整 ASR Provider 抽象。
- 不做正式 tests，只做手工验证和记录。

## 5. 准备测试音频

### 5.1 方式 A：使用项目已提取的全片音频

Remix 资产入库阶段会生成类似路径：

```text
<projectDir>/sceneforge/remix/source-assets/<sourceAssetId>/audio/source.wav
```

实际路径以当前项目生成的 `sourceAudioPath` 为准。

设置：

```bash
export TEST_SOURCE_WAV="/path/to/source.wav"
```

### 5.2 方式 B：使用项目已提取的片段音频

Remix 资产入库阶段也会为每个 segment 生成单独音频。逐片段 ASR 可以用这些文件测试。

设置：

```bash
export TEST_SEGMENT_WAV="/path/to/segment.wav"
```

### 5.3 方式 C：自己临时从视频抽取 wav

如果暂时不想依赖项目产物，可以直接用 ffmpeg 抽取：

```bash
ffmpeg -y \
  -i input.mp4 \
  -vn \
  -ac 1 \
  -ar 16000 \
  -c:a pcm_s16le \
  /tmp/test-sensevoice.wav

export TEST_SOURCE_WAV="/tmp/test-sensevoice.wav"
```

## 6. 最小命令测试

### 6.1 无 VAD，直接识别一个 wav

```bash
"$REMIX_FUNASR_SENSEVOICE_BIN" \
  -m "$REMIX_FUNASR_SENSEVOICE_MODEL" \
  -a "$TEST_SOURCE_WAV"
```

需要记录：

- 是否能启动。
- stdout 输出内容。
- stderr 输出内容。
- 总耗时。
- 是否有乱码。
- 是否有明显错字。

### 6.2 保留标签输出

```bash
"$REMIX_FUNASR_SENSEVOICE_BIN" \
  -m "$REMIX_FUNASR_SENSEVOICE_MODEL" \
  -a "$TEST_SOURCE_WAV" \
  --keep-tags
```

需要观察是否出现类似：

```text
<|zh|><|NEUTRAL|><|Speech|><|woitn|>文本内容
```

重点判断：

- 语言标签是否稳定。
- 情绪标签是否有价值。
- 事件标签是否总是 Speech，还是能识别静音、音乐、噪声。
- ITN 标签是否可用于判断数字正则化。

### 6.3 开启 FSMN-VAD

```bash
"$REMIX_FUNASR_SENSEVOICE_BIN" \
  -m "$REMIX_FUNASR_SENSEVOICE_MODEL" \
  -a "$TEST_SOURCE_WAV" \
  --vad "$REMIX_FUNASR_VAD_MODEL" \
  --vad-maxseg 30000 \
  --keep-tags
```

需要记录：

- VAD 后识别是否更准。
- 长音频是否更稳定。
- stderr 是否输出 VAD segment 数量。
- stdout 是否按 VAD 段拼接，还是无法区分段落。
- 是否能从输出中恢复每段文本边界。

## 7. 推荐优先验证“逐片段 ASR”

当前 `llama-funasr-sensevoice` 的公开示例主要输出文本，而不是直接输出 JSON / SRT / 带时间戳 utterances。因此第一阶段建议优先验证逐片段模式：

```text
segment_001.wav -> SenseVoice -> text
segment_002.wav -> SenseVoice -> text
segment_003.wav -> SenseVoice -> text
```

逐片段模式的好处：

- 不依赖 SenseVoice CLI 输出句级时间戳。
- 每个片段文本天然属于该视频片段。
- 和“原片理解”的片段卡片更贴合。
- 可以最快验证是否降低中文错字。

逐片段 ASR 生成的临时 utterance 可以这样建模：

```ts
{
  id: `utt_${segmentId}`,
  text: senseVoiceText,
  startMs: segment.timeRange.startMs,
  endMs: segment.timeRange.endMs,
  confidence: null,
  speaker: null,
  tags: {
    language: 'zh',
    emotion: 'NEUTRAL',
    event: 'Speech',
    itn: 'woitn'
  }
}
```

这个时间戳不是自然语音句级时间戳，而是视频片段级时间戳。对 SRT 来说不够精细，但对片段理解、台词校对、Rollup 来说已经够用。

## 8. 输出记录模板

每条测试样本建议记录一份 Markdown：

```md
# SenseVoice Spike 样本记录

## 基础信息

- 视频 / 音频文件：
- 音频时长：
- 测试时间：
- 测试机器：
- binary 路径：
- SenseVoice 模型：
- VAD 模型：
- 命令：

## SenseVoice 输出

### stdout

```text
...
```

### stderr

```text
...
```

### 清洗后文本

```text
...
```

### 标签解析

- language：
- emotion：
- event：
- itn：

## Whisper 对比输出

```text
...
```

## 人工观察

| 维度 | Whisper | SenseVoice | 结论 |
| --- | --- | --- | --- |
| 中文错字 |  |  |  |
| 同音词 |  |  |  |
| 断句 |  |  |  |
| 漏识别 |  |  |  |
| 多余文本 |  |  |  |
| 速度 |  |  |  |
| 适合片段理解 |  |  |  |

## 是否建议纳入正式 Provider

- [ ] 是
- [ ] 否

原因：
```

## 9. A/B 对比标准

同一份音频至少对比：

1. 当前 Whisper.cpp 输出。
2. SenseVoiceSmall 无 VAD 输出。
3. SenseVoiceSmall + FSMN-VAD 输出。
4. SenseVoiceSmall 逐片段输出。

重点不看单个例子，而看 5-10 个真实素材片段：

| 指标 | 说明 | 通过标准 |
| --- | --- | --- |
| 中文错字率 | 人工观察错别字、同音词 | 明显少于 Whisper |
| 断句质量 | 是否符合口语句子边界 | 不比 Whisper 差 |
| 漏识别 | 是否吞字、漏句 | 不明显漏句 |
| 幻觉文本 | 是否生成音频中没有的话 | 不能比 Whisper 多 |
| 速度 | 识别耗时 / 音频时长 | 不低于 Whisper，最好明显更快 |
| 标签价值 | language/emotion/event 是否稳定 | 能稳定解析则加分 |
| 片段理解适配 | 结果是否适合送入 LLM | 明显改善片段理解输入质量 |

## 10. Spike 通过标准

满足以下条件，再进入正式项目改造：

- [ ] `llama-funasr-sensevoice` 能在本机稳定运行。
- [ ] SenseVoiceSmall 对中文素材的识别质量明显优于 Whisper.cpp。
- [ ] 处理速度满足资产入库流程。
- [ ] 输出可稳定清洗为纯文本。
- [ ] `--keep-tags` 输出可解析出语言、情绪、事件、ITN 标签，或确认这些标签暂时不接入。
- [ ] VAD 模式能提升长音频稳定性，或确认逐片段 ASR 更适合当前项目。
- [ ] 明确第一版正式接入采用“全片 + VAD”还是“逐片段 ASR”。

## 11. Spike 失败标准

出现以下任一情况，暂缓正式接入：

- binary 无法稳定在目标机器运行。
- 中文识别没有明显优于 Whisper。
- 输出难以清洗，包含大量异常 token 或重复文本。
- 长音频经常卡死、崩溃或耗时过高。
- 模型体积、打包方式、依赖管理明显不适合桌面端。
- 逐片段模式效果也无法接受。

## 12. 通过后的正式接入方向

如果 Spike 通过，下一步再设计正式 issue：

```text
.scratch/remix-understanding-v2/issues/08-funasr-sensevoice-asr-provider.md
```

正式接入建议采用 Provider 架构：

```ts
interface RemixAsrProvider {
  readonly engine: RemixTranscriptEngine;

  transcribeAudio(input: {
    audioPath: string;
    outputDir: string;
    mode: 'source' | 'segment';
  }): Promise<{
    utterances: RemixTranscriptUtterance[];
    srtText: string;
    audioSha256: string;
    warnings: string[];
  }>;
}
```

保留现有 Whisper：

```text
RemixAsrProvider
  ├── RemixLocalWhisperProvider
  └── RemixFunAsrSenseVoiceProvider
```

第一版正式接入建议通过环境变量切换：

```bash
export REMIX_STT_ENGINE="funasr_sensevoice_gguf"
export REMIX_FUNASR_SENSEVOICE_BIN="/path/to/llama-funasr-sensevoice"
export REMIX_FUNASR_SENSEVOICE_MODEL="/Users/tangwujun/Downloads/sensevoice-small-f16.gguf"
export REMIX_FUNASR_VAD_MODEL="/Users/tangwujun/Downloads/fsmn-vad.gguf"
```

默认仍保留：

```text
local_whisper_cpp
```

等 SenseVoiceSmall 在真实素材上稳定优于 Whisper 后，再考虑成为中文素材默认 ASR。

## 13. 建议下一步

1. 先确认 `llama-funasr-sensevoice` binary 是否已经有可用版本。
2. 用一段 10-30 秒中文 wav 跑通最小命令。
3. 保存 stdout / stderr。
4. 用一个真实 Remix 素材的 segment wav 跑逐片段识别。
5. 与当前 Whisper 输出做人工对比。
6. 根据结果决定是否创建正式 `08-funasr-sensevoice-asr-provider.md` issue。
