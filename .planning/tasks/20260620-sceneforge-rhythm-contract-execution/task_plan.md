# SceneForge Segment Rhythm Contract 执行计划

## Goal
按既定 rhythm contract 方案分阶段落地 `design -> script -> storyboard`，先完成 `Issue 01` 的 design 阶段项目级节奏 contract。

## Current Phase
Pending Manual Validation

## Phases
### Phase 1: Design 阶段 rhythm contract
- [x] 审计现有 design prompt / validator / tests 接缝
- [x] 为 design 增加 rhythm contract prompt 要求
- [x] 为 design validator 增加段长 / 密度 / 边界规则校验
- [x] 回归并修复相关 fixtures
- **Status:** complete

### Phase 2: Script 阶段 pacing handoff
- [x] 扩展 script prompt / checklist / validator
- [x] 为 script 增加 pacing handoff tests
- **Status:** complete

### Phase 3: Storyboard 镜头密度与段界硬校验
- [x] 扩展 storyboard prompt / validator
- [x] 为 shot density 和跨段失败增加 tests
- **Status:** complete

### Phase 4: 主链验收与回补
- [ ] 跑 design -> script -> storyboard 主链真机验收
- [x] 更新 checklist / progress / handoff
- [x] 沉淀已修复失败样例与回归结论
- **Status:** pending_manual_validation

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| `design_prompts` 承担项目级 rhythm contract | 不新增 artifact key，沿用既有总览核心产物 |
| 先补 tests 再补 validator/prompt | 保持最小可验证改动 |
| design validator 直接检查 `segment_duration_seconds`、密度表、跨段规则 | 让用户在 design 阶段就看到明确失败原因 |
| script pacing handoff 压回 `segment_strategy`、`video_generation_unit_plan`、`storyboard_handoff` | 保持 `script_draft` 单 artifact，不把 script 做成 shot list |
| storyboard 密度校验落在 `storyboard_prompt_pack_plan` 的逐段 plan 行 | 不新增 artifact，也不要求 script 提前承担逐镜头责任 |

## Notes
- 当前已完成 `Issue 01`、`Issue 02`、`Issue 03`。
- `Phase 4` 的工程侧收口已完成；剩余工作仅为人工真机验收并回填记录。
