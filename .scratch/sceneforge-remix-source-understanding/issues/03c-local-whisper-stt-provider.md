Status: ready-for-agent

# 本地 Whisper STT Provider 与时间轴字幕

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
设计：`docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`  
模块 PRD：`prd/01-audio-asr-foundation.md`（M1）

## 要构建什么

将 **ggml-small + whisper.cpp 内嵌到 lingji-creator**（subprocess，不连 local_tts_stt HTTP）：识别结果必须带 **utterance 级时间轴**，并写入统一 `source_transcript.json` + `.srt` + `.md`。

端到端行为：
- 在 **source_audio.wav**（ffmpeg 从视频抽出）就绪后，subprocess 跑 whisper 出带时间轴字幕；不默认整段 mp4 直喂。
- 可选 fallback bcut（默认关）。
- 不再仅返回整段纯文本；分段对齐器可消费 utterances。
- 二进制/模型路径可配置或随仓库 `tools/local-stt` 分发说明落地。

## 验收标准

- [ ] Provider 输出符合 `remix-stt-asr-integration-and-transcript-formats.md` §5.1
- [ ] 自动生成标准 SRT，且 `parseSrt` 往返 utterances 一致
- [ ] health/缺模型时错误可解释，且可 fallback（若配置允许）
- [ ] 与可选 bcut fallback 汇入同一 Writer/Aligner（SRT 导入非主线）
- [ ] 单测含 whisper 输出样例解析（无需实跑大模型）

## 被阻塞于

- 02-audio-extraction-and-segment-cache.md

## 测试与验证

- `npx vitest run` 新增 transcript provider/aligner 测试
- 实机（可选）：`ggml-small.bin` + 30s 样例音频
