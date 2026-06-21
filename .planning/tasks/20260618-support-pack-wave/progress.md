# Progress

## Session: 2026-06-18

### Issue 01: Performance Direct LLM

- 建立 13 阶段共享 Runner 能力表。
- Direct LLM runner 改为按能力表判定，不再硬编码核心阶段。
- StageRunPanel 支持 support submit mode。
- support workspace 同时保留 Direct LLM 与手工 Markdown。
- 新增 performance mock run → submit → validate happy path。

### Verification

| Test | Result |
| --- | --- |
| Issue 01 目标测试 | 6 files / 50 tests passed |
| TypeScript | passed |
| Strict Code Review | Blocking 0；修复 renderer 跨层运行时引用 |

### Errors

| Error | Resolution |
| --- | --- |
| 两次计划文档 patch 格式不完整 | 拆成小补丁，避免长文本截断 |

### Issue 02: Audio Direct LLM

- 新增 Audio context policy：必选 storyboard、performance，可选 design master。
- 能力表开放 audio Direct LLM，Continue & Run 边界同步更新。
- 新增 audio mock run → submit → validate happy path。
- 手工 audio submit 回归保持通过。

### Issue 02 Verification

| Test | Result |
| --- | --- |
| Audio 目标回归 | 6 files / 55 tests passed |
| TypeScript | passed |
| Diff check | passed |
| Strict Code Review | Blocking 0；修复注册表导出命名误导 |

### Issue 03: Reference Pack

- 从旧 `scene-reference-decider` 提炼参考边界、继承/规避与 review 规则。
- 新增 Reference 标准 Pack 八件套与受控 context policy。
- 开放 reference Direct LLM，未开放阶段拒绝用例迁移至 story。
- 新增 reference mock run → submit → validate happy path。

### Issue 03 Verification

| Test | Result |
| --- | --- |
| Reference 目标回归 | 6 files / 60 tests passed |
| TypeScript | passed |
| Diff check | passed |
| Strict Code Review | Blocking 0；无越权读取、绝对路径或新增依赖 |

### Issue 04: Story Pack

- 从旧 `scene-story-development` 提炼轻量故事骨架规则。
- 新增 Story 标准 Pack 八件套与 reference/adaptation 受控上下文。
- 开放 story Direct LLM，并新增独立 run → submit → validate happy path。

### Issue 04 Verification

| Test | Result |
| --- | --- |
| Story 目标回归 | 6 files / 64 tests passed |
| TypeScript | passed |
| Diff check | passed |
| Strict Code Review | Blocking 0；无旧状态机、越权读取或新增依赖 |
