# SceneForge Remix 原片理解 V2 PRD

## 问题陈述

作为视频剪辑创作者，在资产入库流程的“原片理解（第 4 阶段）”中，面临以下体验和质量痛点：
1. **故事内容退化**：由于未配置 LLM 或解析失败，全片故事极易退化成类似于 “《xxx》共 26 段，已完成 26 段” 的系统处理状态文案，无法给用户提供真正的视频剧情和二创解说，造成“生成不正确”的假象。
2. **片段理解薄弱**：当前在卡片中只展示了极其有限的文本，用户无法直观审阅和复用场景、角色、道具、光线调色和情绪冲突等后端已有字段。
3. **ASR 错误链污染**：本地 Whisper 自动生成的字幕难免存在错别字或断句错误，目前没有校对和修改入口。这些错误会持续向片段分析、全片 Rollup 以及后续的人工标注和入库流程传递，对内容质量造成连锁污染。
4. **视频提示词不契合需求**：原版 `videoPrompt` 生成杂乱，缺乏明确的影视级分维度生成（如人物主体、动作表演、镜头机位、光线色彩等），不利于创作者精细化复制或微调使用。
5. **LLM 画面盲区**：在纯文本 LLM 模式下，模型无法读取本地图片画面，动作和镜头语言完全依赖台词和标题猜测，导致分析内容极易泛化。
6. **状态表达模糊且缺乏局部重跑**：前端无法清晰区分“正常生成”、“兜底文案”、“部分过期”、“LLM 未配置”或“Rollup 失败”等复杂状态；且一旦台词修改或个别片段解析失败，用户只能重跑全片，成本和时间代价极高。

## 解决方案

升级“原片理解”阶段为一个**可进行台词校对、包含多维度中文影视提示词、支持关键帧视觉理解与局部按需重跑的专业资产理解工作台**。

主要包含：
1. **台词人工校对与联动机制**：允许用户在卡片上直接修改 ASR 台词，保存并标记为确认，随后重跑时能自动让片段 LLM 和全片 Rollup 使用校对后的台词。
2. **状态透明化与配置检查**：在前端明显区分 AI 故事和系统兜底文案。若未配置模型，提示配置引导；Rollup 失败则显示明确错误及一键重跑。
3. **中文影视级多维度提示词**：升级 Prompt 生成，强制输出包含人物主体、场景空间、动作表演、机位运动等 14 个维度的中文 video prompt，支持前端分维度展示和一键复制。
4. **引入关键帧视觉 Caption 模块**：抽取片段首中尾帧，通过多模态或文字辅助方式输出关键帧画面描述（Frame Vision Document），补充给片段分析 LLM 以降低推测泛化率。
5. **局部刷新与 Freshness 机制**：建立输入新鲜度检测。计算切片、关键帧、台词等 inputs 的 hash。台词修改后，标记片段和故事“已过期”。支持“仅重跑过期片段”和“只重跑全片故事（Rollup Only）”以节省 API 消耗。
6. **Markdown 一键导出**：支持将原片理解的完整报告（含 Logline、全片故事、事件链、人物图谱、二创方向及片段明细）一键导出为本地 Markdown，方便归档和分发。

## 用户故事

1. **作为**剪辑创作者，**我想要**在未配置 AI 模型时在工作台看到明确的配置引导，**以便**我能快速前往设置页面完成模型绑定，而不是面对没有反应的生成按钮。
2. **作为**剪辑创作者，**我想要**全片串联生成的是像“解说电影”般流畅、有逻辑因果的故事梗概（300字内），**以便**我可以一眼掌握视频的主题和脉络，而不是看到拼装的流水账或兜底状态。
3. **作为**剪辑创作者，**我想要**在全片串联（Rollup）遭遇超时或格式解析失败时，在总览区域看到明确的报错原因并可以通过“重跑全片故事”按钮修复，**以便**我可以快速重试而不用重置所有已分析片段。
4. **作为**剪辑创作者，**我想要**直接在片段卡片的台词栏进行修改并保存，**以便**我能人工修正 Whisper ASR 识别错误的错别字和专有名词。
5. **作为**剪辑创作者，**我想要**在修改完台词后，将对应的片段标记为“已编辑”或“已确认”状态，**以便**我直观知道哪几段台词已经人工核对过。
6. **作为**剪辑创作者，**我想要**片段和全片在台词修改后自动标记为“已过期（Stale）”，**以便**系统能精确提示哪些范围需要重新生成理解。
7. **作为**剪辑创作者，**我想要**重新生成某片段时，AI 模型能优先使用我人工修正后的台词作为输入，**以便**生成更准确的画面描述和二创提示词。
8. **作为**剪辑创作者，**我想要**点击展开卡片，能完整审阅片段的画面场景、人物、道具、镜头语言、前后因果、剧情功能以及可替换点和风险点，**以便**我全面把控素材信息。
9. **作为**剪辑创作者，**我想要**卡片输出人物主体、场景、动作、表演、镜头机位、光线、色彩等 14 个维度的中文 `videoPrompt`，**以便**更贴合当下主流国产 AI 视频生成模型的提示词接收格式。
10. **作为**剪辑创作者，**我想要**在前端一键复制完整的中文 prompt，或单独复制某一个特定维度的 prompt（如只复制“动作表演”或“机位运动”），**以便**我在文生视频模型或图生视频模型中精细化修改。
11. **作为**剪辑创作者，**我想要**让系统通过多模态模型抽取该片段关键帧的视觉说明，作为输入传给片段 LLM，**以便**AI 能在“看到”画面的基础上进行描述，避免由于纯文本分析造成的猜测泛化。
12. **作为**剪辑创作者，**我想要**支持一键导出包含 Logline、故事线、事件链、人物关系和分段明细的 Markdown 报告至本地项目目录，**以便**我能离线归档或将脚本发给他人复用。

## 实现决策

### 1. 升级与新增数据结构（JSON Schemas）
* **[NEW] 台词校对文档** (`RemixSegmentTranscriptCorrectionDocument` v1)：
  保存于磁盘 `{segmentId}.correction.json`，保存 `asrText`、`correctedText`（人工修改值）、`effectiveText`（最终值，优先使用 corrected）、`correctionStatus` (`raw` | `edited` | `confirmed`)。
* **[NEW] 关键帧视觉理解文档** (`RemixSegmentFrameVisionDocument` v1)：
  保存于磁盘 `{segmentId}.frame_vision.json`，保存首中尾关键帧的 `imagePath`、`caption`（多模态视觉提取）和 `confidence`。支持纯文本兼容模式（视觉 caption 为空）。
* **[MODIFY] 片段理解文档** (`RemixSegmentUnderstandingDocument` 升级至 v2)：
  * `version` 升级为 `2`。
  * `inputRefs` 补足 ASR 路径、校对路径、视觉理解路径。
  * `videoPrompt` 变更为中文多维度结构 `RemixChineseVideoPrompt`，包含人物主体、场景空间、动作表演、机位运动等 14 个中文子字段，加 negativePrompt 字段。
* **[MODIFY] 全片汇总文档** (`RemixOriginalUnderstandingDocument` 升级至 v2)：
  * `version` 升级为 `2`。
  * `overall` 改用 `storyContent` 代替原 `summary`，新增 `logline`、`eventChain`、`characterMap`、`rollupFallbackUsed`。
  * `quality` 增加 `rollupFallbackUsed`，以供前端区分是否为兜底状态。

### 2. 后端服务拆分与 IPC 契约
* 抽离 `RemixOriginalStoryRollupService` 独立服务，只依赖已有的各片段理解 JSON 进行串联，支持 Rollup Only 触发。
* 引入 `RemixTranscriptCorrectionService`，处理校对台词的读写保存。
* 引入 `RemixFrameVisionService`，处理多模态或单帧 caption 获取逻辑。
* 注册并暴露以下安全通道 IPC 方法：
  * `getSegmentTranscriptCorrection`：获取某片段的台词校对文档。
  * `updateSegmentTranscriptCorrection`：更新并保存台词校对。
  * `runSegmentFrameVision`：运行关键帧画面视觉分析（支持并发控制）。
  * `rerunSegmentUnderstanding`：重跑单段理解（可指定是否使用修正台词）。
  * `rerunOriginalStoryRollup`：重跑全片故事汇总。
  * `validateUnderstandingFreshness`：验证当前原片理解的 inputHash 是否新鲜。

### 3. 新鲜度（Freshness）与 inputHash 机制
* 在片段级文档中维护 `inputHash`，其值由以下参数组合哈希所得：
  * 片段时间范围 `timeRange`
  * 关键帧时间戳与文件路径
  * 关键帧视觉 caption（`RemixSegmentFrameVisionDocument` 产物）
  * ASR 原始台词与人工修正台词
  * 模型 Provider 与提示词配置的版本号
* 在 `RemixOriginalStoryRollupService` 或 `validateUnderstandingFreshness` 中检测各依赖文件的 inputHash。一旦不匹配，更新 `staleReasons` 数组（例如 `['transcript_correction_changed']`），前端据此在界面高亮显示“已过期，需要重跑”。

## 测试决策

### 1. ViewModel 转换与迁移兼容性测试
* **行为预期**：当读取到 version: 1 的旧工程数据时，聚合服务 `RemixUnderstandingWorkbenchSnapshot` 能够稳健运行，并能正常地将旧 `summary` 映射为新 `storyContent`，把英文正向 prompt 映射为 fallback prompt，且不出现运行时 Null 报错。

### 2. 台词校对与新鲜度（Freshness）校验测试
* **行为预期**：
  * 用户调用 `updateSegmentTranscriptCorrection` 后，能落盘正确的 JSON，且 effectiveText 正确反映修正值。
  * 在修改台词前计算 `inputHash`，修改台词并保存后，`validateUnderstandingFreshness` 必须能返回新鲜度报告，指出 `staleReasons` 包含 `transcript_correction_changed`。

### 3. 提示词生成优先读取校对测试
* **行为预期**：当调用 `rerunSegmentUnderstanding` 时，底层 Prompt 生成器构建 of User Prompt 内容，必须包含修正后的台词，且系统能强制输出符合 v2 schema 的 14 维度 JSON。

### 4. 极端场景 Mock 测试
* **行为预期**：当 LLM 提供商报错或连接超时，Rollup 服务不能崩溃，需返回 `rollupFallbackUsed: true` 并将错误信息塞进 `errors` 数组，前端需正确提示，而不是呈现生成正常的假象。

## 超出范围

1. **AI 视频生成及本地渲染**：本功能仅负责生成可直接复制、校对的 video prompt 数据，不涉及将 prompt 输送给外部 AI 视频服务进行生成，也不包含渲染 MP4 产物。
2. **多用户协同和审核流**：原片理解主要面向单机创作者，不提供复杂的多人协作标记、批注审批流。
3. **分镜模板与 Seedance 结合**：影视级 V2 提示词仅用作资产存储，不参与后续的二创策略、分镜拼接以及 Seedance template 的编排。

## 进一步说明

* 所有生成的 `original_understanding.json`、`{segmentId}.analysis.json`、`{segmentId}.correction.json` 以及导出的报告 Markdown 均存储于本地用户项目目录中，保证数据隐私和本地优先原则。
