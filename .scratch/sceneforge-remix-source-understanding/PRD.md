Status: ready-for-agent

# SceneForge Remix 原片理解（Source Understanding）总 PRD

## 背景

Remix 资产入库已有「原片理解」阶段入口，但当前实现本质是**切片/关键帧元数据汇总 + 阶段状态置为完成**，无法支撑二创检索、视频模型 prompt 与人工标注预填。

权威设计：`docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md`  
当前 handoff：`.handoff/handoff-20260626-184300.md`

## 总览入口（检索所有分叉）

| 入口 | 用途 |
|------|------|
| **[`ISSUE_INDEX.md`](ISSUE_INDEX.md)** | **所有 issue 一览表、分叉树、关键词检索** |
| [`EXECUTION_ORDER.md`](EXECUTION_ORDER.md) | 批次顺序与并行 |
| [`DESIGN_ARCHIVE.md`](DESIGN_ARCHIVE.md) | 留档与文档地图 |
| [`issues/`](issues/) | 各票正文 |

## 问题陈述

作为 Remix 资产运营者，我无法在「生成原片理解」后获得**每个镜头片段**的结构化记录；阶段却显示已完成。

## 解决方案（模块）

1. **M0** 阶段真实性门禁  
2. **M1** 抽音频 + **内嵌 whisper（03c）** + 分段对齐  
3. **M2** 片段 LLM 理解（04）  
4. **M3** 全片 rollup（05）  
5. **M4** 工作台与标注（06）  
6. **编排** 一键 A→B→rollup（07）  

边缘：`03b` 导入 SRT、`03` Bcut — 见 ISSUE_INDEX。

## 模块 PRD 索引

| 模块 | PRD | 优先级 |
|------|-----|--------|
| M0 | `prd/00-stage-truth-gate.md` | P0 |
| M1 | `prd/01-audio-asr-foundation.md` | P0 |
| M1.5 边缘 | `prd/01b-imported-srt-transcript-fast-path.md` | 可延后 |
| M2 | `prd/02-segment-understanding-generation.md` | P0 |
| M3 | `prd/03-source-understanding-rollup.md` | P0 |
| M4 | `prd/04-understanding-workbench-and-annotation.md` | P1 |

## 实现决策（摘要）

- 全片 **1 次** whisper，**不是** 每段 ASR；片段 **LLM 队列 2–4 并发**。  
- 详设：`remix-stt-asr-integration-and-transcript-formats.md`、`remix-understanding-orchestration-and-ui.md`  
- 产物优先、契约见 DESIGN_ARCHIVE。

## Issues（完整列表 → 见 ISSUE_INDEX）

01, 02, 03c（主线 STT）, 03（可选）, 03b（边缘）, 04, 05, 06, **07（编排）**

## 超出范围

Accurate 视频直传、ui-recovery 切片大票、Creation Workspace 深度改造。
