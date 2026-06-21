# continue-run design 边界失败 — 根因与修复

## 为什么不能自己读仓库文件

本会话里对 `Documents/trae_projects/lingji-creator` 下多数路径的 **Read/Edit** 会返回 `EPERM: operation not permitted`（CCD/沙箱对工程目录权限不一致：`prompts/`、`.scratch/` 有时能写，`src/`、`tests/`、`electron/` 常不能读）。所以你粘贴代码是最快方式；不是「不想读」。

## 根因（与你截图一致）

边界用例里：

```ts
supportedRunners: getStageSupportedRunners(nextStage),
runnerType: 'direct_llm',
```

`design` 的 `nextStage` 是 **`script`**。若 `getStageSupportedRunners('script')` **不包含** `direct_llm`，则 `getContinueRunCapability` 返回 `canRun: false`（reason: 下一阶段不支持 Direct LLM）。

表上写的是 `['design', 'script', true]`，但 **同文件第 76–77 行仍写着**：

```ts
expect(getStageSupportedRunners('script')).not.toContain('direct_llm');
```

说明 **`getStageSupportedRunners` / 能力表与 Support Pack 不同步**——script 已开 Direct LLM，测试和实现仍按旧世界。

## 修复 1：测试断言（必改）

`tests/sceneforge-continue-run.test.ts`：

```diff
-    expect(getStageSupportedRunners('script')).not.toContain('direct_llm');
+    expect(getStageSupportedRunners('script')).toContain('direct_llm');
```

建议一并加上 assets（若已开放）：

```ts
expect(getStageSupportedRunners('assets')).toContain('direct_llm');
```

## 修复 2：`getStageSupportedRunners` 实现（若改测试仍失败）

打开 `src/sceneforge/lib/scene-continue-run.ts`，确认 **没有** 硬编码排除 `script` / `assets`，应委托：

```ts
import { getSceneStageRunCapability } from './scene-stage-run-capabilities';

export function getStageSupportedRunners(stage: SceneStageId | null): SceneStageRunnerType[] {
  if (!stage) return [];
  return [...getSceneStageRunCapability(stage).runnerTypes];
}
```

若存在 `CORE_ONLY` / `SUPPORT_NO_SCRIPT` 之类旧列表，删掉对 script 的排除。

## 修复 3：`scene-stage-run-capabilities.ts`（核对一行）

```ts
['script', { stage: 'script', runnerTypes: DIRECT_LLM, submitMode: 'support' }],
```

## 验证

```bash
npx vitest run tests/sceneforge-continue-run.test.ts
```

## 若仍失败

把 `src/sceneforge/lib/scene-continue-run.ts` 全文贴出（尤其 `getStageSupportedRunners` 与 `getContinueRunCapability`）。