Status: ready-for-agent

# PRD：SceneForge Segment Rhythm Contract

## 问题陈述

当前 SceneForge 在 `topic_gate` 已经允许用户选择 `segment_duration_sec`，但这项设定还没有被系统性地转译成下游 `design / script / storyboard` 的正式节奏约束。结果是：

- 上游明明设定了每段 `5s / 6s / 8s / 10s / 15s`，下游仍可能出现跨段镜头或跨段动作设计。
- `script` 知道故事节拍，却没有稳定表达“这一段是抒情慢节奏还是动作快节奏、应给 storyboard 多高镜头密度”。
- `storyboard` 虽然已经要求总镜头数与 pack 规划，但还没有把“镜头不能跨 segment 边界”和“镜头密度必须服从段长与节奏类型”提升成正式 contract。
- 用户无法相信“前面 gate 的分段时长设置”真的会约束后面的分镜拆分与镜头节奏。

从用户视角看，这会直接表现为：上游设了规则，但下游分镜像是重新自由发挥；慢抒情段可能被切得过碎，快动作段又可能镜头不足，无法形成稳定可消费的主链。

## 解决方案

把“节奏 contract”拆成两层，并压回现有阶段体系：

1. `design` 负责定义并显式落盘全局节奏边界：段长、节奏类型、每段镜头密度预期、跨段禁止规则。
2. `script` 负责把故事节拍落实到每段 pacing 意图与 storyboard handoff，不直接生成 shot list，但必须明确每段的 pacing profile 与 shot density hint。
3. `storyboard` 负责把上述节奏 contract 真正落成逐镜头拆分，并以 validator 硬校验：
   - shot 不得跨越 segment 边界
   - 镜头数量必须落在该段时长 + pacing profile 对应的 density 区间
   - 慢节奏段允许更长 hold，但不能借此丢失结构
   - 快节奏段必须体现更高切分密度与更明确的动作推进

整个方案保持当前产品语义不变：

- 不新增公开页面入口
- 不新增新 stage
- 不新增新主 artifact 类型
- 不改 `project.json` 结构
- 不引入新 IPC

## 用户故事

1. 作为 SceneForge Studio 用户，我想在 `topic_gate` 里设置每段 `5s / 6s / 8s / 10s / 15s`，以便后续脚本和分镜都围绕同一节奏边界工作。
2. 作为创作者，我想让 `design` 阶段明确记录每段节奏类型与镜头密度预期，以便后续阶段不是凭感觉拆镜头。
3. 作为创作者，我想让 `script` 阶段明确每段是 `lyrical / balanced / kinetic` 哪种 pacing，以便 storyboard 知道应该慢切还是快切。
4. 作为创作者，我想让 `script` 阶段给出每段 `shot_density_hint`，以便 storyboard 不会把抒情段切碎，也不会把动作段切得太少。
5. 作为创作者，我想让 `script` 阶段严格遵守段落时间边界，以便不会出现明明设了 10 秒分段却设计出 `9s-13s` 这种跨段内容。
6. 作为 storyboard 使用者，我想让系统明确禁止跨段镜头，以便每个 shot 都能被稳定映射到一个 segment 内。
7. 作为 storyboard 使用者，我想让 10 秒段通常落在 `6-12` 镜头范围内，以便镜头密度更符合短视频主流节奏。
8. 作为 storyboard 使用者，我想让 15 秒段通常落在 `8-16` 镜头范围内，以便长段既有展开空间又不至于过散。
9. 作为 storyboard 使用者，我想让 5 秒、6 秒、8 秒段也各自有正式 density 规则，以便 gate 里的所有段长选项都真正受支持。
10. 作为创作者，我想让抒情段拥有更低的推荐镜头密度，以便保留情绪停顿和画面呼吸。
11. 作为创作者，我想让动作段拥有更高的推荐镜头密度，以便体现速度、冲击和动作链推进。
12. 作为创作者，我想让普通叙事段处于中等镜头密度，以便兼顾信息推进和画面可读性。
13. 作为审阅者，我想在 `storyboard` 失败时看到“为什么失败”的明确原因，例如“镜头跨段”或“密度过低”，以便快速修正。
14. 作为产品维护者，我想沿用现有 `Stage Pack + Validator` 作为主接缝，以便不再额外发明一套平行协议。
15. 作为开发者，我想把规则尽量压进现有 artifact 的 section 与 validator，以便减少对 UI、保存链和 export 的连锁改动。
16. 作为主链验收执行者，我想先打通 `design -> script -> storyboard` 的节奏 contract，再继续后续 `video_prompts`，以便主链语义更稳定。
17. 作为长期维护者，我想把 `cut_density_expectation` 做成基于“段长 + pacing profile”的表，而不是单一死规则，以便适配更多题材。
18. 作为用户，我想让前面的 gate 选择真的成为后续分镜执行约束，而不是只停留在展示文本里。

## 实现决策

- 采用两层节奏 contract：`design` 定边界与期望，`storyboard` 做逐镜头执行与硬校验；`script` 作为中间承接层。
- 继续沿用现有 `topic_gate -> design -> script -> storyboard` 主链，不新增 stage。
- 继续沿用现有 artifact key，不新增新的 rhythm artifact；所有新增语义压回现有 artifact section。
- 采用“单一主接缝”策略：以现有 Stage Pack + Validator 作为本包的唯一主接缝，不再引入第二套节奏协议系统。
- `design` 阶段需要显式产出项目级 `rhythm contract`，至少包含：
  - `segment_duration_seconds`
  - `pacing_profiles`
  - `cut_density_expectation`
  - `boundary_rules`
- `script` 阶段需要显式产出 segment 级 pacing handoff，至少包含：
  - `segment_id`
  - `segment_time_range`
  - `pacing_profile`
  - `shot_density_hint`
  - `boundary_lock`
- `storyboard` 阶段继续使用现有 `storyboard_prompt_pack` / `storyboard_prompt_pack_plan` / `video_generation_units` / `storyboard_quality_check`，但新增节奏硬规则，不新增新 artifact。
- 以 `segment_duration_sec` 为硬边界，shot 必须完整落在单一 segment 内；禁止出现 `9s-13s` 这种跨段 shot。
- `cut_density_expectation` 采用“硬区间 + 节奏推荐”双层表达：
  - 5s：`3-8`
  - 6s：`4-9`
  - 8s：`5-10`
  - 10s：`6-12`
  - 15s：`8-16`
- 在上述硬区间内，再按 pacing profile 给推荐带：
  - `lyrical`：靠下限
  - `balanced`：靠中段
  - `kinetic`：靠上限
- 保留 `12s` 作为 storyboard methodology / VGU 参考资产中的内部兼容值，但当前用户可见 gate 选项仍以 `5 / 6 / 8 / 10 / 15` 为主。
- 不在本轮把 `script` 直接升级为 shot planner；镜头数强校验只落在 `storyboard`。
- `storyboard` validator 的失败原因需要显式区分：
  - `segment boundary crossed`
  - `shot density too low`
  - `shot density too high`
  - `pacing mismatch`
- 若镜头密度已经逼近上限但仍无法表达动作/情绪链，优先建议拆分 unit 或调整节奏，不鼓励继续无上限堆 shot。

## 测试决策

- 测试只验证外部可观察行为，不测试 prompt 文案内部实现细节。
- 重点测试 seam 是现有 Stage Pack + Validator，而不是额外造 mock UI 交互流。
- `design` 测试应覆盖：
  - gate 中不同 `segment_duration_sec` 是否被下游 contract 正确继承
  - 是否产出正式 `cut_density_expectation` 与 `boundary_rules`
- `script` 测试应覆盖：
  - 是否显式产出每段 pacing profile 与 shot density hint
  - 是否拒绝跨段时间范围 handoff
- `storyboard` 测试应覆盖：
  - 5 / 6 / 8 / 10 / 15 秒段的镜头数边界
  - 慢 / 中 / 快三类 pacing 的密度差异
  - 跨段 shot 失败
  - 过低或过高密度失败
- 回归测试应覆盖：
  - `design -> script -> storyboard` 主链上下文未回退
  - 旧的 `storyboard_prompt_pack_plan` / copy-block / pack 拆分规则仍然成立
- 测试先例优先参考现有：
  - SceneForge validator tests
  - stage-context / stage-pack tests
  - direct-llm happy path tests

## 超出范围

- 不在本包中实现新的 `topic_gate` 真实 LLM 分析。
- 不在本包中推进 ACP / Publish / 导出链或全局 UI 重构。
- 不在本包中新增 stage、artifact key、IPC 或 `project.json` schema。
- 不在本包中把 `script` 变成逐镜头 shot planner。
- 不在本包中处理 `video_prompts` 的新一轮声音或镜头扩展协议，除非主链验收证明必须联动。

## 进一步说明

- 本包优先级是“主链节奏 contract 收口”，本质上属于 `design/script/storyboard` 的协议补强包。
- 推荐的详细设计路径是：
  - 先落设计文档和密度表
  - 再拆 issue
  - 再按 `design -> script -> storyboard -> acceptance` 顺序实施
- 本包完成后，SceneForge 才算真正把 gate 的分段设定转化为下游可执行规则，而不是只保留为前端显示信息。
