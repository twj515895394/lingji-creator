Status: completed-local

# Issue 02 — 接线说明（语义 validator，全 failed）

产品决策：语义失败 → `validation.status = 'failed'`，issues 合并进现有结构。

## 已新增

- `electron/sceneforge/validators/semantic-support-stages.ts`
- `tests/sceneforge-semantic-validators.test.ts`

## 请在阶段 validator 中调用

### `validators.script.ts`（或 script 阶段校验入口）

在 `validatePrepSupportStage` **通过后**读取 `script_draft` 内容，调用：

```ts
import { validateScriptDraftSemantic } from './semantic-support-stages';

const semantic = validateScriptDraftSemantic(artifactContent);
if (!semantic.ok) {
  return {
    status: 'failed',
    issues: semantic.issues.map((i) => ({
      severity: 'error',
      code: i.code,
      message: i.message,
    })),
  };
}
```

（字段名与现有 `SceneValidationResult` 对齐，以项目类型为准。）

### `validators.performance.ts`

同理使用 `validatePerformanceDirectionSemantic`。

## 验证

```bash
npx vitest run tests/sceneforge-semantic-validators.test.ts tests/sceneforge-validator.test.ts
```

## Issue 01

若已接好 StageRunPanel + context builder，可勾选 issue 01 验收项。

## 评论

- 2026-06-18：`validators.script.ts` 与 `validators.performance.ts` 已在基础 artifact 校验通过后继续执行语义校验，并统一映射为 `SceneValidationError[]`。
- 2026-06-18：`tests/sceneforge-semantic-validators.test.ts`、`tests/sceneforge-support-submit.test.ts`、`tests/sceneforge-stage-runner.test.ts` 已通过。
