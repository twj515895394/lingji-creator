Status: ready-for-agent

# SenseVoiceSmall GGUF Provider

Type: AFK

## 父问题

`docs/sceneforge-remix/sensevoice-asr-integration-design.md`  
`.handoff/handoff-20260629-sensevoice-asr-integration.md`

## 要构建什么

实现 `SenseVoiceSmall GGUF` 的本地 Provider，支持对单个 segment wav 输出文本和标签信息。第一阶段只做片段级文本识别，不承诺精准 SRT。

## 验收标准

- [ ] Provider 能定位 binary、model、可选 VAD model
- [ ] 能 `spawn` `llama-funasr-sensevoice` 执行单段音频
- [ ] 能解析 `<|zh|><|NEUTRAL|><|Speech|><|woitn|>` 这类标签
- [ ] 能处理 no-tag / 空 stdout / 非零退出码 / timeout
- [ ] 返回 `text`、`tags`、`rawOutput`、`stderr`、`warnings`

## 被阻塞于

- `08-1-asr-types-and-provider-resolver.md`

## 测试与验证

- parser 单测
- timeout / 空输出 / stderr / no-tag 样例测试
- 不接入主流程

## 关键词

sensevoice, gguf, provider, parser, tags, timeout, stdout
