Status: completed-local

## 父问题

`.scratch/sceneforge-style-selector/PRD.md`

## 要构建什么

定义项目级 style profile 与 `selectedAssetIds` 的状态模型、默认值和旧项目兼容策略。

## 验收标准

- [ ] 字段职责清晰
- [ ] 旧项目有默认行为
- [ ] 不引入每次运行的临时状态真相

## 类型

AFK

## 评论

- 2026-06-18：`src/types/sceneforge.ts` 与 `electron/sceneforge/project/scene-project-file.ts` 已新增项目级 `selectedStyleProfileId` / `selectedAssetIds` 字段与默认值。
- 2026-06-18：旧项目读取现在会自动归一化缺省值，不再依赖临时运行参数才能表达样式选择。
- 2026-06-18：自动化验证覆盖了项目骨架默认值与持久化读取：`tests/sceneforge-project-file.test.ts`、`tests/sceneforge-types.test.ts`。
