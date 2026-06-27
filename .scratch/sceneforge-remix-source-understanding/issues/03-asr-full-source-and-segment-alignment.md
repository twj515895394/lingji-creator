Status: ready-for-agent

# 全片 ASR 与分段台词对齐

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/01-audio-asr-foundation.md`（M1）

## 要构建什么

全片 ASR（或导入 SRT 规范化）并按 segment 时间对齐生成分段 transcript JSON。

端到端行为：
- 有语音素材每段可对齐台词或 noSpeech。
- 单段 ASR 重跑接口或等价能力可用（MVP 可先全片+对齐，重跑为 follow-up 可写验收第二条为 stretch）。

## 验收标准

- [ ] 全片 transcript 产物存在且可解析
- [ ] 每段 transcript 与 segment 时间范围对齐
- [ ] 低置信或无语音段有 quality 标记

## 被阻塞于

- 02-audio-extraction-and-segment-cache.md

## Review Checklist

- [ ] 行为与 `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` MVP 范围一致
- [ ] 不重复 sceneforge-remix-ui-recovery 的切片/UI 大票职责
- [ ] 阶段完成仍遵循产物优先原则

## 测试与验证

- `npx tsc --noEmit`
- 相关 vitest：validators / understanding / artifact-paths / asset-processing（按票增量）


## 关联 issue

- `03b-imported-srt-transcript-fast-path.md`：导入字幕快路径；本票负责全片 ASR 慢路径。两条路径必须合并为同一 `source_transcript` schema 后，再执行分段对齐。


## 格式与 Provider 权威文档

`docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`
