Status: ready-for-agent

# PRD：SceneForge 视频内容创作工坊 P0

## 问题陈述

创作者使用 SceneForge 是为了完成 **AI 视频内容创作流水线**（从素材/选题到设定、分镜、分段视频模型提示词），而不是为了管理一个「提示词包内部工具」。当前 Studio 界面用 Prompt Pack 语境描述产品，左侧只显示 3 个阶段，用户无法看到自己熟悉的完整 SOP（含视频解析、选题闸门、风格确认、故事改编等），也无法在应用内完成「输入需求 → AI 给方案 → 我确认再继续」的测试。中栏与右栏的视觉与灵机 Cut 编辑器不一致，削弱专业工具的信任感。用户需要可选的项目起点（先解析视频或直接从选题开始），且选视频解析后仍必须经过选题闸门等完整流程。

## 解决方案

将 SceneForge Studio 重新定位为 **视频内容创作工坊**：统一文案与入口；用引擎定义的 **13 阶段分组流水线侧栏** 呈现全流程，并诚实标注每阶段在 Studio / Agent 的就绪状态；新建项目时让用户选择 **`source_intake` 或 `topic_gate` 入口**，数据写入项目配置；为中栏提供按阶段类型切换的工作区（core 运行面板、intake 解析与改编方向选择、topic_gate 风格与决策确认、其余支撑阶段的占位与 MCP 指引）；将布局、字号、面板头、按钮与 Tabs **对齐 Cut 编辑器与 DESIGN.md**，并把 SceneForge UI 纪律写入 CLAUDE.md；在 P0 内交付 **最小可测** 的 intake/gate 交互（含阻塞与确认态），不要求一次迁移全部旧 skill pack。

## 用户故事

1. 作为视频创作者，我想在打开工坊时看到「视频内容创作工坊」而不是「提示词包项目」，以便理解这是创作流水线而不是文档打包工具。
2. 作为创作者，我想在左侧看到完整的前期/制作/交付阶段列表，以便对照旧 SceneForge SOP 做端到端测试。
3. 作为创作者，我想看到每个阶段是「可在工坊操作」还是「需 Agent/MCP」还是「尚未实现」，以便知道下一步该点 UI 还是开 Agent。
4. 作为创作者，我想在新建项目时选择「从视频/链接解析开始」或「从选题与想法开始」，以便匹配两种真实工作方式。
5. 作为选择视频解析的用户，我想在完成 intake 后仍进入选题闸门与风格确认，以便流程与旧 SOP 一致。
6. 作为创作者，我想在 source_intake 后从多个改编方向中选一个，以便程序不会在未确认时偷偷推进。
7. 作为创作者，我想在 topic_gate 看到 AI 推荐的导演风格并确认后再进入参考分析，以便风格由我决定。
8. 作为创作者，我想在 topic_gate 输入或补充我的创作需求（桥段、热点、想法），以便 AI 方案基于我的意图。
9. 作为创作者，我想在 design/storyboard/video_prompts 继续使用运行、校验、审批与产物预览，以便核心交付物能力不回归。
10. 作为创作者，我想为每个阶段配置审批策略（必审/可选/校验通过自动/跳过），以便与 runner 手动/自动策略一致。
11. 作为创作者，我想在中栏完成当前阶段主任务、在右栏检查产物结构与复制，以便信息架构与 Cut 编辑器类似。
12. 作为创作者，我想中栏和右栏的字号、面板标题、按钮与 Cut 一致，以便整个应用像同一套专业工具。
13. 作为维护者，我想流水线侧栏数据来自单一阶段定义源，以便 UI 与引擎不会漂移。
14. 作为维护者，我想 entryPath 保存在 project.json.sceneforge 中，以便 MCP 与 Studio 读取同一配置。
15. 作为创作者，我想在支撑阶段看到清晰阻塞原因（例如「请先完成 topic_gate 风格确认」），以便知道卡在哪里。
16. 作为创作者，我想在 Setup/欢迎页入口看到与工坊一致的产品名，以便从创建到工作台语境统一。
17. 作为创作者，我想在 intake 工作区填写或粘贴视频链接（或选择本地文件入口），以便启动解析流程（P0 可为占位+runner/MCP 真实路径之一）。
18. 作为创作者，我想在 gate 工作区看到 go/observe/drop 或等价决策展示，以便理解是否继续投入制作。
19. 作为创作者，我想在选中任意阶段时看到该阶段的审批策略与 runner 类型，以便理解人工参与程度。
20. 作为维护者，我想 SceneForge 子组件（StageRunPanel、ArtifactCopyPanel）也使用统一 UI 组件，以便减少第三套样式。
21. 作为创作者，我想在 export 阶段从工坊触发提示词包导出，以便交付闭环可见。
22. 作为测试者，我想用 Vitest 覆盖流水线 UI 模型与 entryPath 逻辑，以便重构侧栏时不易回归。
23. 作为 Agent 用户，我想 MCP 仍能操作 core 三阶段，且文档说明支撑阶段如何通过 Agent 推进，以便 UI 与 Agent 分工清晰。
24. 作为创作者，我想侧栏对未到达的阶段显示依赖关系，以便理解顺序。
25. 作为创作者，我想在 topic_gate 从选题入口创建的项目也能稍后补做 intake，以便路径可纠偏而非写死。

## 实现决策

- **产品命名模块**：统一用户可见字符串「视频内容创作工坊」；技术标识保持 SceneForge。
- **流水线呈现模块**：从阶段定义生成侧栏分组（前期/制作/交付）、状态、就绪标签；选中阶段驱动中栏模板与右栏产物过滤。
- **能力矩阵模块**：静态表 + 运行时 state 推导每阶段 `studioReady` / `agentOnly` / `notImplemented` 及交互需求（userInput / aiProposal / userConfirm）。
- **入口路径模块**：`sceneforge.entryPath ∈ { source_intake, topic_gate }`；创建向导写入；侧栏与推荐「下一 stage」尊重 entryPath，**不**省略 topic_gate。
- **工作区模块族**：`CoreArtifactWorkspace`（沿用 StageRunPanel）、`IntakeWorkspace`、`GateWorkspace`、`SupportPlaceholderWorkspace`、`SystemExportWorkspace`。
- **HITL 闸门**：intake 改编方向 `pending` 时中栏仅允许选择方向；topic_gate 风格未 confirmed 时阻塞 reference 及之后；确认写回 artifact 或 sceneforge state（与现有 Artifact Store 一致，不引入任意路径写文件）。
- **UI Shell 模块**：三栏贴边布局、40px 列头、separator 分隔；复用 `src/ui` 的 Button、Tabs、Alert、InspectorSection、SettingsPageHeader（或等价）、Badge、EmptyState。
- **类型契约**：扩展 `project.json` sceneforge 段与 `src/types/sceneforge.ts`；IPC 若需 `sceneGetPipelineUi` 或扩展 `sceneGetProjectState` 返回 entryPath，须 main/preload/electron-api 同步。
- **Submit 扩展（P0，已 ADR）**：intake/gate 的用户确认与草案 **必须在 Studio 内** 经 `submitStageDraft` + Artifact Store 写回；见 `docs/adr/0001-sceneforge-entry-path-and-studio-hitl.md`。
- **CLAUDE.md 增补**：SceneForge 页面必须遵循 DESIGN.md 与 `src/ui`，禁止在 sceneforge 新样式中硬编码字阶；引用工坊产品名。

## 测试决策

- **好测试**：只断言侧栏阶段数量与分组、entryPath 默认与阻塞文案、能力标签、选中阶段切换工作区类型；不断言 CSS 类名实现细节。
- **需测模块**：`scene-pipeline-ui`、`scene-stage-capabilities`、`scene-entry-path`（纯函数 Vitest）；可选 `sceneforge-studio-shell.test.tsx`  smoke（data-testid 阶段列表、工坊标题文案）。
- **先例**：`tests/sceneforge-phase2-integration.test.ts`、`tests/electron-api.test.ts` 契约风格。
- **人工验收**：两种 entryPath 创建项目；侧栏 13 阶段；gate/intake 确认态；视觉与 Editor 对比检查清单（见 DESIGN.md）。

## 超出范围

- 全部支撑阶段 stage pack 从旧 skills 迁移完成。
- 真 ACP 多轮会话与项目内 Agent Chat 一体化。
- script/performance/reference 等完整 Studio 表单编辑器。
- 自动从 entryPath 一键跑完全链 `scene_start_stage`。
- ZIP 导出、publish 审核完整 UI。
- 修改 Cut 时间线、Remotion、TTS 主链路。

## 进一步说明

- 详细布局与 HITL 见同目录 `DESIGN.md`；问题溯源见 `PROBLEM-ANALYSIS.md`。
- 实施顺序建议：UI Shell + 文案 + 侧栏模型 → entryPath 创建流 → intake/gate 工作区 → submit/状态扩展 → CLAUDE.md。
- 用户已确认产品名与双入口策略；UI 对齐 Cut 为 P0 硬性要求。