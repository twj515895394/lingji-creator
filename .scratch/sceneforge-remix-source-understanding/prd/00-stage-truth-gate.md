Status: ready-for-agent

# M0：原片理解阶段真实性门禁

## 问题陈述

用户点击「生成原片理解」后阶段即显示完成，但产物仅为切片统计型 Markdown/JSON，无法支撑验收与入库。

## 解决方案

引入阶段级产物校验：理解阶段仅在满足 schema 与覆盖率时进入 `ready_for_review` / `approved`；前置阶段（关键帧等）变更后标记理解为 `stale` 或回退。

## 用户故事

1. 作为资产处理用户，我想在没有真实理解产物时看到「待生成」，以便不会误点入库。
2. 作为资产处理用户，我想在关键帧重跑后看到理解需重生成，以便结果与输入一致。
3. 作为开发者，我想发布/下一阶段依赖校验理解完整性，以便阻断假完成路径。

## 实现决策

- 扩展 stage validator：校验 `remix_understanding` 所需 artifact 存在、非占位、段数覆盖与 segment 列表一致。
- 占位实现（仅 segmentCount/duration/boundary 汇总）不得通过校验。
- `runSourceUnderstanding` 成功路径默认 `ready_for_review`；`approved` 可在人工确认或自动策略后设置（与现有 annotate 流对齐）。
- 关键帧服务不再静默把理解设为 `ready_for_review` 而不写理解产物（或改为 stale）。
- 状态枚举支持：`not_started` / `running` / `ready_for_review` / `approved` / `failed` / `stale`（`stale` 可映射为 `needs_input` 若类型未扩展）。

## 测试决策

- 单元：无文件、空 JSON、段数不一致 → 校验失败。
- 集成：mock 理解服务写最小合法产物后阶段可推进。
- 先例：`remix-validators`、`sceneforge-remix-understanding.test.ts`。

## 超出范围

- 真实 LLM 理解内容质量（M2）
- UI 卡片（M4）

## 进一步说明

父 PRD：`.scratch/sceneforge-remix-source-understanding/PRD.md`
