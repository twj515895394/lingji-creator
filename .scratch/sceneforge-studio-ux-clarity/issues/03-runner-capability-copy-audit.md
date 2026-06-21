Status: completed-local

## 父问题

`.scratch/sceneforge-studio-ux-clarity/PRD.md`

## 要构建什么

审计各阶段 Runner 下拉、禁用态与提示文案，确保与能力表一致。

## 验收标准

- [ ] 下拉不展示错误 Runner
- [ ] 禁用态说明准确
- [ ] 不把“不支持”说成“配置失败”

## 类型

AFK

## 评论

- 2026-06-18：Runner 展示已以 `scene-stage-run-capabilities.ts` 为真相源，`StageRunPanel` 只渲染阶段支持的 runner。
- 2026-06-18：下游 continue 能力判断也会明确返回“不支持 Direct LLM”之类原因，避免把能力缺失误解成配置失败。
- 2026-06-18：相关行为已有 `tests/sceneforge-continue-run.test.ts`、`tests/sceneforge-ui.test.tsx` 覆盖。
