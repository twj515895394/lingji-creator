Status: ready-for-agent

# RemixTranscriptService 默认切换到 SenseVoice 优先

Type: AFK

## 父问题

`docs/sceneforge-remix/sensevoice-asr-integration-design.md`  
`.handoff/handoff-20260629-sensevoice-asr-integration.md`

## 要构建什么

改造 `RemixTranscriptService`，默认在 `auto` 模式下优先使用 SenseVoice 生成片段级 transcript；当 SenseVoice 不可用时自动回退 Whisper。Whisper 仍保留精准 SRT 生成职责。

## 验收标准

- [ ] 默认 `auto` 模式优先 SenseVoice
- [ ] SenseVoice 缺 binary/model 时自动 fallback Whisper
- [ ] 强制 Whisper 模式可正常执行旧链路
- [ ] 强制 SenseVoice 且资源不可用时报清晰错误
- [ ] 不覆盖或伪造精准 SRT；SenseVoice 第一阶段不承诺 `srtPath`
- [ ] source transcript aggregate 能表达 `segment_audio_asr` 来源

## 被阻塞于

- `08-1-asr-types-and-provider-resolver.md`
- `08-2-sensevoice-gguf-provider.md`
- `08-3-segment-transcript-service.md`

## 测试与验证

- transcript service 集成测试
- 验证 auto / forced / fallback 行为
- 验证 SenseVoice 路径不生成精准 SRT

## 关键词

RemixTranscriptService, auto, fallback, whisper, sensevoice, source transcript aggregate
