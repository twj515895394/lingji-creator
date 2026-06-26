# 本地 STT（Whisper.cpp / ggml-small）

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

## 权威设计

`docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`


## 模型文件

`ggml-small.bin` 体积较大，可能不在 git 中。若 `main` 已拷贝但识别报错缺模型，请从 `local_tts_stt` 或官方源放入 `tools/local-stt/whisper/ggml-small.bin`，或设置 `REMIX_WHISPER_MODEL`。
