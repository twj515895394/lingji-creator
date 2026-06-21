# SceneForge 阶段产物契约对齐执行计划

## Goal
让 `lingji-creator` 的 SceneForge 各阶段产物数量、正式体裁、内容标准和自动 review 尽量对齐旧 `scene_forge` 对应 skill，优先收口 `storyboard`、`video_prompts`，再统一补强 support 阶段。

## Current Phase
Completed

## Phases
### Phase 1: 审计与设计落盘
- [x] 读取旧 `scene_forge` 各关键 skill 与当前 stage pack / validator
- [x] 产出逐阶段对齐审计文档
- [x] 产出实施计划文档
- **Status:** complete

### Phase 2: Storyboard 契约对齐
- [x] 为 storyboard 增加 failing validator tests
- [x] 补强 storyboard prompt pack 与 review checklist
- [x] 实现 storyboard validator 语义校验
- [x] 跑定向测试并记录风险
- **Status:** complete

### Phase 3: Video Prompts 契约对齐
- [x] 为 video_prompts 增加 failing validator tests
- [x] 补强 video_prompts prompt pack 与 review checklist
- [x] 实现 video_prompts validator 语义校验
- [x] 跑定向测试并记录风险
- **Status:** complete

### Phase 4: Support 阶段第一批收口
- [x] 对齐 reference / story / assets 的正式 marker 与 validator
- [x] 跑定向测试
- **Status:** complete

### Phase 5: Support 阶段第二批收口
- [x] 对齐 script / performance / audio 的正式 marker 与 validator
- [x] 跑定向测试
- **Status:** complete

### Phase 6: 自动 review 与 UI 收尾
- [x] 统一复核 artifact label 展示
- [x] 必要时抽取共享 validator helper
- [x] 跑最终回归测试并更新文档
- **Status:** complete

### Phase 7: Audio 人声一致性补强
- [x] 对照旧 `scene-audio-director` 收口 `voice` / `dialogue` / continuity 缺口
- [x] 为 `audio` 补充 `script_draft` 上游输入与下游 handoff 字段
- [x] 增强 `audio` validator 与定向测试，确认不打断 `video_prompts` 继承链
- **Status:** complete

## Key Questions
1. 哪些旧 skill 的“多文件交付”语义可以安全压回现有 artifact key？
2. 哪些阶段必须升级到正式体裁级 validator，而不能只做关键词检查？
3. 是否存在需要新增 artifact key 的阶段，还是可以先全部用现有 contract 收口？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 优先保持当前 artifact key 数量 | 避免破坏现有 Studio 主链与上下游依赖 |
| 先做 storyboard，再做 video_prompts | 这两阶段是当前与旧 skill 差距最大的 core 阶段 |
| 自动 review 采用“存在性 + 正式体裁 + 下游继承信息”三层校验 | 只检查文件存在无法保障真实可用性 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Notes
- 本任务与之前的 P0 主链修复任务分离，避免记录混杂。
- 若某阶段必须新增 artifact key，先暂停实施并补设计决策。
- 本轮未抽取新的共享 validator helper；当前阶段差异仍以阶段专属 marker 为主，过早抽象收益不高。
- Phase 7 采用最小改动路线：保持 `audio_design` 单 artifact，不新增声音阶段 artifact key，只补人声一致性字段、脚本输入和 validator。
