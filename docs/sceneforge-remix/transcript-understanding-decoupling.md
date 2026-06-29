Status: ready-for-human

# 台词纠偏与画面理解解耦（产品决策）

## 决策

- **ASR / 台词纠偏** 与 **画面多模态理解、video prompt** 无直接耦合。
- 修改台词、重跑 ASR **不** 使本段理解过期，**不** 清空 analysis，**不** 展示「台词已修改请重跑理解」类横幅。
- 理解过期仅与 **关键帧/片段时间范围**、**更新的 frame vision**、**缺失 analysis** 等相关。

## 实现要点

- `buildSegmentUnderstandingInputHash` 不再包含 `transcriptPlainText`；存量 legacy hash 通过 `segmentUnderstandingInputHashMatchesStored` 兼容。
- `RemixTranscriptCorrectionService` 移除 major 修改时清空 understanding 的逻辑。

## 对白权威顺序（video prompt）

1. **画面烧录字幕**（关键帧多模态识别 `onScreenSubtitles`）— 有则必须为准  
2. 人工校对后的有效台词  
3. ASR 原文  

改台词不触发理解过期；但若画面有硬字幕，重跑理解后 prompt 仍以字幕为准。