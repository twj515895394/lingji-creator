Status: completed-local

# Issue 04 — 接线（runner 文件已新增）

## 已新增

- `electron/sceneforge/runners/scene-acp-agent-runner.ts` — `createAcpAgentStageRunner`
- `tests/sceneforge-acp-agent-happy-path.test.ts` — 3 条（不再 skip）

## 请你接线 `SceneForgeService.runStage`

在 `electron/sceneforge/service.ts`（或实际分发 run 的文件）中，当 `runner === 'acp_agent'`：

```ts
import { createAcpAgentStageRunner } from './runners/scene-acp-agent-runner';

// 生产依赖：runAgentTurn 调用 electron/acp 单轮，返回 JSON 字符串
// 测试可走独立 runner 单测，不必先接真 ACP

const acpRunner = createAcpAgentStageRunner({
  isAgentConfigured: async () => /* 读 ~/.lingji/agent-config + key */,
  runAgentTurn: async (prompt) => /* ACP 单轮，模型输出 JSON */,
});
```

`runStage` 分支：

```ts
if (runner === 'acp_agent') {
  return acpRunner.run({ projectDir, stage, stageContext, submitStageDraft, manualArtifacts });
}
```

**单轮**：`runAgentTurn` 一次返回完整 JSON，不做多轮 loop。

## StageRunPanel

- `stageSupportsRunner(stage, 'acp_agent')` 时显示 **Agent 生成**
- `runStage({ runner: 'acp_agent' })`，草案进现有审阅 / submit
- `runBlocked`（Issue 01）同样 disable

## 验证

```bash
npx vitest run tests/sceneforge-acp-agent-happy-path.test.ts
npx tsc --noEmit
```

接好 service 后可选：在 `sceneforge-support-llm-happy-path` 旁增加 service 级 `runStage('acp_agent')` 集成测。

## 评论

- 2026-06-18：`scene-stage-runner-factory.ts` 已切换为 `scene-acp-agent-runner`，并通过 `HeadlessAcpProvider` 执行单轮 JSON 草案生成，不再走 briefing-only 路径。
- 2026-06-18：ACP 配置读取已与现有 ACP 模块对齐到 `~/.lingji/agent-config.json`。
- 2026-06-18：`StageRunPanel` 的 ACP hint 与错误恢复文案已更新，明确“单轮 Agent 生成草案，需再提交到产物库”。
- 2026-06-18：自动化验证通过：`tests/sceneforge-acp-agent-happy-path.test.ts`、`tests/sceneforge-stage-runner.test.ts`、`npx tsc --noEmit`。
