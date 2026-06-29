Status: ready-for-agent

# SenseVoice 接入：ASR 类型与 Provider Resolver

Type: AFK

## 父问题

`docs/sceneforge-remix/sensevoice-asr-integration-design.md`  
`.handoff/handoff-20260629-sensevoice-asr-integration.md`

## 要构建什么

为 Remix 原片理解新增统一的 ASR 类型系统与 Provider Resolver，使主流程不再写死 Whisper。端到端行为应为：

1. 类型系统可表达 `engine`、`mode`、`timestampLevel`、`capabilities`。
2. Resolver 支持：
   - 默认 `auto`
   - 强制 `funasr_sensevoice_gguf`
   - 强制 `local_whisper_cpp`
3. 当 SenseVoice 资源缺失时：
   - `auto` 模式回退 Whisper
   - 强制 SenseVoice 模式报出明确错误

## 验收标准

- [ ] 类型可表达 `funasr_sensevoice_gguf` / `local_whisper_cpp` / `bcut` / `imported_srt` / `no_audio`
- [ ] `timestampLevel` 至少支持 `none` / `segment_range` / `sentence`
- [ ] Resolver 支持 `auto` / 强制 SenseVoice / 强制 Whisper
- [ ] `auto` 下资源缺失会 fallback Whisper
- [ ] 强制 SenseVoice 下资源缺失报清晰错误，不静默回退

## 被阻塞于

- 无 - 可以立即开始

## 测试与验证

- 新增 resolver 单测
- 覆盖 forced / auto / fallback / no-audio 分支

## 关键词

sensevoice, asr types, provider resolver, auto fallback, timestampLevel
