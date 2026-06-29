Status: ready-for-agent

# SenseVoice 测试与文档收口

Type: AFK

## 父问题

`docs/sceneforge-remix/sensevoice-asr-integration-design.md`  
`.handoff/handoff-20260629-sensevoice-asr-integration.md`

## 要构建什么

补齐 SenseVoice 第一阶段所需的测试覆盖与使用文档，让后续实现不依赖口口相传。

## 验收标准

- [ ] provider parser / resolver / segment transcript / transcript service fallback 都有测试
- [ ] `tools/local-stt` 或相关 README 说明 SenseVoice 资源准备方式
- [ ] 文档明确第一阶段不做精准 SRT，只做 `segment_range` 文本
- [ ] 新增测试不破坏现有 Whisper 主线测试

## 被阻塞于

- `08-1-asr-types-and-provider-resolver.md`
- `08-2-sensevoice-gguf-provider.md`
- `08-3-segment-transcript-service.md`
- `08-4-remix-transcript-service-default-switch.md`
- `08-5-workbench-export-correction-compat.md`

## 测试与验证

- 运行新增单测文件
- 最后回归 transcript/orchestrator/workbench 相关测试集

## 关键词

tests, docs, parser, resolver, fallback, readme
