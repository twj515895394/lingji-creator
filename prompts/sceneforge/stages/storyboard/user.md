# Storyboard Stage User Prompt

使用下面的 Stage Context，禁止读取未列出的项目文件。

{{stageContext}}

按 output contract 返回 Markdown 产物。

请把结果写成正式 storyboard 阶段交付，而不是内部导演草稿：

- `storyboard_prompt_pack`：必须显式包含 `storyboard_prompt_pack`、`beat_skeleton`、`storyboard_content_breakdown`、`cinematic_language_plan`、`video_generation_units`、`shot_continuity_plan`、`continuity_control_system`、`storyboard_prompt_pack_plan`、`storyboard_quality_check`、`design_reconciliation_review` 这些 Markdown 章节。
- `storyboard_prompt_pack` 中每个正式 Pack 都必须包在显式标签里：`<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">...</copy-block>`；`id` 必须使用 `pack-XX` 两位数格式，标签体正文必须是可直接投喂出板模型的完整单包内容。
- `control_board_prompts`：必须写成正式 control board，保留 `Control-Oriented Storyboard Board` 标题；每个 Pack 都要单独包进 `<copy-block ...>`，并在块内以 `## Pack N:` 起头。红色人物运动箭头与蓝色摄影机运动箭头必须明确写在各格画面区内，而不是只写在底部轨道说明里。
- `style_board_prompts`：必须写成正式 style board，保留 `Style & Rendering Storyboard Board` 标题；每个 Pack 都要单独包进 `<copy-block ...>`，并在块内以 `## Pack N:` 起头。
- `master_board_prompt`：提供一个项目级总控锚点，统一整板数量、连续性、视觉基调和最终约束。

额外强制要求：

- 正文默认中文主导，英文只保留必要专业术语；除非用户明确要求，不要写成全英文。
- `storyboard_prompt_pack_plan` 必须显式说明总镜头数（`total_shots` / 总镜头数）、单包还是多包、每包覆盖范围。
- `storyboard_prompt_pack_plan` 必须显式写出 `segment_duration_seconds`，并为每个 Segment 给出 `time_range`、`pacing_profile`、`shot_count`、`boundary_lock`。
- 每个 Segment 的 `shot_count` 必须符合段长与节奏预期：5s=3-8、6s=4-9、8s=5-10、10s=6-12、15s=8-16；`lyrical` 靠低密度，`balanced` 靠中密度，`kinetic` 靠高密度。
- 当 `segment_duration_seconds` 已锁定时，不得写出跨段 Segment time_range，例如 10 秒分段下的 `9s-13s`。
- 若总镜头数不超过 12，默认单包；若超过 12，默认多包，并说明为什么这样拆包。
- `beat_skeleton`、`storyboard_content_breakdown`、`video_generation_units`、`shot_continuity_plan` 之间的分段数、包数和镜头范围必须互相对齐，不能各写各的。
- 多包时，`control_board_prompts` 与 `style_board_prompts` 都必须按 Pack 逐个落正式 prompt 结构。每个 Pack 都要可单独复制给外部出板模型，不能共享一个总说明块。
- `control_board_prompts` 与 `style_board_prompts` 的每个 Pack 都必须整体包在显式标签里：`<copy-block type="storyboard-pack" id="pack-01" label="...">...</copy-block>`，并在块内以 `## Pack 1:` 起头。
- `control_board_prompts` 每个 Pack 都必须显式拆成“画面区”和“控制区”两部分；不能只给表格或 shotlist。
- `画面区` 必须逐格明确写出：`红色人物运动箭头` 与 `蓝色摄影机运动箭头`，并说明这两类箭头都标在分镜画面区内部，而不是底部控制区。
- `control_board_prompts` 的 `画面区` 每格都必须保持专业分镜描述密度，不能只写一句画面概述再把篇幅都给箭头说明。每格至少应覆盖大多数以下维度：景别、机位角度、构图重心、主体姿态与表演状态、空间关系、前中后景层次、光线方向、关键材质/环境细节、镜头运动结果、叙事目的。
- 红色人物运动箭头与蓝色摄影机运动箭头只是覆盖在画面描述上的控制标注，不能替代主体画面描述本身。
- `style_board_prompts` 每个 Pack 也必须显式拆成“画面区”和“控制区”两部分；不能只给英文 style prompt 加风格说明表。
- `style_board_prompts` 的 `画面区` 也必须逐格明确保留：`红色人物运动箭头` 与 `蓝色摄影机运动箭头`，并说明这两类箭头仍然标在分镜画面区内部；风格板只能美化呈现，不得删除这些箭头规则。
- `style_board_prompts` 的 `画面区` 每格除风格、光影、材质、色彩外，也必须交代景别、构图、空间层次、主体表演状态与镜头空气感，不能退化成“风格词 + 箭头规则”的简略条目。
- `style_board_prompts` 必须严格继承已锁定的角色、服装、滑板、场景、光线时段与 pack 覆盖范围，不得擅自改写成新的造型或新的场景题材。
- 若为多包结构，必须明确设计 Pack 与 Pack 之间的衔接镜头或衔接策略，说明上一包收束镜头如何平滑过渡到下一包起始镜头，至少覆盖角色朝向、视线、运动方向、场景轴线、速度感与光线连续性。
- 每个 Pack 的控制板正文都要明确：`Panel Layout`、`Beat Line`、`Camera Path`、`Action Path`、`Rhythm Track`、`State Track`、`Continuity Rules`、`Color Legend`。
- 每个 Pack 中如果某格无人物移动或无摄影机运动，必须显式写出“人物静止”或“固定机位”。
- `design_reconciliation_review` 必须明确包含 `design_revision_required: true | false`，并说明最终分镜是否新增了 design 阶段未覆盖的表情、姿态、道具状态或空间 blocking 需求。
- 不要把 review、标签说明或控制板/风格板的附加元信息塞进 `storyboard_prompt_pack` 的 `copy-block` 体内；`copy-block` 只容纳该包的正式可执行正文。

不要退化成 bare shotlist、纯英文摘要，或只有 mood notes 的松散草稿。
