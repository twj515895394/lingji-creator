Status: completed-local

# Issue 01 — Studio 接线说明（产品决策已锁定）

- Required 上游缺失：**禁止 Run**（Direct LLM + ACP）
- 语义 validator 失败：**全 failed**，禁止推进
- ACP：**单轮**草案即可

## 1. 已新增

- `src/sceneforge/lib/scene-required-context.ts`
- `tests/sceneforge-required-context.test.ts`

## 2. 请在 `StageRunPanel.tsx` 接入

在拿到 `stageContext` 后：

```ts
import {
  formatMissingRequiredInputsMessage,
  hasBlockingMissingRequiredInputs,
  listMissingRequiredStageInputs,
} from '../../lib/scene-required-context';

const runBlocked = stageContext
  ? hasBlockingMissingRequiredInputs(stageContext)
  : false;
const runBlockedMessage = runBlocked
  ? formatMissingRequiredInputsMessage(listMissingRequiredStageInputs(stageContext!))
  : '';
```

- 「运行 / 生成」按钮：`disabled={runBlocked || running || ...}` 
- 按钮上方或 `Alert`：`runBlockedMessage`（variant warning）
- `handleRun` 开头：`if (runBlocked) return;`

## 3. `SceneStageFlowActions` Continue & Run

若 `getContinueRunCapability` 仅看下一阶段 runner，**不**替代当前阶段 context；Continue & Run 在**当前阶段已通过**后触发下一阶段 run——下一阶段应用同一 `stageContext` 阻塞逻辑（在下一阶段 `StageRunPanel` 或 run 前 service 检查）。

可选加固：`electron/sceneforge/service.runStage` 在 runner 为 direct_llm/acp_agent 时若 context warnings 含 required 缺失则抛错（双保险）。

## 4. 验证

```bash
npx vitest run tests/sceneforge-required-context.test.ts
npx vitest run tests/sceneforge-ui.test.tsx
```

## 5. `requiredInputs[].satisfied`

若类型尚无 `satisfied`，在 `scene-context-builder` 对 policy `required: true` 的 input 在 artifact/handoff 缺失时设 `satisfied: false`，存在时 `true`。

## 评论

- 2026-06-18：`StageRunPanel` 已使用 `scene-required-context` 进行阻塞提示与按钮禁用；`SceneForgeService.runStage` 继续保留双保险。
- 2026-06-18：`Continue & Run` 未新增第三套前置判定，但下一阶段真实 `runStage` 会复用 service 阻塞逻辑，相关能力/UI 测试保持通过。
- 2026-06-18：自动化验证通过：`tests/sceneforge-required-context.test.ts`、`tests/sceneforge-ui.test.tsx`、`tests/sceneforge-continue-run.test.ts`。
