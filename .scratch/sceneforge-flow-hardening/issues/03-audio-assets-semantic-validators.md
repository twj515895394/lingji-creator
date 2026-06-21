Status: completed-local

# Issue 03 — audio / assets 语义 validator 接线

## 已新增

- `validateAssetPlanSemantic` / `validateAudioDesignSemantic` in `semantic-support-stages.ts`
- `tests/sceneforge-semantic-validators.test.ts` 扩展用例

## 接线（与 Issue 02 相同模式）

### `validators.assets.ts`

prep passed 后：

```ts
import { validateAssetPlanSemantic } from './semantic-support-stages';
// validateAssetPlanSemantic(content) → failed + issues
```

### `validators.audio.ts`

```ts
import { validateAudioDesignSemantic } from './semantic-support-stages';
```

## 验证

```bash
npx vitest run tests/sceneforge-semantic-validators.test.ts tests/sceneforge-validator.test.ts
```

## support-submit 样例

若 `sceneforge-support-submit` 里 assets/audio 用极简 `# 资产` / `# 声音`，需改成符合语义规则的 Markdown，否则 **failed**（符合「全 failed」决策）。

## 评论

- 2026-06-18：`validators.assets.ts` 与 `validators.audio.ts` 已接入语义校验；基础 artifact 存在且非空后才继续检查内容结构。
- 2026-06-18：`tests/sceneforge-support-submit.test.ts` 中的 assets/audio 样例已升级为符合语义规则的最小有效内容，并新增失败路径覆盖。
