Status: ready-for-agent

# PRD：SceneForge Support Pack Wave

## 问题陈述

reference、story、assets、script、performance、audio 目前可以用 Markdown 手工提交推进流水线，但除 performance/audio 已有 Stage Pack 外，大部分支撑阶段仍不能通过 Direct LLM 生成。创作者必须手写占位内容，导致 Core 阶段虽然能真实运行，上下文质量仍受低质量支撑产物限制。

## 解决方案

以逐阶段追踪子弹方式，将六个支撑阶段接入统一的 Stage Pack + Direct LLM + 草案提交路径：

1. 先用已有 performance pack 打通 Runner、Studio、提交和校验的首条完整路径。
2. 接入已有 audio pack。
3. 为 reference、story、assets、script 创建符合标准布局的 Stage Pack、context policy、output contract 和 review checklist。
4. 每个阶段独立生成单个 requiredArtifact，用户审阅后提交。
5. 保留手工 Markdown 提交作为无 LLM 和人工修订的降级路径。

## 用户故事

1. 作为创作者，我想让 reference 根据 topic_gate 和源材料生成参考分析，以便减少手工整理。
2. 作为创作者，我想让 story 根据参考分析和改编方向生成故事方向，以便快速形成叙事方案。
3. 作为创作者，我想让 assets 根据故事方向生成资产规划，以便明确角色、场景和道具需求。
4. 作为创作者，我想让 script 根据 design 和故事方向生成剧本草案，以便为表演和分镜提供真实输入。
5. 作为创作者，我想让 performance 根据 script、design 和风格生成表演指导，以便分镜具有动作和情绪依据。
6. 作为创作者，我想让 audio 根据 storyboard 和 performance 生成声音设计，以便视频提示词包含完整声音层。
7. 作为创作者，我想在每个支撑阶段继续使用手动 Markdown，以便模型不可用时仍能工作。
8. 作为创作者，我想在提交前审阅生成内容，以便低质量草案不会自动污染项目。
9. 作为创作者，我想看到当前阶段使用了哪些上游输入摘要，以便理解生成依据。
10. 作为创作者，我想在缺少必需上游产物时得到明确阻塞原因，以便先补齐依赖。
11. 作为创作者，我想在模型返回错误结构时得到可恢复错误，以便重试或改用手动提交。
12. 作为维护者，我想让每个支撑阶段拥有独立 Stage Pack，以便 Prompt 和输出契约版本化。
13. 作为维护者，我想让 Direct LLM 支持阶段由明确能力表决定，而不是继续硬编码 Core 数组。
14. 作为维护者，我想让支撑生成继续经过现有 Validator 和 Approval，以便状态机一致。
15. 作为维护者，我想记录旧 skill 到新 Pack 的迁移差异，以便后续维护可追溯。
16. 作为测试者，我想逐阶段使用 mock Provider 验证 run → review → submit → validate，以便每个切片都可独立交付。

## 实现决策

- Wave 范围为 reference、story、assets、script、performance、audio。
- source_intake、topic_gate 保持 HITL，不在本包改为 Direct LLM。
- publish 不在本包。
- performance、audio 复用现有 Stage Pack，先用于验证通用支撑阶段链路。
- reference、story、assets、script 新建标准 Stage Pack。
- 每个支撑阶段只有一个 requiredArtifact，Direct LLM 仍返回 JSON 对象。
- Direct LLM 支持能力使用显式 stage capability 配置，不以“目录存在”自动开放所有阶段。
- StageRunPanel 支持支撑阶段草案提交，不再只允许 Core 集合。
- 手动 Markdown Workspace 与 Runner 面板并存；用户可以选择生成或手写。
- 生成结果不自动提交。
- 旧 skill 只作为迁移来源，运行时不读取外部仓库。

## 测试决策

- 每个新 Pack 有 loader、output contract、context policy 和 prompt 非空测试。
- 每个阶段有 mock run → submit → validate 集成测试。
- 通用 Runner 能力测试覆盖允许和拒绝阶段。
- UI 测试验证支撑阶段同时提供 Direct LLM 和手动提交。
- Context 测试只检查允许的上游输入和关键 artifactKey，不对 Prompt 全文做脆弱快照。
- Electron 人工验收至少走通 performance、reference、script、audio。

## 超出范围

- intake/topic_gate 自动生成和自动确认。
- publish 自动生成。
- 富文本剧本编辑器、表演时间轴、声音轨道编辑器。
- 自动串行运行六个支撑阶段。
- ACP Agent 多轮。
- 对 Prompt 内容质量做自动评分。

## 进一步说明

- 详细设计：`docs/sceneforge/2026-06-18-sceneforge-support-pack-wave-design.md`。
- 实施计划：本目录 `IMPLEMENTATION-PLAN.md`。
- 本包应在 Core LLM Happy Path 稳定后实施。

