Status: ready-for-human

# 台词纠偏与画面理解解耦（产品决策）

## 决策

- **ASR / 台词纠偏** 与 **画面多模态理解、video prompt** 无直接耦合。
- 修改台词、重跑 ASR **不** 使本段理解过期，**不** 清空 analysis，**不** 展示「台词已修改请重跑理解」类横幅。
- 理解过期仅与 **关键帧/片段时间范围**、**更新的 frame vision**、**缺失 analysis** 等相关。

## 实现要点

- `buildSegmentUnderstandingInputHash` 不再包含 `transcriptPlainText`；存量 legacy hash 通过 `segmentUnderstandingInputHashMatchesStored` 兼容。
- `RemixTranscriptCorrectionService` 移除 major 修改时清空 understanding 的逻辑。

## 评论

- 2026-06-29：按用户明确产品语义落地，取代 Issue 08/09 的「分层 stale」方案。