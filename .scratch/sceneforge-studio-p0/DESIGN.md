# SceneForge Studio P0 — 详细设计方案

> 日期：2026-06-17  
> 状态：草案（供实现与 PRD 引用）  
> 设计系统真理来源仍为仓库根 `DESIGN.md`；本文只描述 SceneForge 布局与行为。

## 1. 信息架构

### 1.1 应用内定位

- 模块名（用户可见）：**视频内容创作工坊**
- 技术模块名保持不变：`SceneForge` / `sceneforge` 路由与 IPC。
- 副文案（一句）：`从选题与素材到设定、分镜与视频模型提示词`

### 1.2 布局（对齐 Cut Editor）

采用 **贴边三栏 + 顶栏**，避免「页面内再套三个圆角大卡片」：

```text
┌──────────────────────────────────────────────────────────────┐
│ 顶栏：工坊标题 + 项目路径摘要 + 全局状态 Badge                │
├────────────┬─────────────────────────────┬───────────────────┤
│ 流水线侧栏  │ 阶段工作区（主任务）          │ 产物检查器         │
│ 分组列表    │ 输入 / 运行 / 确认 / 状态     │ Tabs + 预览       │
│ 230–260px  │ flex 1                      │ 260–300px         │
└────────────┴─────────────────────────────┴───────────────────┘
```

- 外容器：`min-height: 100%`，`background: var(--color-window-bg)`，**无** 24px 全页 padding（与 `Editor.module.css` 一致）。
- 列分隔：`1px solid var(--color-separator)`，面板底：`var(--color-panel-bg)`。
- 列头：**40px**，`padding: 0 12px`，标题 `var(--font-size-md)` + `font-weight: 600`（复用 Cut 面板头模式或 `PanelHeader` compact 变体）。

### 1.3 流水线侧栏

**数据源**：`SCENE_STAGE_DEFINITIONS`（主进程定义同步到 renderer 的 `scene-pipeline-ui` 模块，避免双份真相）。

**分组**（category + 业务语义）：

| 组 | 阶段 |
| --- | --- |
| 前期 | source_intake, topic_gate, reference, story, assets |
| 制作 | design, script, performance, storyboard, audio |
| 交付 | video_prompts, publish, export |

**每行展示**：

- 显示名（中文优先，可映射表）
- 状态图标：未开始 / 进行中 / 等待确认 / 已通过 / 阻塞
- 次要信息：`approval` 缩写 + `runner` 缩写（hover 或展开见全文）
- **就绪标签**：`Studio` | `MCP/Agent` | `未实现`（由 capability 矩阵计算）

**与 entryPath 联动**：

- `entryPath: topic_gate`：intake 显示为「可跳过」，默认折叠或灰显，用户仍可手动点开。
- `entryPath: source_intake`：intake 为推荐起点，高亮；topic_gate 在 intake 未满足依赖前显示阻塞原因。

### 1.4 阶段工作区（中栏）

按 `selectedStage` 切换 **工作区模板**：

| 模板 | 适用阶段 | 内容 |
| --- | --- | --- |
| `CoreArtifactWorkspace` | design, storyboard, video_prompts | 现有概览 + `StageRunPanel` + 校验/审批 |
| `IntakeWorkspace` | source_intake | 源类型选择、URL/文件占位、运行 runner、改编方向列表与「待用户选择」闸门 UI |
| `GateWorkspace` | topic_gate | 用户意图输入、评分结果只读区、风格候选列表、确认按钮（确认前阻塞下游） |
| `SupportPlaceholderWorkspace` | 其他 support | 说明 + MCP 指引 + 只读 state/artifact 链接 |
| `SystemExportWorkspace` | export | 导出入口（复用现有 export 能力） |

**诚实反馈**：若阶段无 Studio submit，主 CTA 为「在 Agent 中运行」并展示 MCP 工具名，禁止假「提交成功」按钮。

### 1.5 产物检查器（右栏）

- 使用 `Tabs`（`src/ui/components/tabs.tsx`），与 Editor 侧栏一致。
- 区块使用 `InspectorSection`。
- 警告/校验失败用 `Alert`。
- 复制区保留 `ArtifactCopyPanel`，样式改为 token + 共用 Button。

## 2. 项目入口（新建 / 配置）

### 2.1 数据模型（扩展 `project.json.sceneforge`）

```yaml
sceneforge:
  entryPath: source_intake | topic_gate   # 用户创建时选择
  pipelineUi:
    collapsedGroups: string[]             # 可选，侧栏 UI 状态
```

- 默认：`topic_gate`（纯想法/桥段起点）。
- 选 `source_intake` 时：`state` 或路由逻辑将「推荐下一 stage」设为 intake，**不跳过** topic_gate。

### 2.2 创建流程 UI

在 `sceneforge-setup` 或欢迎页创建向导增加一步：

- 单选：**从视频/链接解析开始** → `entryPath: source_intake`
- 单选：**从选题与创作想法开始** → `entryPath: topic_gate`
- 说明：选解析视频后，仍会经过选题闸门与风格确认。

## 3. HITL 状态（topic_gate / intake）

### 3.1 intake — 改编方向闸门

当 artifact 或 state 表明 `adaptation_selection.status === pending`：

- 中栏展示 5–10 条方向卡片（只读，内容来自 artifact 或 runner 结果）。
- 用户必须 **选择一项** 后，才允许「继续到 topic_gate」或解除 topic_gate 内对 rewrite 的阻塞。
- P0 可先：**选择写入 manual artifact 补丁** 或调用扩展后的 submit API。

### 3.2 topic_gate — 风格与决策确认

- 展示 `decision`、风格家族候选、推荐导演风格包。
- `confirmations.style_*` 未 confirmed 时，侧栏 reference 及之后阶段显示 **阻塞**。
- P0：确认动作为明确按钮 + 写回 project state / artifact（与旧 YAML 补丁语义对齐的 JSON 段）。

## 4. UI 组件与 token 映射（实施清单）

| 区域 | 使用 |
| --- | --- |
| 顶栏标题 | `SettingsPageHeader` 或等价 pattern |
| 列标题 | Cut 式 40px header 或 `PanelHeader` |
| 按钮 | `Button` |
| 策略选择 | `PillGroup` 或 `Select`（ui） |
| 检查器 Tabs | `Tabs` |
| 空态 | `EmptyState` |
| 统计格 | `SummaryCard` / `FieldGrid` |
| Token | `--font-size-*`, `--space-*`, `--color-panel-bg`, `--color-separator` |

**禁止**：SceneForge 新代码中新增 `font-size: 11px` 等字面量（除非对齐 `tokens.css` 已有变量）。

## 5. 深模块划分（便于测试）

| 模块 | 职责 |
| --- | --- |
| `scene-pipeline-ui` | 从 stage definitions 生成侧栏模型、分组、就绪标签 |
| `scene-stage-capabilities` | 每 stage 的 Studio/MCP/未实现、输入/确认需求 |
| `scene-entry-path` | entryPath 读写、推荐起点、依赖阻塞文案 |
| `SceneForgeStudioShell` | 纯布局与 design system 组合 |
| `*Workspace` 组件 | 各阶段工作区，薄、可单测 |

## 6. 与 Phase 2 文档关系

- 引擎阶段定义：`electron/sceneforge/pipeline/scene-stage-definitions.ts`
- Skill 迁移：`docs/sceneforge/2026-06-17-sceneforge-stage-pack-migration-design.md`
- 本设计 **不替代** Phase 2 overview，只补齐 **产品可测 P0** 的 UI 与入口层。