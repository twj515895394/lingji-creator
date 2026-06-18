Status: completed

## 父问题

`.scratch/sceneforge-core-llm-happy-path/PRD.md`

## 要构建什么

让 Direct LLM 只在所有 requiredArtifacts 均存在且非空时返回成功草案；非法 JSON、部分 key 和空内容分别产生可恢复的结构化错误，且运行本身不写项目文件。

## 验收标准

- [x] 完整 JSON 返回按契约过滤后的 artifacts
- [x] 缺少任意 required key 时运行失败
- [x] 空白内容视为缺失
- [x] Runner 成功或失败均不直接写 Artifact Store
- [x] 无设置、解析失败、缺 key 的测试通过

## 完成证据

- 缺失/空白产物返回 `SCENE_DIRECT_LLM_MISSING_ARTIFACTS`，非法 JSON 返回 `SCENE_DIRECT_LLM_PARSE_FAILED`。
- `tests/sceneforge-direct-llm-runner.test.ts`：7 tests passed。
- `tests/sceneforge-core-llm-happy-path.test.ts` 验证三个阶段 Run 后 Artifact Store 仍为空。

## 被阻塞于

- `01-lock-core-output-contracts.md`

## 类型

AFK
