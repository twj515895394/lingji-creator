Status: ready-for-agent

# 导入 SRT 字幕快路径与全片 Transcript 规范化

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/01b-imported-srt-transcript-fast-path.md`（M1.5）

## 要构建什么

当 Source Asset 创建时已携带导入字幕（transcriptPath/srtPath），将其规范化写入 Remix 全片 transcript 契约；合格时跳过 bcut 全片 ASR，并进入与慢路径相同的分段台词对齐。

端到端行为：
- 从 video-import 进入的素材，在字幕有效时任务日志显示「使用导入字幕」。
- 字幕无效或缺失时自动回退全片 ASR，不阻塞后续理解。
- 全片与分段 transcript schema 与 ASR 路径一致，供 M2 无分支消费。

## 验收标准

- [ ] 有效 SRT/导入 transcript 可生成 `source_transcript.json`，`mode=imported_srt`
- [ ] 无效/空字幕自动回退 ASR 或明确失败原因（hasAudio 时）
- [ ] 规范化结果可被分段对齐器消费（与 issue 03 共享 align 逻辑）
- [ ] 源视频或字幕变更后，transcript/理解相关状态可标记 stale
- [ ] 单测覆盖 parse、回退决策、不写死 bcut 调用

## 被阻塞于

- 02-audio-extraction-and-segment-cache.md（建议；无音轨场景可与 02 并行）

## Review Checklist

- [ ] 与 `remix-source-asset-service` 已有 transcriptPath/srtPath 字段对齐
- [ ] 不 duplicate video-import 写盘逻辑，只读并规范化到 Remix 目录
- [ ] M2 prompt 层不区分台词来源，只读统一 JSON

## 测试与验证

- `npx tsc --noEmit`
- vitest：ingestion + alignment 组合用例；mock import 快照

## 关联 issue

- 完成后与 `03-asr-full-source-and-segment-alignment.md` 联调：03 负责慢路径 ASR + 共用 align；本票负责快路径 ingestion。


## 格式与 Provider 权威文档

`docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`
