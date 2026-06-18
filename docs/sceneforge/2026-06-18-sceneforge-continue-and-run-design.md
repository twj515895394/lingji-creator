# SceneForge Continue & Run — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> ADR：`docs/adr/0003-sceneforge-continue-and-run.md`

## 1. 设计目标

增加单步自动衔接能力，同时把审批、导航、运行三个结果分别表达，避免把 Provider 失败误认为审批失败。

## 2. 能力判定

新增纯函数：

```ts
interface ContinueRunCapability {
  nextStage: SceneStageId | null;
  canRun: boolean;
  reason?: string;
  supportedRunners: SceneStageRunnerType[];
}
```

输入：

- 当前阶段。
- 当前阶段是否可 Continue。
- 下一阶段。
- 下一阶段的 Stage Run 能力。
- 当前可用 Runner。

输出只用于 UI 判定，不发起副作用。

## 3. 编排边界

将现有 `handleContinueStage` 中的业务步骤提取为 Studio hook：

```ts
continueStage({ mode: 'navigate' })
continueStage({ mode: 'navigate_and_run', runnerType: 'direct_llm' })
```

编排状态：

```text
idle
→ approving
→ navigating
→ running_next
→ draft_ready | run_failed | complete
```

## 4. 执行语义

### 4.1 普通 Continue

行为与当前完全一致：

- 可直接推进的策略只切换阶段。
- 需要审批时调用 `sceneApproveStage`。
- 刷新项目状态并选择下一阶段。
- 不调用 Runner。

### 4.2 Continue & Run

1. 复用普通 Continue 逻辑。
2. 只有 approve/navigate 成功才运行下一阶段。
3. 调用 `sceneRunStage({ nextStage, runnerType })`。
4. 将结果交给下一阶段 `StageRunPanel` 的草案状态。

为了避免页面内跨组件临时状态丢失，Studio 持有：

```ts
type PendingStageRunResult =
  | { stage: SceneStageId; result: SceneStageRunnerResult }
  | null;
```

下一阶段 `StageRunPanel` 通过 `initialRunResult` 接收并展示，消费后由 Studio 清空。

## 5. UI

- 普通按钮：`Continue`
- 自动按钮：`Continue & Run`
- 辅助文案：`将审批当前阶段，并用 Direct LLM 运行「下一阶段名称」；生成结果仍需手动提交。`
- 下一阶段不支持运行时只显示普通 Continue。
- 点击 Continue & Run 前不再弹二次确认；显式按钮和文案已足够表达成本。
- 运行阶段复用统一任务进度。

## 6. 错误处理

| 失败点 | 状态 | UI |
| --- | --- | --- |
| approve 失败 | 留在当前阶段 | 展示审批错误，不运行 |
| refresh/navigation 失败 | 当前审批可能已成功 | 刷新并提示重新进入下一阶段 |
| next run 失败 | 停在下一阶段 | 展示 Runner 错误和“重新运行” |
| draft 注入失败 | 停在下一阶段 | 可手动点击运行 |

不进行跨文件事务回滚，因为审批与 Provider 调用不是同一事务。

## 7. 测试

- capability 纯函数表驱动测试。
- hook 编排测试使用 mock approve/run。
- UI 静态测试验证两个按钮和条件显示。
- Electron 验收 design → script、performance → storyboard 两条边。

## 8. 可演进方向

未来若真实使用证明稳定，可另立 ADR 讨论项目级默认自动运行；本设计不预留字段或隐藏开关。

