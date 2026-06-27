Status: ready-for-agent

# M3：全片理解汇总与 Stage 契约

## 问题陈述

仅有分段 JSON 时，全片剧情线、人物与二创方向缺少统一索引；且 `requiredArtifacts` 仍指向占位 `source_overview` / `segment_analysis`。

## 解决方案

在所有分段理解成功后，汇总生成全片 `original_understanding` / 更新 `source_overview.json` 索引，并登记 stage 所需 artifact 引用。

## 用户故事

1. 作为资产处理用户，我想看到全片剧情线与情绪曲线摘要，以便把握整体二创方向。
2. 作为资产处理用户，我想从高价值片段列表跳到 segment 卡片，以便快速选段。
3. 作为下游策略服务，我想通过稳定 JSON 契约读取全片与分段理解，以便生成 remix strategy。

## 实现决策

- Rollup 输入：各段 understanding 摘要字段 + metadata + transcript 统计。
- `source_overview.json` 升级为索引型文档（含 segmentRefs、quality 计数、overall 块）。
- `segment_analysis.json` 可为段列表 + 指向 per-segment understanding 路径。
- 阶段门禁：understoodSegmentCount === segmentCount（或 explicit partial_completed 策略，MVP 建议全成功才 approved）。

## 测试决策

- rollup：2 段 mock understanding → overall 字段与 refs 正确。
- 阶段：`requiredArtifacts` 校验通过。
- 先例：现有 types 测试中 artifact 路径列表。

## 超出范围

- 资产库全文检索索引（可 P2）
- 复杂角色跨段追踪

## 进一步说明

阻塞：M2。
