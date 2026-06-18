# SceneForge Studio P0 — 问题记录与分析

> 日期：2026-06-17  
> 状态：已确认方向（用户拍板产品名与入口策略）  
> 关联：handoff `.handoff/handoff-20260617-171500.md`

## 1. 问题清单（用户反馈）

| ID | 问题 | 严重性 |
| --- | --- | --- |
| P1 | 界面把产品说成「提示词包 / Prompt Pack」，与「视频内容创作 + 提示词交付」主价值错位 | 高 |
| P2 | 左侧仅 3 个 core 阶段，引擎 13 阶段不可见，无法按完整 SOP 理解与测试 | 高 |
| P3 | 缺少用户输入、AI 方案推荐、用户确认（改编方向、风格、go/observe/drop）等产品化交互 | 高 |
| P4 | 入口应可选：从 `source_intake`（解析视频）或从 `topic_gate`（选题/想法）开始；选 intake 后仍走完整 topic_gate 及后续链 | 高 |
| P5 | 中栏、右栏相对左栏「样式乱」：字号、面板头、组件未对齐 Cut 编辑器与 `DESIGN.md` | 中 |
| P6 | 当前实现仅为 Phase 2 技术底座 + core 三阶段闭环，**不具备端到端可测的产品完成度** | 高（认知） |

## 2. 根因分析

### 2.1 产品表述（P1）

- Studio 页眉硬编码「提示词包项目 · Prompt Pack Project」。
- 工作区 copy 强调「受控提交、校验、审批」，像内部管线工具。
- **根因**：Phase 1/2 以「Prompt Pack 工程」为实施目标命名，未同步为面向创作者的产品语言。

### 2.2 阶段可见性（P2）

- UI 使用本地常量 `coreStages`（3 项），未消费 `SCENE_STAGE_DEFINITIONS`（13 项）。
- 支撑阶段无 pack / validator / Studio 工作区，但**即使未实现也应可见并标注就绪状态**（诚实反馈，见 `DESIGN.md` Honest Feedback）。
- **根因**：Studio 按「先交付 core 产物预览」实现，未做流水线导航与配置化审批的呈现层。

### 2.3 交互缺口（P3）

旧 SOP（`scene_forge/.agents/skills`）明确要求：

- **scene-video-intake**：5–10 个改编方向 + `user_selection_required` 闸门。
- **scene-topic-gate**：七维评分、go/observe/drop、风格家族与导演风格**用户确认**后方可进 reference。

现 Studio：无 intake/gate 工作区；MCP `scene_submit_stage_draft` 等枚举仍偏 core 三阶段；`acp_agent` 为简报 MVP。

- **根因**：支撑阶段迁移优先级为 P2 后，产品 UI 未并行设计 HITL 状态机与确认卡片。

### 2.4 入口路径（P4）

- 引擎链：`source_intake` → `topic_gate` → …（intake 可跳过但 topic_gate 仍在链上）。
- 用户需要**创建项目时选择起点**：「先解析视频」vs「直接从选题闸门开始」。
- **根因**：无 `entryPath` / `firstStage` 项目级配置与新建向导 UI。

### 2.5 UI 不一致（P5）

对比 Cut `Editor` 与 `SceneForgeStudio`：

- SceneForge 未使用 `src/ui` 的 Button、Tabs、Alert、PanelHeader、InspectorSection 等。
- 页面级 24px padding + 三列圆角卡片，与 Cut 的 separator 贴边工作区不一致。
- 字号 11–24px、`font-weight: 650` 等字面量，违反 `DESIGN.md` 字阶与 token 规则。

- **根因**：SceneForge 为独立页面快速搭建，未纳入设计系统收敛迭代。

## 3. 已确认产品决策（2026-06-17）

| 决策 | 内容 |
| --- | --- |
| 产品称谓 | **视频内容创作工坊**（Studio 页眉/入口主标签） |
| 入口 | 用户可选 **`source_intake`** 或 **`topic_gate`** 为项目起点；若选 intake，完成后仍进入 **完整 topic_gate 流程**（及后续 13 阶段链） |
| 审批 | 与现有 `approval_policy` + `runner` 并列，全阶段可配置 |
| UI | 对齐 Cut：`DESIGN.md` + `src/ui/*` + Editor 面板模式；规范写入 `CLAUDE.md` |
| HITL 写回 | **Studio 内 `submitStageDraft`**（非仅 Agent）；见 ADR-0001 |
| Issues 粒度 | 12 条垂直切片已确认；依赖 04→05→06→07 再 intake/gate |

## 4. 范围边界（本 P0 包）

- **在范围内**：文案、Shell/UI 对齐、全阶段侧栏、能力矩阵、entryPath、intake/gate **最小可测**工作区（含确认态展示）、文档与 issues。
- **不在 P0**：全支撑阶段 pack 迁移、真 ACP 会话循环、ZIP 导出、自动 `scene_start_stage` 链、专用大型 Workspace 编辑器。

## 5. 验证口径

- `npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts`
- `npx tsc --noEmit`
- 人工：新建项目选两种入口 → 侧栏见 13 阶段 → gate/intake 工作区可输入或见阻塞说明 → 中/右栏视觉与 Editor 一致。