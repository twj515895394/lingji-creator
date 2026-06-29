Status: ready-for-agent

# Workbench / Export / Correction 对 SenseVoice 兼容

Type: AFK

## 父问题

`docs/sceneforge-remix/sensevoice-asr-integration-design.md`  
`.handoff/handoff-20260629-sensevoice-asr-integration.md`

## 要构建什么

让 Workbench、报告导出和 transcript correction 能正确消费 SenseVoice 片段台词，并明确这是 `segment_range` 文本，不是精准 SRT。

## 验收标准

- [ ] Workbench 可展示 SenseVoice 片段台词与来源
- [ ] Report Export 能标明 `engine` / `timestampLevel`
- [ ] Correction stale 机制兼容 segment transcript v2
- [ ] 文案不误导用户为“精准字幕”

## 被阻塞于

- `08-3-segment-transcript-service.md`
- `08-4-remix-transcript-service-default-switch.md`

## 测试与验证

- workbench / export / correction 相关单测
- 验证 stale 在修正后仍按预期触发

## 关键词

workbench, export, correction, stale, timestampLevel, segment_range
