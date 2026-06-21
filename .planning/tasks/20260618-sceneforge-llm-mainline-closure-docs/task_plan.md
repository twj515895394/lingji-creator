# SceneForge LLM Mainline Closure 文档包计划

**Goal:** 对 SceneForge 的 Direct LLM 主链做一轮系统性盘点，形成“已完成基线 / 当前必须实现 / 后续再做”的统一清单，并作为后续逐项实现的总入口。

### Phase 1: 基线归档
**Status:** complete

- 汇总 handoff、Phase 3 路线图、后续包索引与已收口文档。
- 明确哪些工作包已经足以作为验收基线，不再重复立项。

### Phase 2: 主链缺口盘点
**Status:** complete

- 按前端、后端、交互、状态流、验收点五个维度梳理未闭环项。
- 识别当前真正阻塞 LLM 全链稳定验收的功能缺口。

### Phase 3: 优先级重排
**Status:** complete

- 将现有包重排为“当前必须实现 / 后续补齐 / 暂缓”。
- 明确 ACP 暂缓，Publish 后置，Draft Refinement 前置。

### Phase 4: 文档输出
**Status:** complete

- 产出总清单文档与后续实现顺序建议。
- 切换 `.planning/current` 指向本包记录。
