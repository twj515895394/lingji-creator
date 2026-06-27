Status: ready-for-agent

# 片段理解 V2 Schema 升级、影视级中文提示词生成与多维度前端复制

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

重构片段级结构化理解的 schema，并全面升级 LLM 提示词模板以输出专门针对视频生成模型的高质量中文影视级 Prompt，同时在前端将这些字段充分展示并支持分维度复制。

端到端行为：

- **Schema V2 升级**：片段理解 JSON 文件升级为 version 2。新增 `videoPrompt` 子结构 `RemixChineseVideoPrompt`，将提示词拆分为人物主体、场景空间、动作表演、表演细节、机位运动、光线、色彩、情绪、节奏、台词、声音、风格、连续性、二创控制等 14 个中文维度字段，并保留 `fullChinesePrompt` 与 `negativePrompt`。
- **System Prompt 升级**：修改 `REMIX_SEGMENT_UNDERSTANDING_SYSTEM_PROMPT`，强制 LLM 进行全中文解析，拒绝泛化的猜测，并强制按固定 14 个维度拆解输出合法 JSON。
- **前端卡片展开态升级**：片段卡片支持完全展开，划分不同的 Inspector 侧边选项卡或清晰的区域，完整呈现场景、道具、镜头、因果冲突等所有新增字段，并展示 14 维度提示词分类面板。
- **分维度一键复制**：提供“复制完整中文 Prompt”按钮，并在 14 个影视维度（如主体、动作、镜头、光影等）旁边提供小型的“复制该项”图标，方便用户微调。
- **V1 兼容 fallback**：读取 version: 1 的老工程数据时，将 `videoPrompt.positivePrompt` 映射到 `fullChinesePrompt` fallback，缺失的 14 维字段显示为空或“旧版数据未生成该维度”。

## 14 维度固定字段

`RemixChineseVideoPrompt` 必须包含以下字段，字段名不得在各实现中自由发挥：

```ts
export interface RemixChineseVideoPrompt {
  language: 'zh-CN';
  fullChinesePrompt: string;

  subjectPrompt: string;
  scenePrompt: string;
  actionPrompt: string;
  performancePrompt: string;
  cameraPrompt: string;
  lightingPrompt: string;
  colorPrompt: string;
  emotionPrompt: string;
  rhythmPrompt: string;
  dialoguePrompt: string;
  soundPrompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  remixControlPrompt: string;

  negativePrompt: string;
  modelHints?: {
    seedance?: string;
    kling?: string;
    veo?: string;
    runway?: string;
  };
}
```

字段说明：

1. `subjectPrompt`：人物主体、外观、服装、状态。
2. `scenePrompt`：空间、年代、场景、环境、道具。
3. `actionPrompt`：动作流程、互动关系、动作强度。
4. `performancePrompt`：表情、眼神、肢体、表演细节。
5. `cameraPrompt`：景别、机位、镜头运动、焦段感、构图。
6. `lightingPrompt`：光源、明暗、阴影、室内外光感。
7. `colorPrompt`：色调、胶片感、饱和度、对比度。
8. `emotionPrompt`：情绪氛围、戏剧张力、人物心理。
9. `rhythmPrompt`：镜头节奏、停顿、剪辑感、运动速度。
10. `dialoguePrompt`：台词、口型、语气、字幕建议。
11. `soundPrompt`：环境声、音乐、音效、静默。
12. `stylePrompt`：影视类型、年代质感、写实程度。
13. `continuityPrompt`：与前后片段的连续性。
14. `remixControlPrompt`：保留什么、可替换什么、二创控制点。

## 实施约束

- 严格按照 PRD 数据结构契约实现 `RemixChineseVideoPrompt`。
- 修改 System Prompt 位于 `electron/sceneforge/remix/remix-segment-understanding-schema.ts` 或对应 AI prompt 配置文件中。
- 加载 version: 1 的老工程数据时，前端兼容转换不报错，将 positivePrompt 映射为完整 Prompt 的 fallback。
- 片段 LLM 不得输出英文 prompt；如果模型返回英文，normalize 层需要在 warnings 中标记，必要时保留原文但提示需要人工复核。
- Prompt 文本不能把文件名、标题或路径里的信息当作画面事实；不确定内容必须进入 `quality.warnings`。

## 验收标准

- [ ] 新生成的片段理解 JSON 文件版本为 2 且 `videoPrompt` 下包含全部 14 个维度的中文子属性。
- [ ] `fullChinesePrompt` 能整合主体、场景、动作、镜头、光影、情绪、台词和二创控制信息，可直接复制给视频生成模型。
- [ ] 卡片展开态布局优美，无内容堆叠或重叠，可分别折叠/展开各影视维度并可一键复制。
- [ ] 点击复制各子项时，能将正确的单维度提示词文本写入系统剪贴板。
- [ ] V1 版本老项目能在工作台中正常打开，缺失的 V2 属性展示为 null 或合理的 fallback 提示。
- [ ] LLM 返回缺字段时 normalize 层能补齐空字符串或合理 fallback，同时写入 warnings，不导致校验崩溃。

## 建议测试文件

- `tests/sceneforge-remix-understanding-v2.test.ts`
  - normalize V2 payload 时 14 维字段完整。
  - 缺字段、英文字段、空 prompt 能产生 warnings 或 fallback。
  - `videoPrompt.fullChinesePrompt` 可从多维字段合成 fallback。
- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
  - V1 positivePrompt 能映射成 fullChinesePrompt fallback。
  - V2 14 维字段能进入 workbench segment card。
- `tests/sceneforge-remix-understanding-panel.test.tsx`
  - 展开态能渲染 14 维 prompt 区块。
  - 复制完整 prompt 和复制单维字段行为正确。

## 被阻塞于

- `03-transcript-correction-stale-mechanism.md`
