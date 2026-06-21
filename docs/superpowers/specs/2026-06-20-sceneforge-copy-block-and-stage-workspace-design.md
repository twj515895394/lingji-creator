# SceneForge Copy Block 与 Stage Workspace 收口设计

> 日期：2026-06-20
> 状态：待评审
> 范围：SceneForge Studio 核心产物复制协议、工作区信息密度收口、阶段快速通过语义
> 关联文档：
> - `docs/sceneforge/2026-06-18-sceneforge-studio-ux-clarity-design.md`
> - `docs/sceneforge/2026-06-18-sceneforge-continue-and-run-design.md`
> - `.scratch/sceneforge-studio/issues/11-core-artifact-display-model-and-copy-blocks.md`
> - `.scratch/sceneforge-studio/issues/12-core-artifact-click-view-and-copy-ux.md`

## 1. 背景与问题

SceneForge 当前 Direct LLM 主链已经能稳定生成并提交核心产物，但 Studio 在“如何查看、复制、确认、快速推进”这几个关键交互上仍保留了早期过渡实现。最近围绕 `video_prompts` 的真实使用暴露出四类问题：

1. `Copy` 面板仍按 Markdown 标题猜测复制边界，`video_prompt_pack_cn` 被拆成一组 `Segment` 级复制块，但用户实际工作单元是 `pack`，不是 `segment`。
2. 当前阶段工作区的“本阶段输入”信息量大但查看频率低，默认完整展开会压缩核心产物区域，影响主任务。
3. “核心产物概览”下方额外挂出一组 copy block 摘要，和右侧 Artifact Inspector 的 `Copy` 视图重复，造成噪音。
4. 阶段推进虽然已有 `required / optional / auto_if_valid / skip` 审批策略，但前端仍要求用户频繁手动点击，导致用户体感是“每个阶段都要人工过门”，没有体现“核心阶段必须确认、非核心阶段尽快通过”的产品目标。

本设计的目标不是重做 SceneForge Studio，而是在不推翻现有主链的前提下，把复制协议、工作区层级和阶段推进语义收拢到真实使用方式上。

## 2. 设计目标

### 2.1 主目标

- 让核心产物的默认复制单元与用户真实投喂外部模型的单位一致。
- 让工作区优先突出“当前最值得看和操作的东西”，而不是历史上所有可展示信息。
- 让阶段推进机制更接近“核心人工确认、非核心快速通过”。

### 2.2 非目标

- 不在本轮引入富文本编辑器或可视化卡片式 prompt 编辑器。
- 不改变 `Continue` 与 `Continue & Run` 的基础工程语义。
- 不把所有 support 阶段都改成无人值守自动执行链。
- 不在本轮重做 `review` / `trace` 的内容模型，只调整它们在 Copy 工作流中的职责边界。

## 3. 设计原则

1. 显式协议优先于隐式猜测。复制边界由产物声明，不再长期依赖标题解析。
2. `pack` 是主复制单元，`segment` 是包内结构，不再作为默认主入口。
3. 核心路径优先。Studio 默认先服务“看 final、复制 final、确认 final、继续下一阶段”。
4. 向后兼容优先。旧产物和旧项目在没有新协议时仍可通过 fallback 查看与复制。
5. 不静默改写核心语义。`Continue` 仍表示确认并进入下一阶段；任何“快速通过”都要有清晰、可解释的触发条件。

## 4. 现状分析

### 4.1 复制机制现状

当前 `Copy` 页的内容来自 `buildSceneArtifactDisplayModel()`。其逻辑分两步：

1. 按 `artifact.stage + artifactKey` 选择解析器。
2. 解析器根据 Markdown heading 提取 section 或 `Segment`。

这导致：

- `design` 倾向按“角色 / 场景 / 道具 / 总参考图”章节切块。
- `storyboard.storyboard_prompt_pack` 会按 `Segment 01 / Segment 02` 切 prompt block。
- `video_prompts.video_prompt_pack_cn` 会生成一个“整包 section”加若干“Segment prompt”。

这套逻辑适合“结构化阅读”，但不适合“一个包直接喂外部模型”的使用方式。

### 4.2 工作区信息层级现状

中间工作区当前同时承担：

- 上游依赖说明
- 项目级参考资产说明
- 阶段概要
- 核心产物入口
- copy 摘要
- 审批策略
- Run / Validate / Continue

信息层级过平，导致低频信息占用主视觉高度。尤其在 `video_prompts` 这类核心阶段，用户真正关心的是：

1. 当前阶段有哪些 final artifacts
2. 哪个 artifact 是主交付
3. 怎样快速复制一个完整 `pack`
4. 当前阶段是否已可继续

### 4.3 推进语义现状

后端审批策略仍然有效：

- `required`：校验通过后进入 `waiting_approval`
- `optional`：校验通过后进入 `validated`
- `auto_if_valid`：校验通过后进入 `completed`
- `skip`：校验通过后进入 `skipped`

问题不在状态机，而在前端体验没有把这些策略转成不同等级的“用户需要参与多少次点击”。

## 5. 方案总览

本轮采用三个并行收口：

1. 引入显式 `copy-block` 协议，作为核心产物复制边界的真相源。
2. 调整 Stage Workspace 的信息层级，弱化低频信息、去掉重复 copy 摘要。
3. 保留现有审批策略模型，但把前端流程重构成“核心阶段重确认、非核心阶段轻确认”的可演进结构。

## 6. Copy Block 协议

### 6.1 协议形式

核心产物正文中允许内嵌轻量结构化标签：

```xml
<copy-block type="video-pack" id="pack-01" label="视频提示词 第01包">
...可直接投喂视频模型的正文...
</copy-block>
```

```xml
<copy-block type="storyboard-pack" id="pack-01" label="故事板提示词 第01包">
...可直接投喂生图模型的正文...
</copy-block>
```

### 6.2 字段约束

- `type`
  - 首批支持：`video-pack`、`storyboard-pack`
  - 后续可扩展，但本轮不预留未使用类型
- `id`
  - 稳定主键，格式固定为 `pack-01`、`pack-02`
  - 在同一 artifact 内必须唯一
- `label`
  - 用于 UI 直接展示
  - 不再由前端根据标题猜测“第几包”
- 标签体正文
  - 必须是纯可复制投喂文本
  - 不允许混入 review、trace、validator 说明、调试注释

### 6.3 与旧正文结构的关系

`copy-block` 是复制协议，不强制等于正文全部结构。正文仍可保留自然 Markdown 层次，例如：

- 包概览
- segment 说明
- 负向边界
- 声音承接

但只有被 `copy-block` 包住的部分，才被视为主复制块。

## 7. 各阶段的复制语义

### 7.1 `video_prompt_pack_cn`

默认复制主粒度为 `pack`。

要求：

- 每个正式视频包必须对应一个 `copy-block type="video-pack"`。
- 包的数量、顺序必须与上游 storyboard 已确认的 pack 结构一致。
- `segment` 可以继续保留在包内正文中，但不再生成默认主复制按钮。

UI 表达：

- `复制视频提示词 第01包`
- `复制视频提示词 第02包`
- `复制视频提示词 第03包`

### 7.2 `storyboard_prompt_pack`

默认复制主粒度同样为 `pack`。

要求：

- 每个正式故事板包必须对应一个 `copy-block type="storyboard-pack"`。
- 每个块应能直接作为一次生图输入使用。
- 控制板、风格板、总板等单独 artifact 继续保留现有复制方式，不强制并入 pack 协议。

UI 表达：

- `复制故事板提示词 第01包`
- `复制故事板提示词 第02包`

### 7.3 `review` 与 `trace`

`video_prompt_review` 与 `video_prompt_trace` 不作为本轮 `copy-block` 主优化对象。

规则：

- 继续支持全文复制
- 如后续真实使用证明需要块级复制，再单独立包设计

## 8. Display Model 解析策略

### 8.1 新优先级

Display Model 的复制块生成顺序调整为：

1. 优先解析显式 `copy-block`
2. 若无 `copy-block`，回退到现有 heading/segment 解析
3. 若回退也失败，保留全文复制 fallback

### 8.2 返回模型

`copyBlocks` 继续保留 `full / section / prompt` 三种 target，但语义调整为：

- `full`
  - 全文复制
- `section`
  - 整个主交付或兼容旧结构的章节块
- `prompt`
  - 显式 `copy-block` 的主投喂块

对于 `video_prompt_pack_cn` 与 `storyboard_prompt_pack`：

- 默认主可见块应来自显式 `copy-block`
- 旧的 `Segment 01` 风格 prompt block 只在 fallback 模式下保留

### 8.3 解析失败与告警

若正文存在损坏标签、闭合不匹配或属性非法：

- 不阻塞查看
- 返回 warning
- 自动回退到旧 heading 解析或全文复制

## 9. Stage Workspace 收口

### 9.1 本阶段输入默认折叠

“本阶段输入”改为默认折叠，保留显式展开入口。

自动展开条件：

- 存在缺失的 required input
- 用户手动展开

折叠态展示：

- 必需输入数量
- 可选输入数量
- 是否存在缺失项

目标是把该区域从“长列表内容区”降级为“状态摘要 + 需要时展开”。

### 9.2 核心产物概览去噪

中间工作区继续保留：

- artifact chip 行
- 当前主交付的简短说明

但移除当前工作区内那组 copy block 摘要列表，即不再在中间区直接列出：

- `复制 Segment 01`
- `复制 Segment 02`

复制交互统一集中在右侧 Artifact Inspector 的 `Copy` 页。

### 9.3 核心产物数量修正

`video_prompts` 的核心产物数量应与当前真实 contract 对齐为 `3 / 3`：

- `video_prompt_pack_cn`
- `video_prompt_review`
- `video_prompt_trace`

不再手写错误的 `2`。更稳妥的实现方式是从阶段定义或 output contract 派生，而不是在页面常量中重复维护。

## 10. 审批策略与快速通过语义

### 10.1 保留的部分

本轮不废弃 `approval_policy` 模型，也不移除项目级覆盖能力。它仍然是后端状态推进的真相源。

### 10.2 需要修正的部分

前端不再把审批策略仅仅作为一个“展示给用户看的下拉框”。它需要真实影响交互重量。

产品语义调整为：

- 核心阶段：默认要求明确人工确认
- 非核心阶段：应尽量减少额外确认成本

### 10.3 本轮落地范围

本轮设计只要求前端结构为后续“轻确认”留出清晰边界，不在本轮直接承诺所有 support 阶段自动推进。

具体要求：

- `Continue` 仍表示确认当前阶段并进入下一阶段
- `Continue & Run` 仍表示确认当前阶段、进入下一阶段并运行下一阶段
- support 阶段后续可在此结构上演进为“提交并继续”或“校验通过后单击快速通过”

本轮实现计划中应把“非核心阶段轻确认”拆成单独任务，不和 Copy 协议混成同一补丁。

## 11. UI 变化摘要

### 11.1 Artifact Inspector / Copy

- 默认展示 `pack` 级主复制块
- label 直接来自 `copy-block`
- 对于新协议产物，不再默认把 `segment` 列为主复制项
- `Preview` 视图展示剥离标签后的可读正文；`Raw` 视图保留原始标签文本，便于排查与复制原文

### 11.2 中间工作区

- 本阶段输入默认折叠
- 核心产物概览去掉重复 copy 摘要
- 修正 `video_prompts` 核心产物数量
- 审批策略区弱化为高级设置，不再抢占主视觉

## 12. 数据流与职责边界

### 12.1 Prompt / Output Contract

负责声明新产物应如何输出 `copy-block`。

### 12.2 Validator

负责保证：

- 存在必须的 `copy-block`
- pack 数量与顺序正确
- `id` 合法且连续

### 12.3 Display Model Builder

负责：

- 解析 `copy-block`
- 产出 UI 可消费的 `copyBlocks`
- 在异常时提供 fallback 与 warning

### 12.4 UI

只消费 `displayModel.copyBlocks`，不再自己猜正文结构。

## 13. 兼容性策略

### 13.1 旧产物

旧产物没有 `copy-block` 时：

- 保持现有 heading 解析
- 用户仍能继续复制

### 13.2 新产物

新产物优先依赖显式 `copy-block`，并应通过 validator 保证稳定性。

### 13.3 渐进迁移

迁移顺序：

1. `video_prompts`
2. `storyboard`
3. 其余核心产物若后续需要，再单独扩展

## 14. 测试与验收

### 14.1 自动化测试

- `copy-block` 正常解析
- 缺失闭合标签时回退
- `video_prompts` 多包解析为 `pack` 级复制块
- `storyboard` 多包解析为 `pack` 级复制块
- 旧 `Segment` 解析在无新标签时仍可工作
- `video_prompts` 核心产物数量来自真实 contract

### 14.2 UI 测试

- 本阶段输入默认折叠
- 缺失 required input 时自动展开
- 中间工作区不再显示 segment copy 摘要
- `Copy` 页展示 `pack` 级块

### 14.3 人工验收

- 真实 `storyboard` 多包项目：可逐包复制并喂生图模型
- 真实 `video_prompts` 多包项目：可逐包复制并喂视频模型
- 核心阶段与非核心阶段的推进体验比当前更轻，不增加额外理解成本

## 15. 风险与取舍

### 15.1 风险

- prompt、validator、display model 若不同步，会出现“正文有块但 UI 不认”或“UI 认了但校验未兜住”。
- 若标签清洗和原文保留边界实现错误，会出现 Preview 被协议标签污染，或 Raw 丢失真实原文。
- support 阶段的“快速通过”若与当前 `Continue` 语义混改，容易造成 silent redesign。

### 15.2 取舍

- 本轮优先解决复制边界与工作区噪音，不在同一补丁内重做所有阶段推进逻辑。
- 保留旧 heading fallback，以换取兼容性与较低迁移风险。
- `review` / `trace` 暂不引入块级 copy，以避免 scope 膨胀。

## 16. 实施切分建议

后续实施计划应至少拆成四段：

1. `copy-block` 协议与 `video_prompts` 产物接线
2. Display Model 解析与 fallback 升级
3. Studio Workspace UI 去噪与数量修正
4. support 阶段轻确认语义梳理与最小实现

不要把四段混成一个大补丁。
