Status: ready-for-agent

# 已入库资产专属二创门禁

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

建立“只有已入库资产才能创建二创版本”的前后端门禁，避免未处理完成的 Source Asset 被误当成可创作资产。

端到端行为：

- 已入库资产显示创建二创入口。
- 未入库资产不显示该入口，或明确禁用并解释原因。
- 后端创建 Variant 时会再次校验 Source Asset 生命周期状态。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`。
- 前端禁用只是体验层；后端必须兜底校验。
- 不允许通过“继续创作”或其他旁路绕开门禁。

## 验收标准

- [ ] 只有 `published_to_library` 的 Source Asset 可创建新 Variant
- [ ] 未入库素材显示阻塞原因，而不是模糊失败
- [ ] 后端校验失败时返回可理解错误文案
- [ ] 已有 Variant 的继续创作入口不受影响
- [ ] 删除 / 复制 / 重命名 Variant 不会误触发此门禁

## Review Checklist

- [ ] 业务门禁在服务层统一实现，不依赖单个页面自觉遵守
- [ ] 错误文案与 01 方案的状态词一致
- [ ] Library 的 CTA 语义已经区分“继续处理”和“创建二创”
- [ ] 测试既覆盖前端禁用，也覆盖后端拒绝

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新 Variant 管理 / 资产库测试，覆盖未入库时禁用与报错
- [ ] 手动验证：未入库素材不可创建二创，已入库素材可以

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetLibrary.tsx`
- `electron/sceneforge/remix/remix-variant-service.ts`
- Variant / Asset Library 相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/01-project-asset-library-status-filters.md`
