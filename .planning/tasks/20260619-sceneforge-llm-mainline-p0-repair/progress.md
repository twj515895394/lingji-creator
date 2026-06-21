# Progress

## 2026-06-19

### Phase 1: 范围确认与断点建模
- **Status:** complete
- **Started:** 2026-06-19 00:06
- Actions taken:
  - 读取最新 handoff、主计划、stage rehydration 记录与相关技能说明
  - 定位 P0 代码入口：`SceneForgeStudio`、`StageRunPanel`、`useSceneStageContinuation`
  - 确认当前测试入口以状态机、service、SSR UI、continuation hook 为主
- Files created/modified:
  - `.planning/tasks/20260619-sceneforge-llm-mainline-p0-repair/task_plan.md` (created)
  - `.planning/tasks/20260619-sceneforge-llm-mainline-p0-repair/findings.md` (created)
  - `.planning/tasks/20260619-sceneforge-llm-mainline-p0-repair/progress.md` (created)

### Phase 2: 失败用例补齐
- **Status:** complete
- Actions taken:
  - 先跑 `tests/sceneforge-stage-continuation.test.ts`、`tests/sceneforge-ui.test.tsx`、`tests/sceneforge-service.test.ts`、`tests/sceneforge-state-machine.test.ts` 建基线，确认现有覆盖仍全绿
  - 顺着 handoff 与 continue-run issue 复核后，发现 `topic_gate` 文案要求使用 Validate / Continue，但页面并未渲染 flow actions
  - 为阶段动作集合新增定向测试，锁住 `topic_gate` 必须处于统一 Validate / Continue 通道
- Files created/modified:
  - `tests/sceneforge-stage-capabilities.test.ts` (modified)

### Phase 3: 最小修复实现
- **Status:** complete
- Actions taken:
  - 在 `src/sceneforge/lib/scene-stage-capabilities.ts` 新增 `stageUsesFlowActions(stage)`，集中定义哪些阶段应显示 Validate / Continue
  - 在 `SceneForgeStudio` 中改为使用统一 helper 渲染 flow actions，并把 `topic_gate` 纳入动作入口
  - 为 gate 阶段补充 Continue 禁用原因，避免 `drop` 决策时出现不准确提示
- Files created/modified:
  - `src/sceneforge/lib/scene-stage-capabilities.ts` (modified)
  - `src/sceneforge/pages/SceneForgeStudio.tsx` (modified)

### Phase 4: 回归验证
- **Status:** complete
- Actions taken:
  - 运行定向 vitest 与 TypeScript 类型检查，确认本轮改动未引入回归
- Files created/modified:
  - 无

### Phase 5: 文档与状态同步
- **Status:** complete
- Actions taken:
  - 更新本 task 的 task_plan / findings / progress
  - 同步主线 `IMPLEMENTATION-PLAN.md`
  - 新增 `StageRunPanel` 行为测试，锁住“提交失败后草案仍保留在审核区”
  - 增强 `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md`，补入当前主线最小连续验收矩阵、gate P0 回归观察项、Continue & Run 失败记录字段
- Files created/modified:
  - `.planning/tasks/20260619-sceneforge-llm-mainline-p0-repair/task_plan.md` (modified)
  - `.planning/tasks/20260619-sceneforge-llm-mainline-p0-repair/findings.md` (modified)
  - `.planning/tasks/20260619-sceneforge-llm-mainline-p0-repair/progress.md` (modified)
  - `tests/sceneforge-stage-run-panel.test.tsx` (created)
  - `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md` (modified)

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| P0 baseline | `npx vitest run tests/sceneforge-stage-continuation.test.ts tests/sceneforge-ui.test.tsx tests/sceneforge-service.test.ts tests/sceneforge-state-machine.test.ts` | 相关基线通过 | 4 files, 20 tests passed | ✓ |
| Flow action regression | `npx vitest run tests/sceneforge-stage-capabilities.test.ts tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-hitl-adaptation-gate.test.ts` | 新增阶段动作规则与相关流程测试通过 | 4 files, 19 tests passed | ✓ |
| Draft preservation | `npx vitest run tests/sceneforge-stage-run-panel.test.tsx` | 提交校验失败后草案审核区仍保留 | 1 file, 1 test passed | ✓ |
| P0 regression pack | `npx vitest run tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-stage-capabilities.test.ts tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-hitl-adaptation-gate.test.ts` | P0 相关保护全部通过 | 5 files, 20 tests passed | ✓ |
| Type check | `npx tsc --noEmit` | 无类型错误 | 通过 | ✓ |
| Checklist sync | 更新 `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md` | 现有真机清单覆盖当前主线 P0/P1 关注点 | 已完成，未新增自动化命令 | ✓ |

### Phase 6: 阶段运行会话恢复
- **Status:** complete
- Actions taken:
  - 新增 `src/sceneforge/store/scene-stage-run-session.ts`，按 `projectDir + stage` 缓存运行会话
  - `StageRunPanel` 改为从会话 store 读写 `pendingArtifacts / pendingRequiredKeys / refinementPrompt / lastHint / error / running/submitting`
  - `runnerType` 初始值与恢复逻辑接入 stage session，避免切回来后执行方式错位
  - stage session 新增 `sessionStorage` 持久化，覆盖同一次应用会话里的页面级重建
  - 对持久化恢复时的 `running/submitting` 做保守降级：有草案则恢复为 `ready`，无草案则退回 `idle`
  - `SceneForgeStudio` 在阶段提交成功后主动刷新项目状态并重新选中当前阶段推荐产物，补强提交后回显
  - 新增回归测试，验证提交失败后草案仍保留、已缓存草案在 rerender 后仍能恢复显示、以及 runnerType 可从缓存恢复
- Files created/modified:
  - `src/sceneforge/store/scene-stage-run-session.ts` (created)
  - `src/sceneforge/components/stage-run/StageRunPanel.tsx` (modified)
  - `src/sceneforge/pages/SceneForgeStudio.tsx` (modified)
  - `tests/sceneforge-stage-run-panel.test.tsx` (modified)
  - `tests/sceneforge-stage-run-session-store.test.ts` (created)
  - `tests/helpers/storage-mock.ts` (created)

## Additional Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Session recovery regression | `npx vitest run tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-stage-capabilities.test.ts` | 切走再回来相关保护通过 | 4 files, 18 tests passed | ✓ |
| Post-fix type check | `npx tsc --noEmit` | 无类型错误 | 通过 | ✓ |
| Session store + runner restore | `npx vitest run tests/sceneforge-stage-run-session-store.test.ts tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-stage-capabilities.test.ts` | 草案、runnerType、session store 恢复保护通过 | 5 files, 22 tests passed | ✓ |
| Session storage persistence | `npx vitest run tests/sceneforge-stage-run-session-store.test.ts tests/sceneforge-stage-run-panel.test.tsx tests/sceneforge-ui.test.tsx tests/sceneforge-stage-continuation.test.ts tests/sceneforge-stage-capabilities.test.ts` | 页面级恢复与 transient status 降级保护通过 | 5 files, 23 tests passed | ✓ |

## Remaining Work
- 自动化已覆盖主线 P0/P1 的大部分 renderer/state seam。
- 当前真正未完成的是 Electron 真机连续验收，以及验收中若暴露问题后的单缺陷修复。
- 手测过程中新增一个已确认后续包：`topic_gate` 的“选题评分”不应继续作为假展示存在，需要升级为真实 Direct LLM 分析闸门。
- 当前环境对 Electron 真机自动化有阻塞：
  - 桌面可访问性树抓不到当前 Electron 窗口
  - Playwright 受控拉起 Electron 进程失败
- 因此已把剩余人工验收点、代码触点、测试命令完整回写到：
  - `.scratch/sceneforge-llm-mainline-closure/IMPLEMENTATION-PLAN.md`
  - `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md`

### 2026-06-19：补 Topic Gate LLM Analysis 设计包
- **Status:** complete
- Actions taken:
  - 对照旧 `scene_forge` 的 `scene-topic-gate` skill 与输出契约，确认该阶段本应承担真实评分、决策建议和风格候选建议
  - 复核当前 `lingji-creator` 实现，确认“选题评分”仅是 `topic_brief` 的文本解析占位，不是可验收能力
  - 新建 `.scratch/sceneforge-topic-gate-llm-analysis/` 文档包，补齐 PRD、详细设计、实施计划和 4 个 issues
  - 更新后续包索引，登记 `Topic Gate LLM Analysis` 作为新的 LLM 主链后续包
- Files created/modified:
  - `.scratch/sceneforge-topic-gate-llm-analysis/PRD.md` (created)
  - `.scratch/sceneforge-topic-gate-llm-analysis/IMPLEMENTATION-PLAN.md` (created)
  - `.scratch/sceneforge-topic-gate-llm-analysis/issues/01-topic-analysis-contract.md` (created)
  - `.scratch/sceneforge-topic-gate-llm-analysis/issues/02-direct-llm-topic-gate-analysis.md` (created)
  - `.scratch/sceneforge-topic-gate-llm-analysis/issues/03-topic-gate-analysis-workspace-ui.md` (created)
  - `.scratch/sceneforge-topic-gate-llm-analysis/issues/04-validator-legacy-e2e.md` (created)
- `docs/sceneforge/2026-06-19-sceneforge-topic-gate-llm-analysis-design.md` (created)
- `docs/sceneforge/2026-06-18-sceneforge-follow-on-packages-index.md` (modified)

### 2026-06-20：Script / Performance contract 对齐
- **Status:** complete
- Actions taken:
  - 将 `script` 与 `performance` 的手动模板从 MVP 占位升级为正式 contract 示例，补齐 beat / VGU / handoff / continuity 结构
  - 收紧 `prompts/sceneforge/stages/script/*` 与 `prompts/sceneforge/stages/performance/*`，要求下游可消费内容而不是只有 section marker
  - 将 `semantic-support-stages.ts` 从“短文本 + 关键词”升级为 section 级语义校验，新增对空壳 `story_beats`、`video_generation_unit_plan`、`performance_handoff`、`storyboard_handoff` 与 continuity 内容的拦截
  - 同步更新 `tests/sceneforge-semantic-validators.test.ts`、`tests/sceneforge-support-submit.test.ts`、`tests/sceneforge-support-llm-happy-path.test.ts`、`tests/sceneforge-validator.test.ts` 的有效/无效样例
  - 修复一次 section 抽取误判：最初用正则切 section 时把 `script_body` 子标题误当成下一个正式 section，后改为按行扫描顶层英文 marker
- Files created/modified:
  - `electron/sceneforge/validators/semantic-support-stages.ts` (modified)
  - `electron/sceneforge/validators/validators.script.ts` (modified)
  - `electron/sceneforge/validators/validators.performance.ts` (modified)
  - `src/sceneforge/lib/scene-prep-support-stages.ts` (modified)
  - `prompts/sceneforge/stages/script/system.md` (modified)
  - `prompts/sceneforge/stages/script/user.md` (modified)
  - `prompts/sceneforge/stages/script/review-checklist.md` (modified)
  - `prompts/sceneforge/stages/performance/system.md` (modified)
  - `prompts/sceneforge/stages/performance/user.md` (modified)
  - `prompts/sceneforge/stages/performance/review-checklist.md` (modified)
  - `tests/sceneforge-semantic-validators.test.ts` (modified)
  - `tests/sceneforge-support-submit.test.ts` (modified)
  - `tests/sceneforge-support-llm-happy-path.test.ts` (modified)
  - `tests/sceneforge-validator.test.ts` (modified)

## Latest Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Script/performance contract regression | `npx vitest run tests/sceneforge-semantic-validators.test.ts tests/sceneforge-support-submit.test.ts tests/sceneforge-support-llm-happy-path.test.ts tests/sceneforge-stage-pack.test.ts tests/sceneforge-validator.test.ts` | `script / performance` 的 validator、happy path、pack 回归通过 | 5 files, 78 tests passed | ✓ |
| Post-alignment type check | `npx tsc --noEmit` | 无类型错误 | 通过 | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-06-20 | `script/performance` 正常样例被新 semantic validator 误判失败 | 初版用正则抽取 section，误把 `script_body` 中的 `## 第N段` 当成下一个正式 section | 改为按行扫描顶层英文 marker 进行 section 截取，相关回归恢复全绿 |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 2: 失败用例补齐 |
| Where am I going? | 失败用例补齐 -> 最小修复实现 -> 回归验证 -> 文档同步 |
| What's the goal? | 补齐 SceneForge LLM 主链在草案提交、Validate、Continue、Continue & Run 之间的关键断点 |
| What have I learned? | 见 findings.md |
| What have I done? | 已完成范围确认并建立独立 planning task |
