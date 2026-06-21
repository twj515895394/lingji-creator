# SceneForge Segment Rhythm Contract 详细设计

## 1. 设计目标

本包目标不是新增功能入口，而是把已经存在于 `topic_gate` 的 `segment_duration_sec`，升级成贯穿 `design -> script -> storyboard` 的正式节奏 contract。

设计原则：

- 主链优先，不开新 stage。
- 复用现有 Stage Pack + Validator 接缝，不造第二协议。
- 上游负责定义节奏边界，下游负责镜头执行与硬校验。
- `script` 保持 narrative-centered，不抢 `storyboard` 的逐镜头职责。

## 2. 单一主接缝

本包只认一条主接缝：

- `Stage Context` 提供上游节奏输入
- `Stage Pack` 定义每阶段应输出的节奏 contract section
- `Validator` 对 contract 做硬校验

不新增独立 rhythm service，不新增新的 project schema，不新增单独存储文件。

## 3. 阶段分工

### 3.1 `topic_gate`

职责：

- 提供 `segment_duration_sec`
- 继续作为用户显式选择节奏颗粒度的入口

本包不改：

- 表单结构
- `project.json`
- topic gate 页面入口

### 3.2 `design`

职责：

- 把 gate 中的段长设定，转译成项目级 rhythm contract
- 锁定每类 segment 的 pacing profile 与镜头密度期望
- 明确“镜头不得跨 segment 边界”这一条全局规则

建议压入现有 `design_prompts` 的新 section：

- `rhythm_contract`
- `segment_rhythm_profiles`
- `cut_density_expectation`
- `boundary_rules`

这里的关键不是 shot list，而是“后面应该怎么拆 shot”的全局约束。

### 3.3 `script`

职责：

- 把故事节拍落到 segment 级 pacing handoff
- 明确每段的情绪节奏、动作密度和 storyboard handoff
- 明确每段只能使用本段时间窗口，不得跨段

建议压入现有 `script_draft` 的 section 或子字段：

- `segment_strategy` 中补 `segment_time_range`
- `video_generation_unit_plan` 中补 `pacing_profile`
- `storyboard_handoff` 中补 `shot_density_hint` 与 `boundary_lock`

`script` 不做的事：

- 不负责生成逐镜头 shot count
- 不直接承担最终镜头数 validator

### 3.4 `storyboard`

职责：

- 将 segment 级 pacing handoff 落成逐镜头拆分
- 对总镜头数与分包逻辑维持现有 contract
- 新增 segment boundary 与 shot density 的正式校验

建议落点：

- `storyboard_prompt_pack_plan`
- `video_generation_units`
- `storyboard_quality_check`

`storyboard` 是本包真正承担“镜头数硬约束”的阶段。

## 4. 双层节奏 contract

### 4.1 第一层：结构边界

来自 `topic_gate` + `design`

定义：

- 本项目单段时长
- 每段默认 pacing 类型
- 允许的镜头密度区间
- 跨段禁止规则

这是硬边界，后续阶段不能自行改写。

### 4.2 第二层：镜头执行

来自 `script` + `storyboard`

定义：

- 某一段属于慢 / 中 / 快哪种 pacing
- 该段推荐镜头密度
- 该段的逐镜头拆分
- 是否满足段内节奏与镜头边界

这是执行层，必须继承第一层，而不是重做第一层。

## 5. `cut_density_expectation` 重设计

### 5.1 设计思路

只给“10 秒段 6-12，15 秒段 8-16”还不够，因为 gate 还存在 `5s / 6s / 8s` 选项，而且同样 10 秒，抒情段和动作段也不应同标尺。

所以本包采用两级表达：

1. 硬区间：validator 真正执行的总可接受范围
2. 推荐带：按 pacing profile 决定的更细范围

### 5.2 硬区间

| 段长 | 硬区间 |
|---|---|
| 5s | 3-8 shots |
| 6s | 4-9 shots |
| 8s | 5-10 shots |
| 10s | 6-12 shots |
| 15s | 8-16 shots |

### 5.3 推荐带

| 段长 | lyrical | balanced | kinetic |
|---|---|---|---|
| 5s | 3-4 | 4-6 | 6-8 |
| 6s | 4-5 | 5-7 | 7-9 |
| 8s | 5-6 | 6-8 | 8-10 |
| 10s | 6-7 | 7-9 | 9-12 |
| 15s | 8-10 | 10-12 | 12-16 |

解释：

- `lyrical` 优先给停顿、关系、情绪呼吸和 longer hold。
- `balanced` 用于普通叙事推进。
- `kinetic` 用于动作、追逐、快速反应和高节奏冲击。

### 5.4 特殊规则

- 若段落内容偏抒情，但仍落在高密度区间，不算自动失败，但应给 warning 或 review 标记。
- 若段落内容偏动作，却落在过低密度区间，优先视为 pacing mismatch。
- 若已经触到硬上限仍表达不足，推荐拆 unit 或重写节奏，不鼓励继续增加 shot。

## 6. 不可跨段规则

这是本包最重要的硬规则之一。

定义：

- 一个 shot 的起止时间必须完整落在单一 segment 内。
- `0-10s` 与 `10-20s` 的分段下，不允许出现 `9s-13s` 这类跨段 shot。
- 若存在跨段动作链，应拆成两个 shot，并在 continuity 里表达承接。

原因：

- 跨段镜头会直接破坏 gate 的节奏边界意义。
- 下游 `video_prompts` 与 copy-ready 产物在消费时会更难稳定继承。

## 7. Validator 策略

### 7.1 `design`

校验重点：

- 是否显式继承 `segment_duration_sec`
- 是否存在正式 `cut_density_expectation`
- 是否写明 pacing profile 与 boundary rules

失败案例：

- 只有“节奏偏快/偏慢”形容词，没有具体区间
- 没有覆盖 5/6/8/10/15 秒段长逻辑
- 没有写“禁止跨段”

### 7.2 `script`

校验重点：

- 是否存在每段 `segment_time_range`
- 是否存在 `pacing_profile`
- 是否存在 `shot_density_hint`
- 是否存在明确 `storyboard_handoff`

失败案例：

- story beats 与 segment 节奏完全脱节
- 只写“快一点/慢一点”，没有落到段级 handoff
- 出现跨段时间范围描述

### 7.3 `storyboard`

校验重点：

- total shots 与 pack 规划继续满足现有 contract
- 所有 shots 是否完整落在单一 segment 内
- 每段 shot count 是否满足硬区间
- 每段 shot density 是否与 pacing profile 基本一致

失败案例：

- shot 跨段
- 10 秒段少于 6 或多于 12
- 15 秒段少于 8 或多于 16
- pacing 指定为 `kinetic` 却只有极低密度
- pacing 指定为 `lyrical` 却被切成极碎高频段

## 8. 上下游数据流

### 8.1 输入链

`topic_gate.segment_duration_sec`
→ `design.rhythm_contract`
→ `script.segment_strategy / storyboard_handoff`
→ `storyboard.video_generation_units / storyboard_prompt_pack_plan`

### 8.2 不新增结构

本包不需要：

- 新数据库字段
- 新 artifact key
- 新 preload / IPC
- 新 project file schema

## 9. 推荐实施顺序

1. 先补文档资产与密度表口径
2. 再补 `design` prompt / validator
3. 再补 `script` prompt / validator
4. 最后补 `storyboard` prompt / validator 与回归

## 10. 风险与控制

### 风险 1：`script` 过度 storyboard 化

控制：

- `script` 只产 pacing handoff，不产逐镜头拆分。

### 风险 2：镜头数规则写死过头

控制：

- 用“硬区间 + 推荐带”双层表达，避免只剩机械数字。

### 风险 3：与现有 storyboard pack 规则冲突

控制：

- 新规则压入现有 `storyboard_prompt_pack_plan` 与 `storyboard_quality_check`，不重做 pack 体系。

### 风险 4：gate 选项和 methodology 资产不一致

控制：

- 用户可见 gate 先按 `5 / 6 / 8 / 10 / 15` 设计；
- `12s` 仅保留为内部 methodology / legacy compatibility，不作为本包主口径。

## 11. 本包完成标准

满足以下条件即算完成：

- `design` 能正式写出项目级节奏 contract
- `script` 能正式写出段级 pacing handoff
- `storyboard` 能正式执行并校验镜头密度与边界
- 至少一条 `design -> script -> storyboard` 主链 happy path 跑通
- 失败时能明确报出边界或密度原因
