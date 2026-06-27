# 原片理解阶段 V2 加强优化设计文档

> 所属模块：SceneForge Remix / 素材处理工作台 / 资产入库流程 / 原片理解阶段  
> 目标分支：`sceneforge2.0-remix`  
> 文档目的：梳理当前原片理解阶段存在的问题，明确后续功能加强方向、后端架构、前端交互、数据结构、LLM Prompt 设计、台词校对机制与实施计划。

---

## 1. 背景与当前状态

当前资产入库流程已经形成 6 个阶段：

1. 导入原片
2. 真实镜头切片
3. 关键帧提取
4. 原片理解
5. 人工标注
6. 保存入库

其中“原片理解”阶段的职责，是把原片中已经切分好的片段，进一步整理成可供二创复用、人工校对、提示词生成和资产入库使用的文本理解材料。

当前分支已经实现了以下基础链路：

- 音频提取：检查原片是否包含音轨，并在需要时提取独立音频文件。
- Whisper ASR：基于本地 Whisper 生成全片字幕，并按片段时间范围对齐到每个镜头片段。
- 片段级 LLM 分析：对每个片段生成结构化理解 JSON，包括动作、镜头、台词摘要、剧情功能、二创建议和 video prompt。
- 全片 rollup 汇总：在所有片段理解完成后，把每段的动作、台词摘要、剧情功能串联起来，生成全片故事内容与二创方向。
- 前端工作台展示：展示故事内容、已完成段数、每段动作、镜头、台词、剧情功能与正向 video prompt。

这说明当前方向是正确的，已经具备“片段理解 + 全片串联 + 工作台展示”的骨架。但从实机效果看，当前仍然偏 MVP，离“可入库、可校对、可复用、可二创”的素材理解能力还有明显差距。

---

## 2. 当前主要问题

### 2.1 全片故事内容容易退化成兜底文案

当前 `original_understanding.json` 的 `overall.summary` 会在 rollup LLM 成功时显示全片故事内容；但如果 LLM 未配置、调用失败或返回结构不符合预期，就会退化成类似：

```text
《xxx》共 26 段，已完成 26 段结构化理解。
```

这类文案只说明处理状态，不是视频内容理解。用户看到后会误以为“全片内容生成不对”。

当前需要解决的问题：

- 前端要区分“真实 AI 故事内容”和“系统兜底状态文案”。
- LLM 未配置时不应该展示“已生成故事内容”的假象。
- rollup 失败时应显示明确错误和重跑入口。
- rollup 输入需要更丰富，不能只依赖动作、台词摘要、剧情功能三项。

### 2.2 片段级理解内容太薄

当前 schema 实际上已经包含较多字段，例如 visual、camera、audio、story、remix、videoPrompt、quality 等。但前端卡片只展示：

- 动作
- 镜头
- 台词
- 剧情功能
- 正向 prompt

因此用户感知上会觉得“每段解析很薄”。

另外，当前片段级 prompt 主要输入：

- 片段 ID
- 标题
- 时间范围
- 边界类型
- 首/中/尾关键帧路径
- 分段台词
- 前后相邻片段标题

这里最大的问题是：**LLM 拿到的是关键帧路径，而不一定能读取本地图片内容**。如果后端使用的是纯文本 LLM 或未接入多模态能力，模型并不能真正看到画面，只能根据标题和台词猜测内容，导致动作、场景、角色、镜头语言都容易泛化。

### 2.3 ASR 台词不可编辑，错误会污染后续理解

当前台词由 Whisper 自动识别，并按片段写入 transcript JSON。前端展示时直接读取该 plainText。由于中文 ASR 难免出现错字、断句错误、人物称呼错误、语义误识别，如果没有人工修正层，后续所有步骤都会受到影响：

- 片段级剧情理解会错。
- 全片故事串联会错。
- dialoguePrompt 会错。
- 二创改写方向会错。
- 资产入库时的人工标注也会被污染。

因此，V2 必须把“台词校对”纳入原片理解阶段，而不是等到后续人工标注阶段再靠备注修补。

### 2.4 video prompt 语言和维度不符合实际使用需求

当前 videoPrompt 字段是：

```ts
videoPrompt: {
  positivePrompt: string;
  negativePrompt: string;
  motionPrompt: string;
  cameraPrompt: string;
  dialoguePrompt: string;
}
```

问题包括：

- 没有强制中文输出，容易生成英文 prompt。
- positivePrompt 过于笼统，不能覆盖影视级生成需要。
- 缺少人物、场景、动作、镜头、光线、情绪、节奏、声音、连续性、保留点、替换点等维度。
- 前端只展示 positivePrompt，用户无法理解也无法精细复用。

### 2.5 rollup 输入过少，无法生成高质量全片内容

当前全片 rollup 输入主要使用：

- `visual.mainAction`
- `audio.speechSummary`
- `story.plotFunction`

这不足以让 LLM 还原完整视频内容。一个好的全片故事串联至少需要：

- 每段时间范围
- 场景内容
- 角色与人物关系
- 关键动作
- 台词原文与修正版
- 情绪变化
- 冲突递进
- 前后因果
- 关键转折
- 镜头语言
- 可保留和可替换元素

### 2.6 前端状态表达不够清晰

当前前端容易把多种状态混在一起：

- LLM 未配置
- 片段理解未生成
- 片段理解生成成功但 rollup 失败
- rollup 使用兜底文案
- 切片/关键帧/台词变更后理解已过期
- 旧理解结果仍被展示

V2 需要明确状态模型，让用户知道当前看到的内容是“真实生成”“部分生成”“过期结果”“兜底结果”还是“失败结果”。

---

## 3. V2 设计目标

### 3.1 核心目标

原片理解 V2 的目标是把当前阶段升级为：

> 一个可基于多模态画面、ASR 台词、人工校对、片段结构化分析和全片故事串联，沉淀可复用二创资产的理解工作台。

具体目标：

1. 全片故事内容必须是真正的视频内容梳理，而不是处理状态文案。
2. 每个片段要形成可人工校对、可复用、可复制的影视级结构化理解。
3. 台词要支持人工修正，并且后续 LLM 理解优先使用人工修正版。
4. video prompt 必须支持中文输出，并按影视级维度拆解。
5. 原片理解结果要具备质量状态、置信度、待复核点和过期判断。
6. 用户可以单独重跑某段理解，也可以只重跑全片故事串联。
7. 前端展示要从“摘要列表”升级为“可审查、可编辑、可二创引用”的工作台。

### 3.2 非目标

V2 阶段暂不解决：

- 不直接实现最终视频生成。
- 不直接替代后续二创策略、分镜设计和 Seedance prompt 阶段。
- 不做复杂多人协作审批系统。
- 不在 V2 初期强制要求所有 LLM 都支持图片输入，但需要预留多模态能力扩展。

---

## 4. 总体架构设计

### 4.1 推荐链路

原片理解 V2 建议拆成以下子阶段：

```text
关键帧准备
   ↓
音频提取
   ↓
ASR 转写与片段对齐
   ↓
台词校对层（人工可编辑）
   ↓
关键帧视觉理解 / 多模态理解
   ↓
片段级结构化理解
   ↓
片段级中文影视 prompt 生成
   ↓
全片故事 Rollup 串联
   ↓
人工复核与局部重跑
   ↓
进入人工标注 / 入库
```

### 4.2 服务拆分建议

当前 `RemixUnderstandingService` 同时承担片段理解、写文件、汇总 rollup 等职责。V2 建议拆成更清晰的服务：

```ts
RemixUnderstandingOrchestrator
  - 负责编排：音频、ASR、台词、片段理解、rollup、进度上报

RemixTranscriptCorrectionService
  - 负责读取/保存人工修正台词
  - 负责生成 corrected transcript document
  - 负责标记 transcript correction stale 状态

RemixFrameVisionService
  - 负责关键帧 caption 或多模态视觉理解
  - 产出每个关键帧的视觉说明

RemixSegmentUnderstandingService
  - 负责单片段结构化理解
  - 输入：片段信息、关键帧视觉说明、台词原文/修正版、上下文
  - 输出：segment_understanding.v2.json

RemixVideoPromptService
  - 负责从片段理解生成中文影视级 video prompt
  - 可与 SegmentUnderstanding 合并，也可以独立服务化

RemixOriginalStoryRollupService
  - 负责全片故事串联
  - 支持 rollup only 重跑
  - 支持基于修正台词重跑

RemixUnderstandingWorkbenchService
  - 负责加载前端工作台需要的聚合快照
  - 不承担生成逻辑，只做读取与聚合
```

---

## 5. 数据结构设计

### 5.1 片段台词校对文档

新增每段台词校对产物：

```ts
export interface RemixSegmentTranscriptCorrectionDocument {
  schema: 'sceneforge-remix-segment-transcript-correction';
  version: 1;
  sourceAssetId: string;
  segmentId: string;
  generatedAt: string;
  updatedAt: string;

  inputRefs: {
    sourceTranscriptPath: string | null;
    segmentTranscriptPath: string | null;
  };

  transcript: {
    asrText: string;
    correctedText: string;
    effectiveText: string;
    correctionStatus: 'raw' | 'edited' | 'confirmed';
    language: 'zh-CN' | 'unknown';
    notes: string[];
  };

  dialogueLines: Array<{
    lineId: string;
    startMs?: number | null;
    endMs?: number | null;
    speaker?: string | null;
    asrText: string;
    correctedText?: string | null;
    effectiveText: string;
    tone?: string | null;
    confidence?: number | null;
  }>;

  quality: {
    needsHumanReview: boolean;
    warnings: string[];
  };
}
```

字段说明：

- `asrText`：Whisper 原始文本，不覆盖。
- `correctedText`：人工修正文本。
- `effectiveText`：后续 LLM 实际使用文本，优先 correctedText，否则 asrText。
- `correctionStatus`：用于前端显示校对状态。
- `dialogueLines`：为后续逐句台词、口型、字幕和角色区分预留。

### 5.2 关键帧视觉理解文档

为了避免纯文本 LLM 无法读取本地图片路径，建议增加关键帧视觉理解中间层：

```ts
export interface RemixSegmentFrameVisionDocument {
  schema: 'sceneforge-remix-segment-frame-vision';
  version: 1;
  sourceAssetId: string;
  segmentId: string;
  generatedAt: string;

  frames: Array<{
    frameId: string;
    frameRole: 'first' | 'middle' | 'last' | string;
    timestampMs: number;
    imagePath: string;
    caption: string;
    visibleCharacters: string[];
    visibleActions: string[];
    environment: string;
    props: string[];
    lighting: string;
    composition: string;
    confidence: number;
    warnings: string[];
  }>;

  segmentVisualSummary: string;
  quality: {
    needsHumanReview: boolean;
    warnings: string[];
  };
}
```

实现上有两种模式：

1. **多模态 LLM 模式**：直接把图片作为模型输入，生成每帧 caption。
2. **纯文本兼容模式**：如果没有多模态能力，则先保留 imagePath 和已有 semantic visualSummary，但标记 `needsHumanReview = true`。

### 5.3 片段理解 V2 文档

建议将当前 `sceneforge-remix-segment-understanding` 升级为 version 2：

```ts
export interface RemixSegmentUnderstandingV2Document {
  schema: 'sceneforge-remix-segment-understanding';
  version: 2;
  sourceAssetId: string;
  segmentId: string;
  title: string;
  timeRange: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  generatedAt: string;
  inputHash: string;

  inputRefs: {
    segmentTranscriptPath: string | null;
    transcriptCorrectionPath: string | null;
    frameVisionPath: string | null;
    keyframePaths: string[];
  };

  visual: {
    sceneSummary: string;
    mainAction: string;
    characters: string[];
    characterStates: string[];
    environmentDetails: string;
    props: string[];
    lighting: string;
    colorTone: string;
    visibleUncertainty: string[];
  };

  camera: {
    shotSize: string;
    angle: string;
    movement: string;
    composition: string;
    focus: string;
    lensFeeling: string;
    editingRole: string;
  };

  audio: {
    asrText: string;
    correctedText: string;
    effectiveDialogue: string;
    speechSummary: string;
    dialogue: Array<{
      speaker: string;
      text: string;
      tone: string;
      confidence?: number | null;
    }>;
    ambient: string;
    music: string;
    silenceOrPause: string;
  };

  story: {
    plotFunction: string;
    event: string;
    conflict: string;
    emotion: string;
    beforeAfterRelation: string;
    causalRelation: string;
    narrativeBeat: 'setup' | 'development' | 'turning_point' | 'climax' | 'resolution' | 'transition' | 'unknown';
  };

  remix: {
    keepElements: string[];
    replaceableElements: string[];
    rewriteIdeas: string[];
    reuseScenarios: string[];
    riskNotes: string[];
    mustReviewBeforeReuse: string[];
  };

  videoPrompt: RemixChineseVideoPrompt;

  quality: {
    confidence: number;
    needsHumanReview: boolean;
    missingInputs: string[];
    warnings: string[];
    staleReasons: string[];
  };
}
```

### 5.4 中文影视级 video prompt 结构

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

  modelHints: {
    seedance?: string;
    kling?: string;
    veo?: string;
    runway?: string;
  };
}
```

维度解释：

- `subjectPrompt`：人物主体、服装、状态、姿态。
- `scenePrompt`：空间、年代、环境、道具、背景细节。
- `actionPrompt`：动作流程、互动关系、动作强度。
- `performancePrompt`：表演状态、表情、眼神、肢体反应。
- `cameraPrompt`：景别、机位、运动、构图、焦点。
- `lightingPrompt`：光源、明暗、阴影、室内外光感。
- `colorPrompt`：色调、胶片感、饱和度、对比度。
- `emotionPrompt`：情绪氛围、戏剧张力、人物心理。
- `rhythmPrompt`：镜头节奏、停顿、剪辑感、运动速度。
- `dialoguePrompt`：台词、口型、语气、字幕处理建议。
- `soundPrompt`：环境声、音乐、音效、静默。
- `stylePrompt`：影视类型、年代质感、写实程度。
- `continuityPrompt`：与前后片段的连续性。
- `remixControlPrompt`：保留什么、可替换什么、二创控制点。
- `negativePrompt`：避免错误画面、错误人物、错误风格和不稳定生成。

### 5.5 全片理解 V2 文档

```ts
export interface RemixOriginalUnderstandingV2Document {
  schema: 'sceneforge-remix-original-understanding';
  version: 2;
  sourceAssetId: string;
  title: string;
  generatedAt: string;
  inputHash: string;

  inputRefs: {
    sourceManifestPath: string;
    segmentsIndexPath: string;
    sourceTranscriptPath: string | null;
    segmentAnalysisPath: string;
    transcriptCorrectionIndexPath: string | null;
  };

  overall: {
    logline: string;
    storyContent: string;
    storySummaryShort: string;
    eventChain: string[];
    characterMap: Array<{
      nameOrRole: string;
      description: string;
      relation?: string | null;
    }>;
    mainConflict: string;
    keyTurns: string[];
    emotionCurve: string;
    visualStyle: string;
    dialogueStyle: string;
    highValueSegmentIds: string[];
  };

  remixStrategy: {
    keepMust: string[];
    canReplace: string[];
    rewriteDirections: Array<{
      title: string;
      idea: string;
      suitableStyle: string;
      requiredSegments: string[];
      risk: string;
    }>;
    suggestedTags: string[];
  };

  segmentRefs: Array<{
    segmentId: string;
    segmentIndex: number;
    title: string;
    understandingPath: string;
    transcriptCorrectionPath?: string | null;
    frameVisionPath?: string | null;
    plotFunction: string;
    mainAction: string;
    confidence: number | null;
    needsHumanReview: boolean;
  }>;

  quality: {
    segmentCount: number;
    understoodSegmentCount: number;
    rollupConfidence: number;
    avgSegmentConfidence: number | null;
    needsHumanReview: boolean;
    rollupFallbackUsed: boolean;
    warnings: string[];
    staleReasons: string[];
  };
}
```

关键变化：

- `summary` 改为更明确的 `storyContent`。
- 增加 `logline`、`eventChain`、`characterMap`、`keyTurns`。
- 增加 `remixStrategy`，用于后续自动预填人工标注。
- 增加 `rollupFallbackUsed`，前端可以明确知道是否使用了兜底文案。
- 增加 `staleReasons`，用于提示用户当前理解结果是否过期。

---

## 6. LLM Prompt 设计

### 6.1 片段理解 Prompt 原则

片段级 LLM 必须遵守：

1. 全部输出中文。
2. 不得把文件名、标题或路径里的文字当成画面事实。
3. 如果未提供图像 caption 或多模态视觉输入，必须降低 confidence，并在 warnings 中说明。
4. 台词以人工修正版为准；没有修正版时再使用 ASR 原文。
5. 画面看不清、人物身份不确定、台词含糊时，必须标记 needsHumanReview。
6. video prompt 必须按中文影视级维度输出。
7. 只返回合法 JSON，不输出 Markdown。

### 6.2 片段理解 System Prompt 草案

```text
你是专业影视分镜分析师、中文台词校对助手和 AI 视频生成提示词专家。

你会收到一个视频片段的时间范围、关键帧视觉说明、ASR 台词、人工修正台词、前后片段上下文等信息。
请基于这些信息生成单个片段的结构化理解 JSON。

要求：
1. 所有自然语言字段必须使用中文。
2. 只描述输入中能确定的内容，不得编造不可见人物身份、地点、剧情背景。
3. 台词优先使用人工修正版 correctedText；没有 correctedText 时才使用 ASR 原文。
4. 如果关键帧视觉说明不足，必须在 quality.warnings 中说明，并降低 confidence。
5. videoPrompt 必须生成中文影视级多维度提示词，包括人物、场景、动作、表演、镜头、光线、色彩、情绪、节奏、台词、声音、风格、连续性、二创控制和 negative prompt。
6. 输出必须是合法 JSON，不要包含前言、后记或 Markdown。
```

### 6.3 片段理解 User Prompt 输入结构

```text
片段基础信息：
- segmentId:
- title:
- timeRange:
- boundaryType:

关键帧视觉说明：
- first frame caption:
- middle frame caption:
- last frame caption:

台词信息：
- ASR 原文：
- 人工修正版：
- 实际采用台词：
- 台词校对状态：raw / edited / confirmed

前后上下文：
- 前一段摘要：
- 后一段摘要：

已有切片语义：
- visualSummary:
- shotType:
- motion:

请输出 RemixSegmentUnderstandingV2Document 对应 JSON。
```

### 6.4 全片 Rollup Prompt 原则

全片 rollup 必须遵守：

1. 不要按“片段 1、片段 2”机械罗列。
2. 要把事件因果、人物行动、冲突和情绪变化串联成完整内容。
3. 必须讲清楚“这个视频到底发生了什么”。
4. 如果部分片段置信度低或台词未校对，要在 quality.warnings 中说明。
5. 输出包括故事内容、事件链、角色关系、冲突、情绪曲线、二创方向。

### 6.5 全片 Rollup System Prompt 草案

```text
你是专业影视剧情解说、剪辑结构分析和二创策划专家。

你会收到一个视频按时间顺序排列的所有片段结构化理解数据。
请把这些片段串联成一个完整、连贯、通俗易懂的视频内容描述，并提炼事件链、人物关系、冲突、情绪曲线、关键转折和二创方向。

要求：
1. storyContent 要像给用户讲清楚整段视频内容，不要写成片段列表。
2. 不要遗漏核心人物行为、台词引发的因果关系和情绪变化。
3. 如果某些片段信息不足，不能编造，要在 warnings 中说明。
4. 二创方向要具体，说明适合保留什么、替换什么、可能风险是什么。
5. 全部使用中文。
6. 只返回合法 JSON。
```

---

## 7. 后端 API 与 IPC 设计

### 7.1 新增/调整 IPC 方法

建议在现有 Remix IPC 基础上增加：

```ts
getSegmentTranscriptCorrection(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId: string;
}): Promise<RemixSegmentTranscriptCorrectionDocument | null>

updateSegmentTranscriptCorrection(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId: string;
  correctedText: string;
  dialogueLines?: Array<...>;
  markConfirmed?: boolean;
}): Promise<RemixUnderstandingWorkbenchSnapshot>

runSegmentFrameVision(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId?: string;
}): Promise<RemixAssetProcessingSnapshot>

rerunSegmentUnderstanding(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId: string;
  useCorrectedTranscript?: boolean;
}): Promise<RemixAssetProcessingSnapshot>

rerunOriginalStoryRollup(input: {
  projectDir: string;
  sourceAssetId: string;
}): Promise<RemixAssetProcessingSnapshot>

validateUnderstandingFreshness(input: {
  projectDir: string;
  sourceAssetId: string;
}): Promise<RemixUnderstandingFreshnessReport>
```

### 7.2 Freshness 判断

理解结果需要对以下输入建立 hash：

- 片段时间范围
- 关键帧路径与时间戳
- 关键帧视觉 caption
- ASR 原文
- 人工修正台词
- prompt version
- model id / provider

当这些输入变化后，要标记：

```ts
staleReasons: Array<
  | 'segments_changed'
  | 'keyframes_changed'
  | 'transcript_changed'
  | 'transcript_correction_changed'
  | 'frame_vision_changed'
  | 'prompt_version_changed'
  | 'model_changed'
>
```

前端据此显示“当前理解结果已过期，需要重跑”。

### 7.3 Rollup Only 重跑

当前单段重跑会复用 `understandingService.run(... segmentIds: [segmentId])`，但全片 rollup 和片段生成耦合较重。V2 应拆出 rollup only：

```ts
class RemixOriginalStoryRollupService {
  async run(projectDir: string, sourceAssetId: string): Promise<RemixOriginalUnderstandingV2Document>;
}
```

触发场景：

- 用户编辑台词后，不想重跑所有片段，只想重新汇总故事。
- 用户只重跑了某一个片段，希望刷新全片故事。
- rollup 失败，但片段分析均成功。

---

## 8. 前端交互设计

### 8.1 原片理解阶段总体布局

建议原片理解阶段下半区由三部分组成：

```text
[操作栏]
生成/重跑原片理解 | 重跑全片故事 | 导出 Markdown | 已完成段数 | 状态标签

[全片故事总览]
完整视频内容 / 事件链 / 人物关系 / 冲突 / 情绪曲线 / 二创方向 / 质量提示

[片段理解列表]
每段缩略图 + 结构化字段 + 台词校对 + 中文 prompt + 重跑按钮
```

### 8.2 操作栏

操作栏建议包含：

- `生成原片理解`
- `重跑全片故事`
- `只重跑过期片段`
- `导出理解 Markdown`
- `已完成段数 x/y`
- `LLM 状态：已配置 / 未配置`
- `理解状态：已生成 / 部分生成 / 已过期 / Rollup 失败`

LLM 未配置时按钮不应简单失败，而应显示：

```text
未配置 LLM，无法生成原片理解。请先到设置中配置 AI 模型。
```

### 8.3 全片故事总览卡片

总览卡片建议展示：

- 一句话概括 `logline`
- 完整视频内容 `storyContent`
- 事件链 `eventChain`
- 人物与关系 `characterMap`
- 主要冲突 `mainConflict`
- 情绪曲线 `emotionCurve`
- 视觉风格 `visualStyle`
- 二创方向 `rewriteDirections`
- 待人工复核提示 `quality.warnings`

如果使用了兜底文案，必须显示明显状态：

```text
全片故事未成功生成，当前显示的是系统兜底信息。请检查 LLM 配置后重跑全片故事。
```

### 8.4 片段卡片

每个片段卡片建议分为折叠区：

#### 默认摘要态

- 中帧缩略图
- 片段编号和时间范围
- 画面一句话
- 主要动作
- 台词摘要
- 剧情功能
- 置信度
- 校对状态
- 是否需要人工复核

#### 展开态

- 画面内容
- 人物/主体
- 场景和道具
- 镜头语言
- 情绪和冲突
- 台词原文
- 台词修正版编辑框
- 保留点
- 替换点
- 风险点
- 中文影视级 prompt 分维度展示

#### 操作按钮

- 保存台词修正
- 标记台词已确认
- 重跑本段理解
- 重跑全片故事
- 复制完整中文 prompt
- 复制分维度 prompt

### 8.5 台词编辑 UX

台词编辑建议采用“三态”：

- `raw`：仅 ASR，未编辑。
- `edited`：用户改过，但未确认。
- `confirmed`：用户确认该台词可用于后续理解。

UI 提示：

```text
ASR 原文可能有误。修改后，本段理解和全片故事可以基于修正版重新生成。
```

保存台词后，系统应提示：

- 是否立即重跑本段理解？
- 是否稍后批量重跑？
- 是否只重跑全片故事？

### 8.6 中文 prompt 展示 UX

不要只展示一个大段 prompt。建议：

```text
[完整中文 prompt]
可一键复制，用于视频模型。

[分维度 prompt]
人物主体
场景环境
动作表演
镜头语言
光线色彩
情绪节奏
台词声音
风格质感
连续性控制
二创控制
Negative Prompt
```

这样既适合直接复制，也适合用户人工微调。

---

## 9. Markdown 导出设计

建议新增导出 `original_understanding_v2.md`，结构如下：

```md
# 原片理解报告

## 基础信息
- 标题
- 总时长
- 片段数
- 生成时间
- LLM 模型
- 台词校对状态

## 一句话概括
...

## 完整视频内容
...

## 事件链
1. ...
2. ...

## 人物与关系
- ...

## 情绪曲线
...

## 二创方向
### 方向 1
- 想法
- 保留点
- 替换点
- 风险

## 片段明细
### 01 · 00:00 - 00:10
- 画面：
- 动作：
- 镜头：
- 台词原文：
- 台词修正版：
- 剧情功能：
- 保留点：
- 替换点：
- 中文 prompt：
```

---

## 10. 兼容与迁移策略

### 10.1 保留 V1 读取能力

当前已有 `version: 1` 的 segment understanding 和 original understanding。V2 不能破坏旧项目读取。

建议：

- loader 支持 V1 和 V2。
- 如果读取到 V1，转换成前端统一 ViewModel。
- V1 缺失字段用 `null` 或明确的 fallback，不假装已生成。
- 新生成一律写 V2。

### 10.2 ViewModel 适配

前端不要直接依赖 JSON 文件原始结构，应通过 `RemixUnderstandingWorkbenchSnapshot` 统一适配：

```ts
interface RemixUnderstandingWorkbenchSnapshotV2 {
  ready: boolean;
  version: 1 | 2;
  isPlaceholder: boolean;
  isStale: boolean;
  staleReasons: string[];
  rollupFallbackUsed: boolean;
  errors: string[];
  overview: {
    logline: string | null;
    storyContent: string | null;
    eventChain: string[];
    characterMap: Array<...>;
    remixDirections: Array<...>;
    warnings: string[];
  };
  segments: RemixUnderstandingWorkbenchSegmentCardV2[];
}
```

### 10.3 旧字段兼容

旧字段映射：

| V1 字段 | V2 映射 |
| --- | --- |
| `overall.summary` | `overall.storyContent` |
| `overall.remixPotential` | `remixStrategy.rewriteDirections` 的简化形式 |
| `videoPrompt.positivePrompt` | `videoPrompt.fullChinesePrompt` 的 fallback |
| `audio.speechSummary` | `audio.speechSummary` |
| `transcript.plainText` | `audio.asrText` |

---

## 11. 实施计划

### Phase 1：状态与兜底修复

目标：解决“故事内容显示不对”和“LLM 未配置仍像生成成功”的问题。

任务：

- 前端显示 LLM 配置状态。
- rollup fallback 增加 `rollupFallbackUsed`。
- workbench 明确展示 rollup 失败、LLM 未配置、占位结果。
- 增加“重跑全片故事”按钮。
- 修改故事内容卡片，不再把处理状态文案当作内容展示。

验收：

- 未配置 LLM 时，用户能看到明确提示。
- rollup 失败时，前端显示失败状态和重跑入口。
- 不再出现“共 26 段，已完成 26 段”被误认为故事内容的情况。

### Phase 2：台词校对层

目标：支持用户修正 ASR 台词，并让后续理解使用修正版。

任务：

- 新增 transcript correction JSON。
- 新增读取/保存台词修正 IPC。
- 前端片段卡片支持台词编辑、保存、确认状态。
- `buildSegmentUserPrompt` 优先读取 correctedText。
- 修改 inputHash，将 correctedText 纳入新鲜度判断。

验收：

- 用户能编辑任意片段台词。
- 保存后片段显示 edited/confirmed 状态。
- 重跑本段理解时使用修正版台词。
- 修改台词后，相关片段和 rollup 标记过期。

### Phase 3：中文影视级 prompt V2

目标：把 video prompt 从英文/单段式升级为中文多维度结构。

任务：

- 升级 segment understanding schema version 2。
- 修改 LLM system prompt，强制中文输出。
- 增加 `RemixChineseVideoPrompt`。
- 前端展示完整中文 prompt 和分维度 prompt。
- 复制按钮支持复制完整 prompt 或指定维度。

验收：

- 新生成 prompt 全部中文。
- 每段至少包含人物、场景、动作、镜头、光线、情绪、节奏、台词、声音、风格、negative prompt。
- 前端可以分维度查看和复制。

### Phase 4：关键帧视觉理解 / 多模态接入

目标：减少模型看不到画面导致的猜测。

任务：

- 新增 frame vision service。
- 支持多模态模型读取关键帧图片。
- 不支持多模态时，使用已有 semantic summary fallback 并标记 warning。
- 片段理解 prompt 引入关键帧 caption。

验收：

- 每段有 first/middle/last frame caption。
- 片段理解能基于视觉 caption 生成更准确的画面描述。
- 无多模态能力时不会假装看过图片。

### Phase 5：全片 Rollup V2 服务化

目标：生成真正完整的视频内容、事件链、人物关系和二创策略。

任务：

- 新增 `RemixOriginalStoryRollupService`。
- rollup 输入升级为完整 segment understanding V2 数据。
- 输出 `RemixOriginalUnderstandingV2Document`。
- 支持 rollup only 重跑。
- 前端总览卡片升级。

验收：

- 故事内容能连贯讲清楚整段视频。
- 事件链、人物关系、冲突、情绪曲线可读。
- 二创方向具体，包含保留点、替换点和风险。

### Phase 6：测试与回归

任务：

- schema normalize 测试。
- 台词修正保存/读取测试。
- inputHash stale 测试。
- LLM mock 测试。
- V1/V2 loader 兼容测试。
- workbench snapshot 测试。
- 前端组件基础渲染测试。

验收：

- `npm test` 通过。
- `npx tsc --noEmit` 无报错。
- 旧项目仍可打开。
- 新项目能生成 V2 理解结果。

---

## 12. 风险与注意事项

### 12.1 多模态模型能力差异

不同 LLM provider 对图片输入支持不一致。不能假设所有模型都能读取本地图片。需要在 settings 中明确标记：

```ts
capabilities: {
  structuredJson: boolean;
  visionInput: boolean;
  localFileImageInput: boolean;
}
```

### 12.2 成本和耗时

如果每段都做多模态关键帧理解，再做片段理解和 rollup，耗时会明显增加。建议：

- 支持并发控制。
- 支持只重跑过期片段。
- 支持只重跑 rollup。
- 支持低成本模式：不做 frame vision，只用 ASR + 现有关键帧 metadata。

### 12.3 台词编辑后的依赖刷新

台词修改后，不能自动静默重跑所有内容，否则用户成本不可控。建议采用明确提示：

- “台词已保存，本段理解已过期。”
- “是否现在重跑本段理解？”
- “是否重新汇总全片故事？”

### 12.4 不要过度编造

影视理解容易受标题和台词误导。Prompt 和 quality 机制必须强调：

- 看不清就写不确定。
- 不知道人物身份就写“人物/男子/女子/路人”等中性称呼。
- 不要把片名、文件名、用户备注当作画面事实。

---

## 13. 推荐优先级

| 优先级 | 模块 | 说明 |
| --- | --- | --- |
| P0 | LLM 配置状态与 fallback 展示 | 先避免用户误解生成结果 |
| P0 | Rollup 失败状态与重跑入口 | 解决故事内容不对的直接问题 |
| P1 | 台词校对层 | 解决 ASR 错误污染后续理解 |
| P1 | 中文影视级 prompt | 解决 prompt 不可直接复用的问题 |
| P1 | 前端片段卡片展示升级 | 把已有字段展示出来，提升可用性 |
| P2 | Rollup 服务化 | 支持只重跑全片故事 |
| P2 | 多模态关键帧视觉理解 | 提升画面理解准确度 |
| P3 | 导出 Markdown 报告 | 方便归档、调试和资产复用 |

---

## 14. 最终目标形态

原片理解 V2 完成后，该阶段应该具备以下体验：

1. 用户点击“生成原片理解”。
2. 系统自动完成 ASR、关键帧视觉理解、片段结构化分析和全片故事串联。
3. 用户在顶部看到一段真正讲清楚视频内容的“完整故事内容”。
4. 用户可以看到事件链、人物关系、冲突、情绪曲线和二创方向。
5. 用户可以逐段检查画面、镜头、台词、保留点、替换点和风险点。
6. 用户可以修正 ASR 台词，并基于修正版重跑本段或全片故事。
7. 每段都有中文影视级 video prompt，可直接复制到视频生成模型，也可以分维度微调。
8. 系统明确提示哪些内容需要人工复核，哪些内容已经过期。
9. 最终产物可以作为后续人工标注、二创策略、分镜设计和视频生成提示词的可靠输入。

---

## 15. 建议下一步落地动作

建议下一任开发按以下顺序推进：

1. 先修状态表达：LLM 未配置、rollup fallback、失败重跑。
2. 新增台词校对 JSON 与前端编辑能力。
3. 升级 segment understanding prompt，强制中文与多维 prompt。
4. 扩展 workbench snapshot，让前端能展示更多后端字段。
5. 抽离 rollup service，支持单独重跑全片故事。
6. 再接入关键帧视觉 caption 或多模态输入。

这一顺序能最快解决当前截图中暴露的问题，同时不破坏现有资产处理主流程。
