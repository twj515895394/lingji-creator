Status: ready-for-agent

# 片段理解 V2 Schema 升级、影视级中文提示词生成与多维度前端复制

Type: AFK

## 父问题

`.scratch/remix-understanding-v2/PRD.md`

## 要构建什么

重构片段级结构化理解的 schema，并全面升级 LLM 提示词模板以输出专门针对视频生成模型的高质量中文影视级 Prompt，同时在前端将这些字段充分展示并支持分维度复制。

端到端行为：
- **Schema V2 升级**：片段理解 JSON 文件升级为 version 2 (字段见 PRD 4.3 节)。新增 `videoPrompt` 子结构 `RemixChineseVideoPrompt`，将提示词拆分为人物主体、场景空间、动作表演、机位运动、光线色彩、情绪节奏、Negative Prompt 等 14 个中文维度字段。
- **System Prompt 升级**：修改 `REMIX_SEGMENT_UNDERSTANDING_SYSTEM_PROMPT`，强制 LLM 进行全中文解析，拒绝泛化的猜测，并强制按 14 个维度拆解输出合法 JSON。
- **前端卡片展开态升级**：片段卡片支持完全展开，划分不同的 Inspector 侧边选项卡或清晰的区域，完整呈现场景、道具、镜头、因果冲突等所有新增字段，并展示 14 维度提示词分类面板。
- **分维度一键复制**：提供“复制完整中文 Prompt”按钮，并在 14 个影视维度（如主体、动作、镜头、光影等）旁边提供小型的“复制该项”图标，方便用户微调。

## 实施约束

- 严格按照 PRD 数据结构契约实现 `Remix Chinese Video Prompt`。
- 修改 System Prompt 位于 [remix-segment-understanding-schema.ts](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/electron/sceneforge/remix/remix-segment-understanding-schema.ts) 或对应 AI prompt 配置文件中。
- 加载 version: 1 的老工程数据时，前端兼容转换不报错，将 positivePrompt 映射为完整 Prompt 的 fallback。

## 验收标准

- [ ] 新生成的片段理解 JSON 文件版本为 2 且 `videoPrompt` 下包含全部 14 个维度的中文子属性。
- [ ] 卡片展开态布局优美，无内容堆叠或重叠，可分别折叠/展开各影视维度并可一键复制。
- [ ] 点击复制各子项时，能将正确的单维度提示词文本写入系统剪贴板。
- [ ] V1 版本老项目能在工作台中正常打开，缺失的 V2 属性展示为 null 或合理的 fallback 提示。

## 被阻塞于

- `03-transcript-correction-stale-mechanism.md`
