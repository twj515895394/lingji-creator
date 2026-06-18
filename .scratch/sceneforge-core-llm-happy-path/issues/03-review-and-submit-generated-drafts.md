Status: completed

## 父问题

`.scratch/sceneforge-core-llm-happy-path/PRD.md`

## 要构建什么

在 Studio 中提供统一的 Core 草案审阅区，按 output contract 展示生成内容、缺失状态和字符数；只有完整草案可由用户显式提交到产物库，提交失败时保留草案。

## 验收标准

- [x] 草案按 requiredArtifacts 顺序展示
- [x] 缺 key 或空内容时禁止提交并指出具体 key
- [x] 提交成功后清空草案并刷新项目状态
- [x] 提交失败时草案仍可查看和重试
- [x] 不改变 manual_submit、ACP Agent 和 MVP 占位入口

## 完成证据

- 新增 `SceneRunDraftReview`，展示 artifact key、字符数、缺失项和显式提交/放弃动作。
- `StageRunPanel` 仅在提交成功后清空草案；校验失败或调用异常均保留当前草案。
- `tests/sceneforge-run-draft-review.test.tsx`：2 tests passed；相关 UI/Runner 回归通过。

## 被阻塞于

- `02-strict-direct-llm-drafts.md`

## 类型

AFK
