# SceneForge 文档缺口补齐任务计划

**Goal:** 仅通过文档工作，把 SceneForge 后续 backlog 中缺失的 PRD、详细设计、实施计划、issues 和索引关联补齐，不进行代码实现。

### Phase 1: 盘点缺口
**Status:** complete

- 已确认 Phase 3 现有四个主工作包文档链完整。
- 已确认缺口集中在 Flow Hardening、Direct LLM E2E、Style Selector、Regenerate/Revision、Publish Workspace、ACP Studio 文案/引导等后续 backlog。

### Phase 2: 设计文档分包策略
**Status:** complete

- 采用“复用已有包，缺什么补什么”的策略，避免把 handoff backlog 全部塞进一个大包。
- 对已有 issue 但无成套文档的方向，新建独立 `.scratch/<task>/` 文档包，并在正文中关联旧 issue / roadmap / handoff。

### Phase 3: 补齐缺失文档
**Status:** complete

- 为缺失 backlog 创建 PRD、详细设计、实施计划、issues。
- 为 Flow Hardening 补全详细设计与实施计划。
- 为其余缺口建立最小但完整的四件套。

### Phase 4: 补回索引关联
**Status:** complete

- 回写/更新 roadmap、handoff 或索引文档，使新文档包可被后续代理直接发现。

### Phase 5: 自检与交付
**Status:** complete

- 核对每个 backlog 是否具备 PRD / 设计 / 计划 / issues。
- 核对命名、引用和边界是否一致。
