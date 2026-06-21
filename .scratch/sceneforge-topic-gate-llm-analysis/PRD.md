Status: ready-for-agent

# PRD：SceneForge Topic Gate LLM Analysis

## 问题陈述

当前 `topic_gate` 页面里有“选题评分”区块，但它并不是一个真实能力，只会被动解析 `topic_brief` 中是否存在 `## 评分` 段。现状导致三个问题：

1. 用户看到“评分”会误以为系统已经具备选题分析能力，但实际上没有任何 LLM 交互。
2. `topic_gate` 被降级成“手填一句话 + 人工确认风格”，与旧 `scene_forge` 中“选题闸门负责评分、决策建议、风格候选建议”的主语义不一致。
3. 当前页面仍残留 Agent / ACP / MCP 话术，不符合本轮“先完成 Direct LLM 主链全链路测试”的目标。

## 解决方案

在不引入 ACP Agent、不中断现有 Artifact Store / Validate / Continue 流程的前提下，把 `topic_gate` 升级为一个“人工输入 + Direct LLM 分析 + 人工确认”的双层闸门：

1. 用户先填写 `topic_brief`。
2. 用户点击明确的单一主动作“分析选题”。
3. Direct LLM 基于 `topic_brief` 和可选 `source_intake` 上游资料，生成结构化 `topic_analysis` 草案。
4. `topic_analysis` 至少包含：
   - 维度评分
   - 总分
   - 建议决策 `go / observe / drop`
   - 建议制作档位 `focus / fast / none`
   - 风格家族候选
   - 导演 / 画面风格候选与推荐项
5. 用户在 `topic_gate` 专用工作区查看分析结果，并进行最终人工确认。
6. 最终确认仍写入 `gate_confirmations`，下游阶段继续只依赖已确认结果，而不是直接依赖 LLM 建议。

## 用户故事

1. 作为创作者，我想先输入一句话选题，再让系统分析是否值得继续制作，而不是自己凭感觉决定。
2. 作为创作者，我想看到多维评分和总分，以便知道这个选题为什么值得做或不值得做。
3. 作为创作者，我想看到系统建议的 `go / observe / drop`，但仍保留最终决定权。
4. 作为创作者，我想看到推荐风格和备选风格，以便确认画面方向，而不是盲选。
5. 作为创作者，我想在同一工作区里完成“输入 → 分析 → 确认”，而不是切到通用 Runner 面板。
6. 作为创作者，我想在切走再回来后仍看到分析中状态或已生成结果，避免重复运行。
7. 作为创作者，我想在分析失败时得到明确的 Direct LLM 错误说明，而不是 ACP 或 Agent 配置指引。
8. 作为维护者，我想让 `topic_analysis` 与 `gate_confirmations` 分离，以便区分“模型建议”和“人工最终结论”。
9. 作为维护者，我想让 `topic_gate` 与旧 `scene_forge` 的选题闸门语义重新对齐，但不把旧黑板协议整套搬进来。
10. 作为测试者，我想覆盖正常、失败、切走恢复、重新分析、修改确认、旧项目兼容等场景。

## 方案对比

### 方案 A：继续保留当前只读“评分占位”

- 优点：改动最小。
- 缺点：能力是假的，持续误导用户；无法支撑 LLM 主链验收。

### 方案 B：在 `topic_gate` 里接入通用 `StageRunPanel`

- 优点：复用已有 Direct LLM 运行和缓存机制。
- 缺点：`topic_gate` 已经有专用表单和专用 HITL 卡片，再套一层通用 Runner 会造成双工作区、双主动作和过重交互。

### 方案 C：保留专用 `topic_gate` 工作区，新增轻量 LLM 分析子步骤

- 优点：最符合 `topic_gate` 的专用语义；UI 最清晰；能复用底层 Direct LLM / session store，而不复用不合适的整块 UI。
- 缺点：需要补一套 `topic_analysis` 产物与专用 panel。

推荐采用方案 C。

## 实现决策

- 新增 `topic_analysis` 作为 `topic_gate` 的机器建议产物，不把分析结果混写进 `topic_brief`。
- `topic_brief` 继续只保存用户输入和基础时长参数。
- `gate_confirmations` 继续只保存人工最终决策与最终风格确认。
- `topic_gate` 的 LLM 只允许 `direct_llm`，不暴露 ACP Agent 入口。
- 分析触发方式是专用按钮“分析选题”，不是通用 Runner 下拉。
- 分析结果区默认只展示真正存在的数据，不显示“当前没有评分数据”这种半成品空区块。
- 若 `topic_analysis` 不存在，则不显示“选题评分”标题，改为分析前引导区。
- 若分析结果存在，则卡片区按“评分摘要 → 建议决策 → 风格候选 → 人工最终确认”顺序呈现。
- 页面所有 `Agent / ACP / MCP` 话术从 `topic_gate` 主工作区移除。
- 分析中与分析后结果需要接入现有阶段运行 session 恢复机制，保证切走再回来状态不丢。

## UI 设计原则

- 这是现有 Studio 工作区，不做 Landing Page 式重设计，遵循现有产品视觉语言。
- 只保留一个主动作：未分析时是“分析选题”，已分析后是“确认风格并继续”。
- 说明文案压到最短，避免同义重复和流程复述。
- 不展示无意义空 section；无分析结果时不渲染“选题评分”标题。
- 卡片层级优先保证信息决策效率，而不是装饰性。
- 推荐信息与最终确认信息要视觉分层，避免把“模型建议”误读成“已生效结论”。

## 测试决策

- 结构化 parser / builder 单元测试覆盖 `topic_analysis`。
- Service / Runner 测试覆盖 `topic_gate` Direct LLM 分析成功、解析失败、缺字段失败。
- UI 测试覆盖：
  - 未分析时只有输入和分析按钮
  - 分析成功后展示评分与建议卡
  - 人工确认写回 `gate_confirmations`
  - 切换阶段再回来恢复分析结果
  - 无 `topic_analysis` 时不显示评分区块
- Electron 人工验收覆盖 `topic_gate -> reference` 主路径。

## 超出范围

- ACP Agent 接入 `topic_gate`
- 把旧 `scene_forge` 的完整 YAML 黑板协议迁移进来
- 重新设计全站风格系统
- 自动跳过人工确认直接 Continue
- 风格资产图库与缩略图浏览器

## 进一步说明

- 本包只解决 `topic_gate` 的真实 LLM 分析闭环，不扩展到 `source_intake`。
- 详细设计：`docs/sceneforge/2026-06-19-sceneforge-topic-gate-llm-analysis-design.md`
- 实施计划：本目录 `IMPLEMENTATION-PLAN.md`
