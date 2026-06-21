Status: completed-local

## 父问题

`.scratch/sceneforge-style-selector/PRD.md`

## 要构建什么

把项目当前 style / asset 选择透传给 Stage Context，并定义自动化与真机验收口径。

## 验收标准

- [ ] `getStageContext` 可看到选择结果
- [ ] 设计相关阶段能消费这些选择
- [ ] 至少一个真机观察项明确

## 类型

AFK

## 评论

- 2026-06-18：`SceneForgeService.getStageContext()` / `runStage()` 现在会默认读取项目级样式选择，并在未显式覆盖时自动注入 Stage Context。
- 2026-06-18：服务层会把 `selectedStyleProfileId` 与附加 `selectedAssetIds` 合并为实际上下文资产列表，再交由 `resolveSceneAssetsForStage()` 按阶段过滤。
- 2026-06-18：自动化验证覆盖了项目默认透传与 registry 过滤：`tests/sceneforge-stage-pack-context.test.ts`、`tests/sceneforge-asset-library.test.ts`。
- 2026-06-18：真机观察项文档仍保留在 `docs/sceneforge/2026-06-18-sceneforge-style-selector-design.md` 的验收门中，代码侧已具备执行条件。
