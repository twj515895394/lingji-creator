# Video Prompts User Prompt

只使用下面的 Stage Context，不要补读未列出的项目文件。

{{stageContext}}

按 output contract 返回 Markdown。默认主交付返回 `video_prompt_pack_cn`、`video_prompt_review` 与 `video_prompt_trace`；除非用户明确要求英文版，不要额外生成英文主包。

正式 pack 必须保留以下结构：

- `video_prompt_pack_plan`
- `global_execution_preamble`
- `故事板关键帧参考规则`
- `项目级全局锁定规则`
- one or more `Segment XX`
- inside each segment: `Segment X 技术控制说明`
- inside each segment: `segment_sound_execution`
- inside each segment: `Segment X 导演长版提示词`

Inside `segment_sound_execution`, explicitly provide:

- `BGM`
- `Foley-SFX`
- `Ambience`
- `Silence`
- `Voice`（仅在台词、人声、呼吸、笑声或说话人连续性已被上游明确时出现）

额外强制要求：

- `video_prompt_pack_cn` 必须是中文主导、可直接投喂的正式交付，而不是翻译摘要。
- 中文必须承担主体结构、technical control 和导演长版提示词的主要正文；不要写成英文 compiled prompt 加少量中文注释。
- `video_prompt_pack_plan` 必须明确写出本包覆盖哪些 storyboard packs、哪些 segments，以及为何这样分包。
- 若 storyboard 已规划多个 Pack，`video_prompt_pack_cn` 必须按相同顺序输出多个正式 Pack 块，不能把多个 storyboard packs 擅自压成一个总包。
- `video_prompt_pack_cn` 中每个正式 Pack 都必须包在显式标签里：`<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">...</copy-block>`；`id` 必须使用 `pack-XX` 两位数格式，标签体正文必须是可直接投喂视频模型的完整单包内容。
- 若 storyboard 已明确控制板 / 风格板 pack 参考关系，`故事板关键帧参考规则` 必须显式写出：将“控制故事板 Pack XX”作为动作与连续性主参考，将“风格故事板 Pack XX”作为渲染与氛围辅助参考。
- 若 storyboard 控制板里写了“红色人物运动箭头”“蓝色摄影机运动箭头”“Color Legend”等图面标注，你必须把它们翻译成视频模型可执行的自然语言，例如“人物运动方向”“动作路径”“摄像机运动方向”“固定机位”“镜头轻微上仰跟随”；不要把“箭头”“图例”这类控制板术语原样写进 `video_prompt_pack_cn`。
- 每个 segment 的导演长版提示词必须继承 storyboard shot order、VGU、continuity_in / continuity_out、角色数量、screen-side lock、道具状态连续性、next handoff，以及 audio 阶段确认的 BGM / Foley-SFX / Ambience / Silence；若 audio 已锁定 voice identity / pause rhythm / narration cadence，也必须一起继承，并在 `Voice` 小节落明。
- 分包数、Segment 范围、VGU 引用和时间码流必须前后一致，不能和 storyboard 上游漂移。
- 若某 optional 输入只有标题级摘要、单行标签或空泛提示，不要把它扩写成新规则；只能使用其中已明确写出的具体信息。
- `video_prompt_review` 必须单独输出 review_status、review_round、issues_found、auto_fixes_applied、final_delivery_ready，不要把 review 混进正式 pack 正文。
- `video_prompt_trace` 必须单独输出 actual_inputs_used、pack_mapping、segment_trace、optional_input_effectiveness、continuity_sources、open_risks，不要把 trace 混进正式 pack 正文。
- `项目级全局锁定规则` 至少要逐条写出：主场景、角色锁定、不重复角色、画面可读性、风格锁定、灯光锁定、负向边界。
- `Segment X 技术控制说明` 必须是自然语言长段，正文里明确出现并解释 VGU、continuity_in、continuity_out、blocking、prop state、next_handoff。
- `Segment X 导演长版提示词` 不能只写时间码和一句短句；每个关键镜头都要在正文中覆盖这些维度：景别、机位/运镜、构图、动作、情绪/表演状态、道具/角色状态、负向边界，以及与声音层的承接关系。不要被固定措辞或案例词表束缚。
- `video_prompt_pack_cn` 里不要再保留 `prompt_trace`、`pack_audio_execution_plan`、`project_level_global_rules`、`video_prompt_review`、`video_prompt_trace` 或 `可直接复制使用块` 这种旧结构残留。
- 不要把 `video_prompt_review`、`video_prompt_trace`、解释性注释或标签说明塞进 `copy-block` 体内；`copy-block` 只容纳单个 pack 的正式可执行正文。

不要退化成短 review memo、参数表、YAML 技术块，或只有一个 compiled paragraph 的松散稿。
