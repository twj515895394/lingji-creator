# Phase 2 差距与优化清单

> 日期：2026-06-17  
> 状态：已定稿（approved）  
> 对照：`SceneForge_Studio_LingjiCut_Fork_Product_Architecture_v2.md`、Issues 01–12

## 1. 图例

| 优先级 | 含义 |
| --- | --- |
| **P0** | Phase 2 实施计划 Wave A–C 必须覆盖 |
| **P1** | Phase 2 Wave D 或紧接迭代 |
| **P2** | 明确后置，不阻塞「core 三阶段可生成」 |

## 2. 已完成（01–12，摘要）

- SceneForge 项目类型、Studio 三栏、审批策略、Artifact Store、核心三阶段 submit/validate/approve
- MCP 读状态/上下文/提交/校验/审批/导出
- Display Model + Copy UX、Asset registry（无 source-materials）
- Stage Pack loader + design 最小包；**manual_submit** runner 基座

## 3. 差距表

### 3.1 上下文与 SOP

| 项 | v2/旧 skill 期望 | 现状 | 优先级 |
| --- | --- | --- | --- |
| 按阶段精确上下文 | policy + handoff | 9 文件全文 / 缺 audio | **P0** |
| handoff.json | approve 生成 | 无 | **P0** |
| video 依赖 audio+performance | 技能明确要求 | 未接入 | **P0** |
| storyboard 依赖 script | 技能要求 | usedBy 未含 script | **P1** |
| context-policy.yaml | 每阶段 | 无 | **P0** |
| MCP runner 参数 | 精确 acp 包 | 无 | **P0** |

### 3.2 Stage Pack

| 项 | 现状 | 优先级 |
| --- | --- | --- |
| design 完整 pack | 最小 | **P0** |
| storyboard / video_prompts / audio / performance pack | 无 | **P0** |
| script pack | 无 | **P1** |
| 支撑阶段 pack（intake…assets） | 无 | **P2** |
| references 迁入 | 无 | **P0**（随 pack） |

### 3.3 Runner 与执行

| 项 | 现状 | 优先级 |
| --- | --- | --- |
| direct_llm | not implemented | **P0** |
| acp_agent | not implemented | **P0** |
| runStage IPC/MCP | 仅 service 内部 | **P0** |
| Studio 执行方式 + 进度 | 无 | **P1** |
| Regenerate / Request Revision UI | 服务部分有 | **P1** |

### 3.4 工作台 UI（v2）

| 项 | 现状 | 优先级 |
| --- | --- | --- |
| 支撑阶段 Pipeline 展示 | 仅 core 三阶段 | **P2** |
| Design/Storyboard/Video 专用 Workspace | 通用工作区 | **P2** |
| All Artifacts 抽屉 | 无 | **P2** |
| Inspector Structure/Trace 深化 | 部分 | **P2** |
| 项目级 style 选择器 UI | API 未透传 IPC | **P1** |

### 3.5 工程与导出

| 项 | 现状 | 优先级 |
| --- | --- | --- |
| pipeline.yaml 项目级 | 无 | **P2** |
| ZIP 导出 | 文件夹 only | **P2** |
| Validator semantic 层（audio/performance） | 核心三阶段为主 | **P1** |
| scene_start_stage / 自动推进链 | 无 | **P2** |
| Agent Chat 面板 | 无 | **P2** |

### 3.6 工程纪律（本次新增）

| 项 | 现状 | 优先级 |
| --- | --- | --- |
| SceneContextBuilder 拆分 | 逻辑在 service | **P0** |
| CLAUDE + 工程约束 doc | **已写入** | 完成 |
| 单文件 ≤800 行 | 当前合规 | 持续 |

## 4. Phase 2 成功标准（验收）

1. `video_prompts` 的 `getStageContext(..., acp_agent)` **不**含 9 文件全文；含 audio/performance（有产物时）。
2. approve design/storyboard/audio/performance 后存在对应 **handoff.json**。
3. `direct_llm` 对 design 或 video 可生成草案并走通 validate（mock 或真 Provider 二选一）。
4. `acp_agent` MVP：可启会话 + Context 含 full 项 + MCP 提交（或 documented manual 验收）。
5. SceneForge 回归测试通过；Cut 主链路测试 **无回归**（至少 `npm test` 全量或约定子集）。

## 5. 明确不在 Phase 2

- v9 Web Console / PTY 主路径
- 旧项目自动迁移
- 真实图/视频/音频生成
- 全支撑阶段 UI 与自动链
- 全部 style profile 迁入 registry