Status: todo

# 统一人工标注完成态与持久化状态

Type: AFK

## 父问题

`.scratch/sceneforge-remix-review-followups/PRD.md`

## 要构建什么

修正 Source Asset Processing Workspace 第 05 步“人工标注”的状态语义。当前步骤完成态由本地草稿 `tags + annotationNote` 驱动，在用户尚未点击保存时，左侧流程 / 顶部状态就可能显示“已完成”，但发布仍会因未保存变更被拦截，形成明显的状态错位。

本 issue 要求把“步骤已完成”的判断统一到持久化后的 Source Asset 元数据上，让 UI 状态、保存状态和发布门禁表达同一事实源。

## 验收标准

- [ ] 人工标注步骤只有在元数据真实保存成功后才显示为完成
- [ ] 用户编辑但未保存时，步骤状态明确表现为“未完成”或“待保存”，不再显示假完成
- [ ] 刷新页面或重新打开同一 Source Asset 后，步骤状态可根据持久化元数据稳定回读
- [ ] 发布清单与流程导航对人工标注的判断使用同一事实源
- [ ] 不因为本次修正破坏现有标签、备注保存流程

## Review Checklist

- [ ] 流程状态判断基于持久化后的 `sourceAsset.metadata` 或等价真实字段，不读页面局部草稿作为完成依据
- [ ] “未保存修改”与“已完成”是两个不同概念，UI 上不再混淆
- [ ] Asset Processing、Asset Library、Publish Checklist 对同一元数据状态的读取口径一致
- [ ] 兼容旧数据缺字段场景，避免历史 Source Asset 全部被判异常

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新 `tests/sceneforge-remix-asset-processing.test.tsx`，覆盖编辑未保存、保存成功、刷新回读三种状态
- [ ] 更新 `tests/sceneforge-remix-publish-checklist.test.ts`，覆盖人工标注状态与发布门禁一致性
- [ ] 如有 view-model 纯函数测试，补对 annotate step status 的断言
- [ ] `npm run test -- sceneforge-remix-asset-processing sceneforge-remix-publish-checklist`

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- `src/sceneforge/remix/lib/remix-workspace-view-model.ts`
- `src/sceneforge/remix/components/AssetDetailSidebar.tsx`
- `tests/sceneforge-remix-asset-processing.test.tsx`
- `tests/sceneforge-remix-publish-checklist.test.ts`

## 关联说明

- 这是 `Issue #14` 的状态一致性收口票
- 本票优先级低于前两张，因为它不破坏目录正确性，但会直接影响用户对流程可信度的判断
