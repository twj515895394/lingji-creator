# SceneForge Remix 资产标记与保存入库重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Remix 原片资产处理工作台第 05 / 06 步重构为稳定的资产级工作流，让“资产标记”和“保存入库”在 UI、门禁、持久化和测试上全部对齐当前真实数据模型。

**Architecture:** 保持现有 `SourceAsset -> source_manifest.json -> published_to_library` 主链不变，不引入数据库、不重造实体，只把第 05 / 06 步从片段级心智收回到资产级语义。前端以页面级编排收口，底层通过 view-model/validator/service 统一门禁和摘要，最后由 mock 与 Vitest 锁死语义。

**Tech Stack:** TypeScript、React 19、Electron、Vitest、本地 Markdown issue tracker、JSON 文件持久化。

---

## Scope

- 直接对应：
  - `.scratch/sceneforge-remix-asset-marking-publish/PRD.md`
  - `.scratch/sceneforge-remix-asset-marking-publish/issues/01-stage-vocabulary-and-gates.md`
  - `.scratch/sceneforge-remix-asset-marking-publish/issues/02-asset-marking-workspace-simplification.md`
  - `.scratch/sceneforge-remix-asset-marking-publish/issues/03-publish-confirmation-workspace.md`
  - `.scratch/sceneforge-remix-asset-marking-publish/issues/04-publish-persistence-and-library-surface.md`
  - `.scratch/sceneforge-remix-asset-marking-publish/issues/05-remix-asset-marking-tests-and-mocks.md`
- 目标只覆盖 Remix 原片资产处理工作台第 05 / 06 步。
- 不修改 Variant 创建链路的产品语义，只保证其继续消费已入库资产。

## File Map

### 页面编排与展示

- Modify: `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- Modify: `src/sceneforge/remix/components/AnnotationEditor.tsx`
- Modify: `src/sceneforge/remix/components/PublishToLibraryButton.tsx`
- Modify: `src/sceneforge/remix/components/RemixWorkspacePanels.module.css`

### 阶段语义 / View Model

- Modify: `src/sceneforge/remix/lib/remix-stage-nav.ts`
- Modify: `src/sceneforge/remix/lib/remix-workspace-view-model.ts`
- Modify: `src/sceneforge/remix/lib/asset-library-view-model.ts`

### Electron 门禁与持久化

- Modify: `electron/sceneforge/remix/remix-validators.ts`
- Modify: `electron/sceneforge/remix/remix-service.ts`
- Read for compat check: `electron/sceneforge/remix/remix-source-asset-service.ts`
- Read for compat check: `electron/sceneforge/remix/remix-store.ts`

### Mock / 测试

- Modify: `src/sceneforge/remix/mock/mock-api.ts`
- Modify: `src/sceneforge/remix/mock/mock-data.ts`
- Modify: `tests/sceneforge-remix-asset-processing.test.tsx`
- Modify: `tests/sceneforge-remix-source-asset-metadata.test.ts`
- Modify: `tests/sceneforge-remix-validators.test.ts`
- Modify: `tests/sceneforge-remix-mock-data.test.ts`
- Modify if copy changes spill over: `tests/sceneforge-remix-stage-nav.test.tsx`
- Regression spot-check: `tests/sceneforge-remix-ipc-contract.test.ts`

### Issue Tracker 同步

- Modify: `.scratch/sceneforge-remix-asset-marking-publish/issues/*.md`

## 改造原则

1. 不新增片段级人工标注 schema。
2. 不把 `understanding` 页的片段工作台复制到 `annotate` / `publish-source`。
3. 资产级门禁只能定义一次，前端状态和 Electron 校验必须共识。
4. 当前阶段继续使用 JSON 持久化，不引入 SQLite。
5. 只在确实需要时抽小 helper，避免在 `RemixAssetProcessing.tsx` 外过度拆散已有逻辑。

## Task 1：统一第 05 / 06 步词汇和资产级门禁基线

**目标行为：** 用户在第 05 步看到的是“资产标记”，在第 06 步看到的是“保存入库”；两步的状态、说明、门禁围绕资产级标签/备注展开，不再暗示逐片段人工审阅。

**Files:**
- Modify: `src/sceneforge/remix/lib/remix-stage-nav.ts`
- Modify: `src/sceneforge/remix/lib/remix-workspace-view-model.ts`
- Modify: `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- Modify: `electron/sceneforge/remix/remix-validators.ts`
- Test: `tests/sceneforge-remix-validators.test.ts`
- Test: `tests/sceneforge-remix-stage-nav.test.tsx`

- [ ] **Step 1: 先写 / 更新门禁测试，锁定“标签必填、备注可选”的推荐语义**

```ts
it('assertPublishReady 在缺少人工标签时阻止入库', async () => {
  await expect(assertPublishReady(projectDir, documentWithoutTags)).rejects.toThrow('请先保存至少一个资产标签。');
});

it('assertPublishReady 不再强制要求人工备注', async () => {
  await expect(assertPublishReady(projectDir, documentWithTagsButNoNote)).resolves.toBeUndefined();
});
```

- [ ] **Step 2: 跑窄范围测试确认当前实现会失败**

Run:

```bash
npx vitest run tests/sceneforge-remix-validators.test.ts tests/sceneforge-remix-stage-nav.test.tsx
```

Expected:

- `validators` 用例至少有 1 条因“备注仍必填”失败。
- `stage nav` 用例会因仍显示“人工标注”失败或需要更新断言。

- [ ] **Step 3: 修改阶段导航与文案基线**

```ts
export const REMIX_ASSET_PROCESSING_NAV_ITEMS: RemixStageNavItem[] = [
  { id: 'annotate', index: 5, title: '资产标记', caption: '标签、备注与入库补充信息' },
  { id: 'publish-source', index: 6, title: '保存入库', caption: '确认前置门禁并写入资产库' },
];
```

同时统一这些资产级文案来源：

- `STAGE_DESCRIPTIONS`
- `buildInspectorRows`
- `buildProcessingChecklist`
- `asset-library-view-model` 中与“人工确认/保存入库”相关的提示语

- [ ] **Step 4: 修改 `assertPublishReady` 与 `isAssetPublishReady` 的最小必填规则**

```ts
export async function assertPublishReady(projectDir: string, document: StoredSourceAssetDocument): Promise<void> {
  assertSourceAssetStageReady(document, 'remix_segmentation');
  assertSourceAssetStageReady(document, 'remix_keyframes');
  assertSourceAssetStageReady(document, 'remix_understanding');
  await assertRemixUnderstandingReady(projectDir, document);
  if ((document.sourceAsset.tags ?? []).length === 0) {
    throw new Error('请先保存至少一个资产标签。');
  }
}
```

前端 `annotationReady` 改为只检查 `tags.length > 0`，但仍在 UI 中提示“备注建议填写”。

- [ ] **Step 5: 重新跑测试确认门禁基线统一**

Run:

```bash
npx vitest run tests/sceneforge-remix-validators.test.ts tests/sceneforge-remix-stage-nav.test.tsx
```

Expected:

- 全部通过。
- 不再有“备注必填”的历史断言。

## Task 2：把第 05 步瘦身为纯资产级标记工作台

**目标行为：** 第 05 步只编辑整条资产的标签和备注，不再显示“当前播放片段”“片段 01”“保留/替换建议列表”等片段级卡片。

**Files:**
- Modify: `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- Modify: `src/sceneforge/remix/components/AnnotationEditor.tsx`
- Modify: `src/sceneforge/remix/components/RemixWorkspacePanels.module.css`
- Test: `tests/sceneforge-remix-asset-processing.test.tsx`

- [ ] **Step 1: 先补页面行为测试，锁定第 05 步不再展示片段级 UI**

```ts
it('资产标记页只展示资产级字段，不展示当前播放片段卡片', async () => {
  const container = await renderProcessing(<RemixAssetProcessing ... initialStepId="annotate" />);
  expect(container.textContent).toContain('资产标记');
  expect(container.textContent).not.toContain('当前播放片段');
  expect(container.textContent).not.toContain('片段 01');
});
```

```ts
it('资产标记页在仅有标签时也可视为满足入库前置标记条件', async () => {
  const statuses = getAssetProcessingStepStatuses(snapshotWithTagsOnly, false);
  expect(statuses.annotate).toBe('approved');
});
```

- [ ] **Step 2: 跑页面测试，确认旧实现会失败**

Run:

```bash
npx vitest run tests/sceneforge-remix-asset-processing.test.tsx
```

Expected:

- 至少有关于“当前播放片段”或“人工标注”字样的断言失败。

- [ ] **Step 3: 收口 `AnnotationEditor` 成资产级组件**

```tsx
<AnnotationEditor
  prefillHint={annotationPrefillHint}
  tags={tags}
  draftTag={draftTag}
  note={annotationNote}
  onDraftTagChange={setDraftTag}
  onAddTag={handleAddTag}
  onRemoveTag={handleRemoveTag}
  onNoteChange={setAnnotationNote}
/>
```

把文案改成：

- `人工标签` -> `资产标签`
- `人工备注` -> `资产备注`
- placeholder 明确是“用于后续资产筛选和二创引用”

- [ ] **Step 4: 简化 `RemixAssetProcessing.tsx` 的 annotate 分支**

实现要点：

- 移除 annotate 分支里对当前 segment 卡片的渲染依赖。
- 保留 AI 预填，但只以 `prefillHint` / 建议说明形式展示。
- 保存按钮文案改为 `保存资产标记`。
- “最近保存”文案继续展示 `lastAnnotatedAt`，但语义改成“最近保存资产标记”。

建议抽一个很小的摘要 helper，避免 annotate / publish-source 重复：

```ts
function buildAssetMarkingSummary(tags: string[], note: string) {
  return {
    tagCount: tags.length,
    hasNote: note.trim().length > 0,
    notePreview: note.trim().slice(0, 120),
  };
}
```

- [ ] **Step 5: 跑页面测试确认 annotate 页完成收口**

Run:

```bash
npx vitest run tests/sceneforge-remix-asset-processing.test.tsx
```

Expected:

- annotate 相关用例全部通过。
- 不再依赖片段级卡片文本。

## Task 3：把第 06 步实现为显式入库确认页

**目标行为：** 第 06 步展示 checklist、资产标记摘要、保存结果说明和显式 `保存入库` 按钮；前置不满足时给出阻塞原因，满足时允许执行。

**Files:**
- Modify: `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- Modify: `src/sceneforge/remix/components/PublishToLibraryButton.tsx`
- Modify: `src/sceneforge/remix/lib/remix-workspace-view-model.ts`
- Modify: `src/sceneforge/remix/components/RemixWorkspacePanels.module.css`
- Test: `tests/sceneforge-remix-asset-processing.test.tsx`

- [ ] **Step 1: 先补 publish 页外部行为测试**

```ts
it('保存入库页展示资产标记摘要与显式保存按钮', async () => {
  const container = await renderProcessing(<RemixAssetProcessing ... initialStepId="publish-source" />);
  expect(container.textContent).toContain('保存入库');
  expect(container.textContent).toContain('资产标记摘要');
  expect(container.querySelector('[data-testid="remix-processing-publish"]')).not.toBeNull();
});
```

```ts
it('前置未满足时保存入库按钮禁用并显示阻塞提示', async () => {
  const container = await renderProcessing(<RemixAssetProcessing apiClient={buildApiClient('missing-annotation')} ... />);
  expect(container.textContent).toContain('未满足');
  expect((container.querySelector('[data-testid="remix-processing-publish"]') as HTMLButtonElement).disabled).toBe(true);
});
```

- [ ] **Step 2: 跑页面测试，确认旧实现尚未提供完整摘要区**

Run:

```bash
npx vitest run tests/sceneforge-remix-asset-processing.test.tsx
```

Expected:

- 新增 publish 页断言失败。

- [ ] **Step 3: 抽出可复用的 checklist / summary 数据**

在 `RemixAssetProcessing.tsx` 或 `remix-workspace-view-model.ts` 中集中生成：

```ts
interface AssetMarkingSummary {
  tagCount: number;
  tags: string[];
  hasNote: boolean;
  notePreview: string | null;
}
```

```ts
function buildPublishChecklist(...) { ... }
function buildAssetMarkingSummary(...) { ... }
```

要求：

- 不读取当前 segment。
- checklist 第 5 项明确写成 `资产标记已补齐`。
- note 文案改为“当前 X 个标签，资产备注已填写/未填写”。

- [ ] **Step 4: 扩展 `PublishToLibraryButton` 为确认页组件**

把它从“只有 checklist + 一个按钮”扩成：

- checklist 区
- `资产标记摘要` 区
- `保存后会写入资产库 manifest，供后续二创读取` 说明区
- 底部按钮区

可以保留组件名不改，避免大范围重命名；但 props 需要扩充：

```ts
interface PublishToLibraryButtonProps {
  items: PublishChecklistItem[];
  summary: AssetMarkingSummary;
  disabled: boolean;
  isPublishing?: boolean;
  onPublish?: () => void;
}
```

- [ ] **Step 5: 跑页面测试确认 publish 页可用**

Run:

```bash
npx vitest run tests/sceneforge-remix-asset-processing.test.tsx
```

Expected:

- publish 页新增用例通过。
- 按钮禁用/可用状态与前置门禁一致。

## Task 4：收紧入库持久化回写和资产库展示对齐

**目标行为：** 点击 `保存入库` 后，只对现有 `SourceAsset` 资产级字段和状态做回写；资产库视图能正确看到已入库状态、标签和备注摘要。

**Files:**
- Modify: `electron/sceneforge/remix/remix-service.ts`
- Modify: `src/sceneforge/remix/lib/asset-library-view-model.ts`
- Modify: `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- Test: `tests/sceneforge-remix-source-asset-metadata.test.ts`
- Test: `tests/sceneforge-remix-ipc-contract.test.ts`

- [ ] **Step 1: 先补 service 层入库回写测试**

```ts
it('publishSourceAssetToLibrary 在资产标签齐备时写入 published_to_library', async () => {
  const annotated = await service.updateSourceAssetMetadata({
    projectDir,
    sourceAssetId,
    tags: ['压迫节奏'],
    annotationNote: null,
  });
  const published = await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId });
  expect(published.sourceAsset.status).toBe('published_to_library');
  expect(published.sourceAsset.updatedAt).toBeTruthy();
});
```

- [ ] **Step 2: 跑 service / ipc 测试确认旧行为与新语义的差异**

Run:

```bash
npx vitest run tests/sceneforge-remix-source-asset-metadata.test.ts tests/sceneforge-remix-ipc-contract.test.ts
```

Expected:

- 至少一条用例会因历史“备注必填”假设失败。

- [ ] **Step 3: 保持 service 轻量，只改错误文案和最小回写语义**

`publishSourceAssetToLibrary` 仍然只做：

```ts
await assertPublishReady(input.projectDir, document);
document.sourceAsset.status = 'published_to_library';
document.sourceAsset.updatedAt = new Date().toISOString();
await writeStoredSourceAsset(input.projectDir, document);
```

不要新增：

- 新的入库表
- 新的 annotation artifact
- 新的 segment 级 JSON

- [ ] **Step 4: 对齐资产库文案，让后续消费端读到正确状态**

更新 `asset-library-view-model.ts` 里与“未入库 / 待人工确认 / 保存入库”相关的文案，确保：

- 已入库资产能明确显示已发布/可创建二创。
- 未入库资产文案指向“先完成资产标记并保存入库”。
- 不再提“人工标注”作为唯一描述。

- [ ] **Step 5: 跑 service / ipc / 资产库相关测试**

Run:

```bash
npx vitest run tests/sceneforge-remix-source-asset-metadata.test.ts tests/sceneforge-remix-ipc-contract.test.ts tests/sceneforge-remix-asset-library.test.tsx
```

Expected:

- 全部通过。
- Variant 创建前置错误文案仍然成立。

## Task 5：补齐 mock、页面回归和 issue 收口

**目标行为：** mock API、mock data、自动测试和 issue tracker 一致反映“资产标记 / 保存入库”的最终形态。

**Files:**
- Modify: `src/sceneforge/remix/mock/mock-api.ts`
- Modify: `src/sceneforge/remix/mock/mock-data.ts`
- Modify: `tests/sceneforge-remix-mock-data.test.ts`
- Modify: `tests/sceneforge-remix-asset-processing.test.tsx`
- Modify: `.scratch/sceneforge-remix-asset-marking-publish/issues/*.md`

- [ ] **Step 1: 更新 mock 数据契约**

确保 mock 中这些语义跟正式实现同步：

- 资产标签字段可单独满足第 05 步完成态
- `annotationNote` 可为 `null`
- 第 06 步 mock 快照可展示摘要与按钮状态

关键更新点：

```ts
snapshot.sourceAsset.annotationNote = input.annotationNote ?? null;
snapshot.sourceAsset.lastAnnotatedAt = NOW;
snapshot.sourceAsset.annotationSource = input.annotationSource ?? 'workspace_manual';
```

- [ ] **Step 2: 更新 mock 测试与页面回归测试**

Run:

```bash
npx vitest run tests/sceneforge-remix-mock-data.test.ts tests/sceneforge-remix-asset-processing.test.tsx
```

Expected:

- mock 和页面相关测试全部通过。

- [ ] **Step 3: 运行本轮核心回归**

Run:

```bash
npx vitest run \
  tests/sceneforge-remix-validators.test.ts \
  tests/sceneforge-remix-stage-nav.test.tsx \
  tests/sceneforge-remix-asset-processing.test.tsx \
  tests/sceneforge-remix-source-asset-metadata.test.ts \
  tests/sceneforge-remix-ipc-contract.test.ts \
  tests/sceneforge-remix-mock-data.test.ts
```

Expected:

- 全部通过。

建议补一轮静态检查：

```bash
npx tsc --noEmit
```

Expected:

- 退出码 0。

- [ ] **Step 4: 更新本地 issue tracker 状态和验证记录**

对 5 张 issue：

- 勾选已满足的验收标准
- 在文件底部新增 `## 评论`
- 记录日期、测试命令、结果
- 若某张 issue 仍有未做项，保持 `Status: ready-for-agent`

示例评论：

```md
## 评论

- 2026-06-30：运行 `npx vitest run tests/sceneforge-remix-asset-processing.test.tsx`，通过。
- 2026-06-30：人工确认第 05 步不再出现“当前播放片段”卡片。
```

## Final Verification

- `npx vitest run tests/sceneforge-remix-validators.test.ts`
- `npx vitest run tests/sceneforge-remix-stage-nav.test.tsx`
- `npx vitest run tests/sceneforge-remix-asset-processing.test.tsx`
- `npx vitest run tests/sceneforge-remix-source-asset-metadata.test.ts`
- `npx vitest run tests/sceneforge-remix-ipc-contract.test.ts`
- `npx vitest run tests/sceneforge-remix-mock-data.test.ts`
- `npx tsc --noEmit`

## Risks

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| “备注必填”放宽后与历史测试冲突 | 现有很多测试默认 `annotationNote` 必填 | 先改 validator / view-model 基线，再统一修测试 |
| `RemixAssetProcessing.tsx` 持续膨胀 | 第 05 / 06 步逻辑仍在页面层 | 只抽小型 summary/checklist helper，不大拆页面 |
| mock 与真实 service 再次漂移 | mock API 容易漏改门禁语义 | 最后一轮把 mock 测试和 service 测试一起跑 |
| 文案更新影响其它快照断言 | stage nav / 页面测试大量匹配中文文案 | 先更新断言，再做页面 copy 修改 |

## Rollout Strategy

1. 先完成 Task 1，统一“资产标记”词汇和门禁规则。
2. 再完成 Task 2，把第 05 步页面从片段级 UI 中剥离出来。
3. 接着完成 Task 3，搭出第 06 步确认页。
4. 然后完成 Task 4，确认持久化和资产库展示不跑偏。
5. 最后执行 Task 5，补齐 mock、回归测试和 issue 收口。
