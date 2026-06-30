Status: done

# SceneForge Remix 资产标记与保存入库 — 执行顺序

## 主线

1. `01-stage-vocabulary-and-gates`
2. `02-asset-marking-workspace-simplification`
3. `03-publish-confirmation-workspace`
4. `04-publish-persistence-and-library-surface`
5. `05-remix-asset-marking-tests-and-mocks`

## 依赖理由

1. 先统一阶段名称、完成判定与门禁语义，避免 UI 和持久化继续基于错误对象粒度开发。
2. 第 05 步工作台必须先完成资产级瘦身，第 06 步才能复用其真实摘要，而不是继续引用片段级视图。
3. 第 06 步显式入库确认页需要建立在第 05 步产出的真实资产标记数据之上。
4. 入库持久化与资产库展示对齐必须在第 06 步的最终动作和摘要结构稳定后收口。
5. 测试、Mock 与文档最后统一收口，避免中途因为 UI 文案和门禁语义变化反复返工。
