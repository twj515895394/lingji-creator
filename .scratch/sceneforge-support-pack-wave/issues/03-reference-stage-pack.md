Status: completed

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

创建 reference 标准 Stage Pack，并让 reference 基于选题闸门确认和可选源材料生成 `reference_notes`，完成生成、审阅、提交和校验。

## 验收标准

- [x] reference Pack 标准文件齐全且可加载
- [x] output contract 只要求 `reference_notes`
- [x] context policy 不读取无关九文件全文
- [x] `MIGRATION.md` 记录旧 skill 来源与差异
- [x] mock run → submit → validate 通过
- [x] 手工 reference 提交保持可用

## 完成证据

- 新增 Reference 标准 Pack 八件套，运行时不依赖外部 skill。
- 迁移来源为 `scene-reference-decider`，保留参考边界与审查规则，删除旧黑板状态推进。
- context policy 只允许 topic brief、gate confirmations 与可选 source material。
- mock run 不写盘，显式 submit 后 validator passed；手工提交回归通过。
- 目标回归：6 files / 60 tests passed；`npx tsc --noEmit` passed。
- 严格 Review：Blocking 0；无绝对路径、敏感信息、越权读取或新增依赖。

## 被阻塞于

- `01-performance-direct-llm.md`

## 类型

AFK
