# SceneForge 完整流程与 Runner 缺口分析

> 日期：2026-06-19  
> 背景：Support Pack Wave 自动化已完成；用户目标为**尽快打通完整创作流程**，并认为 **Direct LLM / ACP Agent 尚未完善接入流程**。  
> 优先级：**P1 Validator 深化（D）** 为最高开发优先级。

## 1. 当前「已通」与「未通」

### 已通（自动化 + 架构）

| 能力 | 状态 |
| --- | --- |
| 13 阶段定义、产物契约、状态机 | ✅ |
| Stage Pack + context-policy（reference→script、performance 读 script） | ✅ |
| **direct_llm**：能力表开放阶段、mock run→submit→validate | ✅ |
| **manual_submit**：支撑阶段 Markdown + Core 提交 | ✅ |
| Continue / Continue & Run（能力表驱动 canRun） | ✅ |
| Gate/Intake 卡片 HITL、handoff、Artifact Store | ✅ |
| 设置未配置 LLM → 引导「设置 → AI」 | ✅（历史包） |

### 未通或明显薄弱（完整流程视角）

| 能力 | 典型症状 | 与 Runner 关系 |
| --- | --- | --- |
| **语义校验（D）** | submit 仅「非空 Markdown」即 passed；质量差草案可污染下游 | 与 LLM/手工共用同一 validator |
| **必需上下文阻塞（UI）** | policy 标 required 输入缺失时可能仅 warnings，Studio 仍可点运行 | 影响 direct_llm **与** acp_agent |
| **direct_llm 真 Provider 链路** | 自动化 mock 绿 ≠ Electron 里选模型、重试、错误文案一致 | Issue 07 人工验收 |
| **acp_agent 端到端** | 能力表含 `acp_agent`，但 Studio **运行面板是否暴露、是否多轮、是否写回草案** 未与 Direct LLM 对齐 | **流程未完善** |
| **Regenerate / 修订** | 无统一「保留旧草案 / 请求修改」 | 两类 Runner 都缺 |
| **项目级 selectedAssetIds** | policy 可注入 style，项目 UI/IPC 不完整 | 影响生成质量 |
| **publish / 导出深化** | MVP 导出存在，publish 非完整工作区 | 后置包 |

**结论**：不是「还没接 LLM」，而是 **LLM 单路径（direct_llm + 显式 submit）在工程上已接好**；**ACP 与「校验 + 上下文阻塞 + 真机体验」** 还没形成与 manual/direct_llm 同级的**完整流程**。

## 2. Runner 三路径应对齐的「同一出口」

```text
manual_submit ──┐
direct_llm    ──┼──► pending draft / editor ──► sceneSubmitStageDraft
acp_agent     ──┘         ▲                           │
                            │                           ▼
                     StageRunPanel              validate → approve → handoff
```

**完整流程定义（建议）**：

1. 进入阶段 → **阻塞清单**（缺 required 上游则禁用 Run，并说明缺什么 artifact）。
2. 用户选 **手写 / Direct LLM / ACP Agent**（若该阶段 capability 支持）。
3. Run **不写盘** → 审阅 → 显式 Submit。
4. **语义 + 结构** validator → 失败可改稿或重跑 Runner。
5. Approve / auto_if_valid → handoff → Continue(& Run)。

当前缺口主要集中在 **步骤 1、4、2 的 acp_agent 分支**。

## 3. P1 Validator 深化（D）— 建议范围

### 3.1 现状推断（需实现时读代码确认）

- `validators.*.ts` 多委托 `validatePrepSupportStage`：多为**存在性/非空**级。
- Core 阶段可能有更严契约；support 的 performance/audio/script/assets **无节拍/分段/引用边界** 级检查。

### 3.1 目标行为

| 阶段 | 校验层次（示例） |
| --- | --- |
| script | 至少 N 段；含旁白/对白标记；总时长与 topic brief 偏差提示 |
| performance | 与 script_draft 段落可对应；含情绪/动作关键词 |
| audio | 与 storyboard 段数或镜头组引用；非空结构标题 |
| assets | 角色/场景/道具列表与 story beats 数量级一致；含优先级段落 |

实现原则：

- Validator **只读已提交 artifact 文本**（+ 可选只读上游 artifact），不调用 LLM。
- 失败返回 **结构化 issues**（code + message + severity），Studio 展示为阻塞或 warning（与产品约定：blocking 才禁止 approve）。

### 3.2 与上下文阻塞联动

- `getStageContext` 已区分 requiredInputs / warnings → Studio 应：**warnings 可展示，required 缺失则 disable Run**（direct_llm 与 acp_agent 一致）。
- 测试：`sceneforge-stage-context*.test.ts` + UI 测试补「缺 story 不能跑 assets」等。

## 4. ACP Agent 接入（流程完善，建议单独立项于 D 之后或 D 包内 Issue 0）

### 4.1 待核对（开发时 TDD 第一项）

- `scene-stage-runner.ts`：`acp_agent` 是否仅注册无实现。
- `StageRunPanel` / `SceneForgeStudio`：是否只渲染 direct_llm，无 Agent 会话入口。
- Electron `electron/acp/` 与 SceneForge `runStage({ runner: 'acp_agent' })` IPC 是否贯通。

### 4.2 目标（与 ADR 一致）

- 与 direct_llm 相同：**run 返回草案，不自动 submit**。
- ACP 多轮在 Runner 内或专用面板完成，最终仍走 **显式 Submit + validator**。
- 权限与 API Key 沿用现有 Agent 配置，不新增隐式消耗。

**说明**：handoff 将「真 ACP 多轮 Agent Chat」标为后置；若你要「完整流程」，建议最小切片为：**单阶段 acp_agent run 一次 → 草案进 StageRunPanel**（多轮可二期）。

## 5. 推荐实施顺序（包名建议：`sceneforge-flow-hardening`）

```text
Phase A — 流程硬化（优先 D）
  A1 Context 必需输入 UI 阻塞 + 测试
  A2 script / performance 语义 validator + 测试
  A3 audio / assets 语义 validator + 测试
  A4 Validator 失败在 Studio 展示（复用现有 validation UI）

Phase B — Runner 对齐
  B1 盘点 acp_agent runner + IPC + StageRunPanel 接线
  B2 acp_agent 单阶段 happy path（mock ACP）与 direct_llm 同测矩阵
  B3 Issue 07 类 Electron 验收扩展（含 ACP 一切片）

Phase C — 体验（可并行立项）
  C1 selectedAssetIds 项目选择器（issues/10）
  C2 Regenerate / revision
```

## 6. 文档与 issues 下一步

1. 本文件作为 **问题分析** 放入 `.scratch/sceneforge-flow-hardening/PROBLEM-ANALYSIS.md`（或合并 PRD）。
2. 补 **PRD + 详细设计**（validator 规则表、blocking 策略、ACP 最小切片）。
3. `to-issues` 拆 **A1–A4、B1–B2** 为 AFK issues，**先 A1 再 A2**（垂直切片）。

## 7. 请你确认的产品决策（开工前）

1. **Required 上下文缺失**：一律禁止 Run，还是仅 Core 禁止、support 仅警告？
2. **语义 validator 失败**：一律 `validation.status = failed` 禁止推进，还是 warning 可 approve？
3. **ACP 最小范围**：仅「能跑通一次草案」是否满足你说的「完整流程」，还是必须多轮对话？

确认后即可按 `brainstorming` → `writing-plans` → `tdd` 开 A1。