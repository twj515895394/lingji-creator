# 设计阶段 · 用户提示

仅使用以下 Stage Context，不要读取未列出的项目文件：

{{stageContext}}

按产出契约返回 Design 阶段全部产物。保持角色数量、阵营关系与默认空间站位与上游 story / reference / assets 一致。

## design_prompts（设定总览）

用 **中文 `##` 小节标题** 组织（勿用英文 section 名作标题），须包含：

- 视觉语言
- 角色设计
- 场景设计
- 道具设计
- 空间连续性
- 道具状态机
- 场面调度
- 节奏契约（写明 `segment_duration_seconds` 或与上游 `segment_duration_sec` 一致的段长）
- 分段节奏配置
- 镜头密度期望（覆盖 5s / 6s / 8s / 10s / 15s，区分 lyrical / balanced / kinetic）
- 边界规则（明确镜头不得跨段，禁止 10 秒分段下出现 9s-13s 这类跨段镜头）

## character_prompts

中文主导的「角色说明书板」，须含：角色说明书、多视角、轮廓剪影、表情系统、微表情、动作姿态、关键道具交互、细节区、比例对照、边界约束。多角色不得合并为一人。

## scene_prompts

「全场景资产总参考图」：主场景空间布局、角色默认站位、核心道具位置、道具状态矩阵、出入口与运动轴线。

## prop_prompts / master_reference_prompt

按用户可读、可复制的 Markdown 写出，服务下游直接继承。

各产物须为可生产的 Markdown，禁止 character_prompts 退化为单段摘要、整段英文对照或海报式肖像 prompt。
