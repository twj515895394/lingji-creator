Status: ready-for-agent

# SenseVoice Segment Transcript Service

Type: AFK

## 父问题

`docs/sceneforge-remix/sensevoice-asr-integration-design.md`  
`.handoff/handoff-20260629-sensevoice-asr-integration.md`

## 要构建什么

实现基于 segment audio 的批量 transcript 服务。对每个已有 `segmentAudioPath` 的片段执行 SenseVoice，写入 `segment transcript v2`，并更新 segment manifest。

## 验收标准

- [ ] 遍历每个有 `segmentAudioPath` 的 segment
- [ ] 写出 `segment transcript v2`
- [ ] `timestampLevel` 标为 `segment_range`
- [ ] 无音频 segment 正确 skipped
- [ ] 失败 segment 保留 warning，不阻塞其他 segment
- [ ] segment manifest 被同步更新

## 被阻塞于

- `08-1-asr-types-and-provider-resolver.md`
- `08-2-sensevoice-gguf-provider.md`

## 测试与验证

- mock provider + mock segment audio
- 验证 transcript json 与 manifest 写盘
- 覆盖 skipped / partial failure 分支

## 关键词

segment transcript, segment audio, manifest, skipped, warnings, v2
