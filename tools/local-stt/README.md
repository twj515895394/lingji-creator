# 本地 STT（Whisper.cpp / SenseVoice GGUF）

Remix **内嵌** STT，不启动 `local_tts_stt` HTTP 服务。

## 管线

```text
source.mp4 → ffmpeg → source_audio.wav (16k mono) → whisper.cpp main + ggml-small.bin → SRT/JSON
```

**不要**默认把长视频 mp4 直接交给 whisper；先抽全片音频（见 `docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md` §4.1）。

## 文件来源（从 sibling 项目复制）

参考：`/Users/tangwujun/Documents/trae_projects/local_tts_stt/models/whisper/`

```bash
mkdir -p tools/local-stt/whisper
cp ../local_tts_stt/models/whisper/main tools/local-stt/whisper/
cp ../local_tts_stt/models/whisper/ggml-small.bin tools/local-stt/whisper/
```

或环境变量：`REMIX_WHISPER_BIN`、`REMIX_WHISPER_MODEL`。

## SenseVoice 第一阶段（segment_range transcript）

SenseVoice 第一阶段用于 Remix 原片理解的片段级转写：

- 默认策略：`auto` 模式优先 SenseVoice，缺资源时自动 fallback Whisper
- 输出能力：`segment_range` 文本，不是精准 SRT
- 模型目录：`tools/local-stt/funasr/`

建议文件布局：

```bash
mkdir -p tools/local-stt/funasr
cp /path/to/llama-funasr-sensevoice tools/local-stt/funasr/
cp /path/to/sensevoice-small-f16.gguf tools/local-stt/funasr/
cp /path/to/fsmn-vad.gguf tools/local-stt/funasr/
```

也支持环境变量：

- `REMIX_FUNASR_SENSEVOICE_BIN`
- `REMIX_FUNASR_SENSEVOICE_MODEL`
- `REMIX_FUNASR_VAD_MODEL`
- `REMIX_STT_ENGINE`
  - `auto`：SenseVoice 优先，Whisper fallback
  - `funasr_sensevoice_gguf`：强制 SenseVoice
  - `local_whisper_cpp`：强制 Whisper

## 权威设计

`docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`
`docs/sceneforge-remix/sensevoice-asr-integration-design.md`


## 模型文件

`ggml-small.bin` 与 `*.gguf` 体积较大，默认可能不在 git 中。若本地 STT 报错缺模型，请确认对应文件已放入 `tools/local-stt/whisper/` 或 `tools/local-stt/funasr/`，或使用环境变量覆盖路径。
