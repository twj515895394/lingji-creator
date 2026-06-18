Status: ready-for-agent

# PRD：SceneForge 下一批（P1–P4）

## 问题陈述

MVP 闭环（ADR-0002）后，用户可在工坊内走通 gate → reference/story/assets → design，但 **分镜 / 视频** 仍无无 LLM 占位路径；**剧本 / 表演 / 声音** 阻塞 storyboard / video 依赖；Direct LLM 未配置时错误不引导设置；缺少与上一批同级的 **文档 + issues** 追溯。

## 解决方案

按 [IMPLEMENTATION-PLAN](./IMPLEMENTATION-PLAN.md) 分四包交付（issues 06–09）：

1. **P1**：core 三阶段 MVP 占位扩展至 storyboard、video_prompts（含 video 校验所需的 Segment/Audio 占位文案）。
2. **P2**：handoff、Issue 20 状态、overview 指针（不强制 git commit）。
3. **P3**：StageRunPanel 对 `SCENE_DIRECT_LLM_NO_SETTINGS` 引导「设置 → AI」。
4. **P4**：script / performance / audio 支撑 MVP（submit + validator + Studio + FlowActions）。

**P5（issue 10）**：UI 债 backlog，功能稳定后再做。

## 用户故事（摘要）

1. 作为测试者，我能在无 LLM 下用占位走通 **design → script → performance → storyboard → audio → video**。
2. 作为创作者，我配置 LLM 前能看懂 Direct LLM 失败原因与下一步。
3. 作为维护者，本批有 PRD、设计、计划、issues 与 handoff 可追溯。

## 父文档 / 关联

- 前置：`.scratch/sceneforge-studio-mvp-closure/`、ADR-0002
- 设计：`docs/sceneforge/2026-06-18-sceneforge-next-batch-design.md`
- ADR 附录：`docs/adr/0002-appendix-production-support-mvp.md`

## 超出范围

- gate/intake 卡片式 HITL（另开产品包）
- Studio 拆 Shell、侧栏 entryPath 完整文案（issue 10）
- 支撑阶段 stage pack、Continue 后自动 runStage