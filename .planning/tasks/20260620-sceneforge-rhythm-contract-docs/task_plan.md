# SceneForge Segment Rhythm Contract 文档任务

## Goal
为 SceneForge 的段长与镜头节奏规则产出一套完整文档包，明确 `design / script / storyboard` 的两层节奏 contract、实施顺序与 issue 拆分。

## Current Phase
Completed

## Phases
### Phase 1: 现状调研与口径确认
- [x] 读取 CLAUDE.md、handoff、相关技能说明
- [x] 核对 gate 段长选项与 storyboard 现有镜头密度资产
- [x] 识别现有主接缝与可复用文档结构
- **Status:** complete

### Phase 2: PRD 与详细设计
- [x] 产出 rhythm contract PRD
- [x] 产出两层 contract 详细设计
- [x] 明确 density 区间与 pacing 推荐带
- **Status:** complete

### Phase 3: 实施计划与 issues
- [x] 产出 implementation plan
- [x] 拆分 design / script / storyboard / acceptance 四个 issues
- [x] 记录默认边界与非目标
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 用现有 Stage Pack + Validator 作为唯一主接缝 | 避免新增平行协议系统 |
| 节奏规则分两层：design 定边界，storyboard 做硬执行 | 保持 script 不过度 storyboard 化 |
| density 采用“硬区间 + 推荐带”双层表达 | 兼顾规则硬度与题材弹性 |
| gate 当前主口径覆盖 5/6/8/10/15 秒 | 与真实 UI 选项保持一致 |

## Notes
- 本任务只产文档，不改主链实现。
- 当前 `.planning/current` 未切换，避免打断正在进行的其它执行包。
