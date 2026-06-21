Status: completed-local

## 父问题

`.scratch/sceneforge-llm-mainline-closure/PRD.md`

## 要构建什么

修复 Direct LLM 主链中“阶段标准文件存在但未完整进入运行时 prompt”的问题，并在真正发送给 LLM 前增加 80k token 硬闸门。

## 验收标准

- [x] `agent-instructions.md` 进入 Direct LLM 运行时 prompt
- [x] `review-checklist.md` 进入 Direct LLM 运行时 prompt
- [x] 发起 LLM 调用前会校验输入 token 数
- [x] 超过 80k token 时直接报错，且不会真正调用 LLM

## 类型

Implementation

## 进展备注

- 2026-06-18：`scene-prompt-renderer` 已把阶段运行规则与 review checklist 注入最终 prompt。
- 2026-06-18：`scene-direct-llm-runner` 已在真实调用前增加 80k token 硬闸门。
- 2026-06-18：定向验证已通过 `tsc` 与 5 个测试文件、49 个测试用例。
