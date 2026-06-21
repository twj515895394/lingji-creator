Status: completed

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

创建 story 标准 Stage Pack，让故事方向基于 reference、topic brief、adaptation selection 和方法库生成 `story_direction`，完成独立端到端闭环。

## 验收标准

- [x] story Pack 标准文件齐全
- [x] context policy 包含 reference 和改编选择
- [x] adaptation methodology 通过资产注册表引用
- [x] mock run → submit → validate 通过
- [x] `MIGRATION.md` 记录迁移差异
- [x] 手工 story 提交保持可用

## 完成证据

- 新增 Story 标准 Pack 八件套，输出契约仅含 `story_direction`。
- context policy 必选 reference，可选 topic brief 与 adaptation selection，并允许选定资产注入。
- mock run 不写盘，显式 submit 后 validator passed；手工提交回归通过。
- 目标回归：6 files / 64 tests passed；`npx tsc --noEmit` passed。
- 严格 Review：Blocking 0；无旧状态机写回、绝对路径、敏感信息或新增依赖。

## 被阻塞于

- `03-reference-stage-pack.md`

## 类型

AFK
