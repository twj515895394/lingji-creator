Status: completed-local

## 父问题

`.scratch/sceneforge-publish-workspace/PRD.md`

## 要构建什么

明确 publish 与 export 的职责边界，以及 publish 阶段消费哪些上游产物。

## 验收标准

- [ ] 输入明确
- [ ] 输出明确
- [ ] 与 export 边界清晰

## 类型

AFK

## 评论

- 2026-06-18：文档边界已固定为“发布准备工作区”，不是第三方平台自动发布系统。
- 2026-06-18：代码侧当前真相仍是占位：`scene-stage-run-capabilities.ts` 中 `publish` 为 `manual_only`，尚未接正式 runner。
- 2026-06-18：阶段定义已存在 `publish_notes` 作为首版产物契约入口，可作为后续实现落点。
