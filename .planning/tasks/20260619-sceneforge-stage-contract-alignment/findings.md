# Findings

## Requirements
- 对齐当前 `lingji-creator` 与旧 `scene_forge` 对应 skill 的阶段产物数量、正式体裁、内容要求与自动 review。
- 先写对齐审计文档，再写实施计划，再按阶段依次实施。
- 优先阶段顺序：`storyboard` -> `video_prompts` -> support 阶段统一收口。
- UI 展示中的产物名需要中英结合。

## Research Findings
- `design` 已开始补回旧 `scene-design-builder` 的体裁与 validator，但仍未完全达到旧项目的多文件交付语义。
- `storyboard` 当前只有 4 个 artifact key，但旧 `scene-storyboard-director` 需要主 pack、details、quality check、design reconciliation review、control/styled prompt 正式体裁。
- `video_prompts` 当前 validator 仅检查 `segment` 与 `audio`，远弱于旧 `scene-video-prompt-builder` 的四层强结构要求。
- `reference / story / assets / script / performance / audio` 现在大多属于 MVP 级语义检查，不是旧 skill 的正式交付校验。
- `source_intake / topic_gate` 当前更接近表单/HITL 流，不适合直接套用同一轮 contract 升级策略。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 采用“保持 artifact key、补强体裁与 validator”的路线 | 风险低于完全回滚到旧项目多文件模型 |
| 将旧 skill 的多文件语义优先压入现有 artifact | 减少对 UI、提交链、export 的连锁破坏 |
| 每阶段最终都需要存在性 + 正式体裁 + 下游继承信息三层校验 | 才能真正替代人工肉眼兜底 |
| `audio` 先不拆新 artifact，优先把人声连续性压回 `audio_design` 内部正式 section | 贴合当前 Studio 提交链，避免为真实联调引入额外消费改造 |
| 有对白/旁白时，`audio` 需要显式依赖 `script.script_draft` | 仅靠 storyboard + performance 无法稳定锁定语速、气口、重读与跨段人声一致性 |

## Resources
- `docs/sceneforge/2026-06-19-sceneforge-stage-contract-alignment-audit.md`
- `docs/superpowers/plans/2026-06-19-sceneforge-stage-contract-alignment.md`
- `/Users/tangwujun/Documents/trae_projects/scene_forge/.agents/skills/scene-design-builder/`
- `/Users/tangwujun/Documents/trae_projects/scene_forge/.agents/skills/scene-storyboard-director/`
- `/Users/tangwujun/Documents/trae_projects/scene_forge/.agents/skills/scene-video-prompt-builder/`
- `electron/sceneforge/validators/*.ts`

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 旧项目 skill 与当前 Studio artifact contract 并非一一对应 | 采用“语义压回现有 artifact”的推荐路线，单独记录无法压回的例外 |

## 2026-06-19 Audio Voice Alignment
- 旧 `scene-audio-director` 明确要求配音方向覆盖语速、气口、停顿、情绪递进和角色级声音设计，并把这些内容交给下游视频提示词阶段继承。
- 当前 `audio` 虽有 `voice_direction` section，但缺少人声身份锁定、分段人声连续性和脚本台词输入，容易在分段视频生成时出现口气漂移。
- 当前 `video_prompts` 保留四层声音执行块是合理的，但仍应从 `audio` 继承 voice continuity 说明；不需要因此新增第五个正式声音块。
