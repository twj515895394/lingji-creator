# SceneForge P5 / issue 10 — Review 与功能 backlog（2026-06-19）

> 范围：侧栏产物 bug 修复 + P5（Shell 拆分、entryPath 文案、Prompt Pack 用户文案）+ 5 项改动自检。

## 1. 本轮改动摘要

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 侧栏不再展示核心产物链接 | ✅ | 移除 `stageArtifactLinks`；产物仅右侧检查器 |
| Shell 拆分 | ✅ | `SceneForgeStudio.tsx` **736 行**；`studio/Header`、`PipelineSidebar`、`Inspector` |
| entryPath 侧栏文案 | ✅ | `可跳过` / `推荐起点`（`scene-entry-path-ui.ts`） |
| 用户可见 Prompt Pack | ✅ | 导出区改为「导出核心产物包」等 |
| Vitest sceneforge-* | ✅ | **121 passed**（`sceneforge-ui.test.tsx` 待更新，见 §2） |

## 2. Review 发现与处理

| 严重度 | 问题 | 处理 |
| --- | --- | --- |
| **已修** | 侧栏挂产物并与右栏联动（用户反馈） | 已删侧栏产物列表 |
| **低** | `.stageArtifactLinks` CSS 死代码 | **已删除** |
| **低** | `tests/sceneforge-ui.test.tsx` 断言过时 | **已更新**（118+ sceneforge 测试通过） |
| **低** | `SceneForgeStudio.module.css` 误删 `.stageRowBlocked` 选择器 | **已修复**（review 续做） |
| **已修** | `ScenePrepSupportWorkspace` stage 类型（含 publish）与 IPC 窄类型不一致 | 已收窄为六个 Markdown 支撑阶段；`npx tsc --noEmit` 通过 |
| **信息** | 中栏 core 仍保留「核心产物 chip」快捷选产物 | 与侧栏不同，属工作区概览；若要与右栏完全单一入口可再收 |

## 3. 已完成能力（对照 handoff / next-batch）

- P0 工坊 + Phase2 基座（13 阶段、entryPath、HITL Markdown、三栏 Shell）
- mvp-closure：reference/story/assets + design 提交/占位
- next-batch **06–09**：storyboard/video 占位、LLM 未配置引导、script/performance/audio MVP
- next-batch **10（P5）**：Shell + entryPath 文案 + 产品文案（侧栏产物按 bug 修正）

## 4. 待开发 / 待完成（按优先级）

### P1 — 产品 / 流水线（handoff §3.2 + Phase2 overview）

| 项 | 说明 | 文档/包 |
| --- | --- | --- |
| **gate/intake 卡片式 HITL** | AI 改编方向卡片、评分只读、风格卡片确认；非仅 Markdown 表单 | 需新 PRD + 设计 + issues |
| **真 AI 全链** | 配置 LLM 后 design/storyboard/video **Direct LLM** 生成并提交（非 MVP 占位） | D3 Runner、已有 stage pack |
| **Continue 后自动 `sceneRunStage(next)`** | 产品需确认：当前 = 审批 + **切阶段**；用户曾期望「继续=自动跑 AI」 | 待 ADR/PRD |
| **Issue 20 / 全链 HITL** | script → export 占位链 Electron 验收记录 | `.scratch/sceneforge-studio/issues/20-*` |

### P2 — Phase2 gap / D4（支撑与工程）

| 项 | 说明 |
| --- | --- |
| **支撑 stage pack + direct_llm** | reference/story/assets 等由 pack+LLM 生成，非手写 Markdown MVP |
| **script pack** | gap-analysis P1 |
| **publish 阶段 Studio** | 现为 support 占位 |
| **context / handoff 深化** | audio/performance 语义校验、video 依赖完整接入（部分已在引擎） |
| **Regenerate / Request Revision UI** | 服务有部分能力，Studio 未接 |
| **项目级 style / selectedAssetIds 选择器** | IPC/API 未完整透传 UI |
| **侧栏 runner/approval 缩写 + hover** | P0 DESIGN §1.3 未做 |

### P2+ — 明确后置

| 项 | 说明 |
| --- | --- |
| script/performance **完整编辑器** | 超出 MVP PRD |
| **scene_start_stage 一键全链** | D4 |
| **真 ACP 多轮 / Agent Chat** | Phase2 overview §6 |
| **ZIP 导出** | 现有文件夹导出 |
| **All Artifacts 抽屉、专用 Design/Storyboard Workspace** | D4 UI |

### 工程 / 体验（非阻塞）

| 项 | 说明 |
| --- | --- |
| **git commit** | 分支大量未提交改动，按模块拆分 |
| **中栏 core 堆叠抛光** | MVP 占位 + Run + 策略 + FlowActions（handoff §4.1） |
| **Continue 产品文案** | 解释「继续≠自动 AI」 |
| **sceneforge-ui.test.tsx** | 与产品名、阶段 displayName 同步 |

## 5. 建议下一迭代顺序

1. 更新 `sceneforge-ui.test.tsx` + 可选删 `.stageArtifactLinks` CSS  
2. 人工走通 **design → export** 占位链，勾选 issue 20  
3. 立项 **gate 卡片 HITL** 或 **LLM 真生成 design**（二选一，先 PRD）  
4. git 拆分提交（用户确认后）

## 6. 验证

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```

修改 `electron/sceneforge/**` 后重启 Electron dev。

### 2026-06-18 工程收口复验

- `npx tsc --noEmit`：通过。
- `npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts`：33 files / 122 tests 通过。
- 人工验收由维护者后续执行；Agent 不再代操作完整 UI 链。
- 部分试跑观察：topic_gate 的 submit / validate / approve 已正确写盘，但 Continue 后 Renderer 未即时切换到 reference；重启后状态与侧栏恢复一致。建议维护者验收时复核刷新时序。
