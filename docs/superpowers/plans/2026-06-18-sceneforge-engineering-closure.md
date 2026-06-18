# SceneForge Engineering Closure Implementation Plan

> **For agentic workers:** 按任务顺序执行；每个任务完成后运行对应验证。未经用户确认不提交 Git。

**Goal:** 消除当前 SceneForge 小型工程债，使类型、测试、issues 与人工验收记录保持一致。

**Architecture:** 不改动 SceneForge 产品语义，只收窄 Renderer 阶段类型、补外部行为测试、更新本地 issue 状态并执行 Electron 人工回归。所有修改保持在现有 SceneForge 边界内。

**Tech Stack:** TypeScript、React 19、Electron、Vitest、本地 Markdown issue tracker。

---

## 改动范围

### 修改

- `src/sceneforge/components/workspace/ScenePrepSupportWorkspace.tsx`
- `src/sceneforge/lib/scene-prep-support-stages.ts`
- `tests/sceneforge-workspace-routing.test.ts` 或新增窄范围类型守卫测试
- `.scratch/sceneforge-next-batch/issues/06-core-full-chain-mvp-placeholders.md`
- `.scratch/sceneforge-next-batch/issues/07-engineering-handoff.md`
- `.scratch/sceneforge-next-batch/issues/08-direct-llm-settings-hint.md`
- `.scratch/sceneforge-next-batch/issues/09-production-support-mvp.md`
- `.scratch/sceneforge-next-batch/issues/10-ui-debt-backlog.md`
- `.scratch/sceneforge-studio/issues/20-studio-stage-run-ux-hitl.md`
- `.handoff/` 下新建本轮验收记录

### 不修改

- Continue 的现有语义。
- Stage Pack、Runner、Validator 业务行为。
- Cut 主编辑器、时间线、Remotion。
- package 版本与 CHANGELOG。

## Task 1：收窄可提交支撑阶段类型

**目标行为：** `ScenePrepSupportWorkspace` 只能接收 `getPrepSupportConfig` 支持且 IPC 允许提交的阶段，`publish`、`export` 不可能进入提交调用。

- [ ] 在 `scene-prep-support-stages.ts` 导出明确的窄类型：

```ts
export type PrepSupportSubmitStage =
  | 'reference'
  | 'story'
  | 'assets'
  | 'script'
  | 'performance'
  | 'audio';
```

- [ ] 将类型守卫签名收窄为：

```ts
export function isMarkdownSupportSubmitStage(
  stage: SceneStageId,
): stage is PrepSupportSubmitStage;
```

- [ ] 将 `ScenePrepSupportWorkspaceProps.stage` 改为 `PrepSupportSubmitStage`。
- [ ] 保持 `SceneForgeStudio` 先通过 `isPrepSupportSubmitStage(selectedStage)` 再渲染组件，使 TypeScript 完成控制流窄化。
- [ ] 不扩展 IPC 枚举到 `publish` 或 `export`，因为这两个阶段尚无对应提交 UI。

## Task 2：补类型守卫外部行为测试

**测试文件：** `tests/sceneforge-workspace-routing.test.ts`

- [ ] 添加表驱动测试，断言以下阶段返回 true：

```text
reference, story, assets, script, performance, audio
```

- [ ] 断言以下阶段返回 false：

```text
source_intake, topic_gate, design, storyboard, video_prompts, publish, export
```

- [ ] 运行：

```bash
npx vitest run tests/sceneforge-workspace-routing.test.ts
```

预期：测试通过。

## Task 3：完成静态验证

- [ ] 运行：

```bash
npx tsc --noEmit
```

预期：退出码 0，不再出现 `ScenePrepSupportWorkspace.tsx(52,9) TS2322`。

- [ ] 运行：

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
```

预期：现有 121 条及新增测试全部通过。

- [ ] 从 Code Review 视角检查：
  - 类型守卫是否与 `SUPPORT_DRAFT_CONFIG` 一致。
  - 没有通过 `as` 掩盖非法阶段。
  - 没有扩展未实现的 IPC 能力。
  - 没有修改用户可见行为。

## Task 4：同步本地 issues 状态

- [ ] 对 issues 06–09，逐条依据代码和测试勾选已满足的验收标准，并将 `Status:` 改为 `completed`。
- [ ] 保持 issue 10 为 `completed`，补充侧栏产物链接修复和 121 tests 验证记录。
- [ ] Issue 20 只勾选已有自动化证据支持的项目；Electron 人工试跑未执行前保持未勾选。
- [ ] 在每个 issue 的 `## 评论` 下记录验证命令、日期和结果，避免只改状态不留证据。

## Task 5：Electron 人工全链验收

修改过 `electron/sceneforge/**` 的工作区需要先重启 Electron：

```bash
npm run dev
```

按以下顺序执行，每步记录提交、Validate、Continue 和右栏产物状态：

1. topic_gate → reference
2. reference → story
3. story → assets
4. assets → design
5. design → script
6. script → performance
7. performance → storyboard
8. storyboard → audio
9. audio → video_prompts
10. video_prompts → export

验收要求：

- [ ] 无 LLM 时可使用 MVP 占位走完整链。
- [ ] 配置 LLM 时至少用 Direct LLM 运行一个 Core 阶段。
- [ ] 运行结果不会自动写盘；点击“提交草案到产物库”后才出现产物。
- [ ] 侧栏只显示阶段；右侧检查器显示产物。
- [ ] 导出目录包含 manifest 和已审批 Core 产物。
- [ ] 将结果写入新的 `.handoff/handoff-<timestamp>-sceneforge-engineering-closure.md`。

## Task 6：交付前检查

- [ ] `git diff --stat` 确认仅包含本计划范围改动。
- [ ] `git status --short` 列出新增验收文档。
- [ ] 不自动 stage、不 commit。
- [ ] 向用户汇报：改动范围、影响面、验证结果、剩余风险和建议提交拆分。

## 风险与回滚

| 风险 | 缓解 | 回滚 |
| --- | --- | --- |
| 类型守卫列表与后端配置再次漂移 | 表驱动测试锁定阶段集合 | 恢复类型守卫与 props 的修改 |
| 人工验收误把占位当真生成 | 验收记录标注 runner 与产物来源 | 删除本次测试项目，不改正式项目 |
| issues 状态早于证据 | 每项勾选必须附命令或人工步骤 | 恢复未勾选状态 |

