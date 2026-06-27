# SceneForge Remix 原片理解 V2 PRD

> 正式设计文档：`docs/sceneforge-remix/original-understanding-v2-design.md`  
> 所属阶段：素材处理工作台 / 资产入库流程 / 第 4 阶段「原片理解」  
> 本 PRD 用于指导 `.scratch/remix-understanding-v2/issues/` 下的拆解任务落地。

## 问题陈述

作为视频剪辑创作者，在资产入库流程的“原片理解（第 4 阶段）”中，面临以下体验和质量痛点：

1. **故事内容退化**：由于未配置 LLM 或解析失败，全片故事极易退化成类似于 “《xxx》共 26 段，已完成 26 段” 的系统处理状态文案，无法给用户提供真正的视频剧情和二创解说，造成“生成不正确”的假象。
2. **片段理解薄弱**：当前在卡片中只展示了极其有限的文本，用户无法直观审阅和复用场景、角色、道具、光线调色和情绪冲突等后端已有字段。
3. **ASR 错误链污染**：本地 Whisper 自动生成的字幕难免存在错别字或断句错误，目前没有校对和修改入口。这些错误会持续向片段分析、全片 Rollup 以及后续的人工标注和入库流程传递，对内容质量造成连锁污染。
4. **视频提示词不契合需求**：原版 `videoPrompt` 生成杂乱，缺乏明确的影视级分维度生成（如人物主体、动作表演、镜头机位、光线色彩等），不利于创作者精细化复制或微调使用。
5. **LLM 画面盲区**：在纯文本 LLM 模式下，模型无法读取本地图片画面，动作和镜头语言完全依赖台词和标题猜测，导致分析内容极易泛化。
6. **状态表达模糊且缺乏局部重跑**：前端无法清晰区分“正常生成”、“兜底文案”、“部分过期”、“LLM 未配置”或“Rollup 失败”等复杂状态；且一旦台词修改或个别片段解析失败，用户只能重跑全片，成本和时间代价极高。
7. **Workbench 聚合层缺乏 V2 兼容契约**：V2 会同时引入新 schema、旧项目兼容、stale 状态、rollup 质量状态和多维 prompt，如果不统一 ViewModel，会导致前端各组件各自兜底、字段口径不一致。

## 解决方案

升级“原片理解”阶段为一个**可进行台词校对、包含多维度中文影视提示词、支持关键帧视觉理解与局部按需重跑的专业资产理解工作台**。

主要包含：

1. **台词人工校对与联动机制**：允许用户在卡片上直接修改 ASR 台词，保存并标记为确认，随后重跑时能自动让片段 LLM 和全片 Rollup 使用校对后的台词。
2. **状态透明化与配置检查**：在前端明显区分 AI 故事和系统兜底文案。若未配置模型，提示配置引导；Rollup 失败则显示明确错误及一键重跑。
3. **中文影视级多维度提示词**：升级 Prompt 生成，强制输出包含人物主体、场景空间、动作表演、机位运动等 14 个维度的中文 video prompt，支持前端分维度展示和一键复制。
4. **引入关键帧视觉 Caption 模块**：抽取片段首中尾帧，通过多模态或文字辅助方式输出关键帧画面描述（Frame Vision Document），补充给片段分析 LLM 以降低推测泛化率。
5. **局部刷新与 Freshness 机制**：建立输入新鲜度检测。计算切片、关键帧、台词等 inputs 的 hash。台词修改后，标记片段和故事“已过期”。支持“仅重跑过期片段”和“只重跑全片故事（Rollup Only）”以节省 API 消耗。
6. **Workbench Snapshot V2 聚合层**：统一适配 V1/V2 数据、rollup 兜底、stale 状态、台词校对状态和中文 prompt 字段，为前端提供稳定的渲染契约。
7. **Markdown 一键导出**：支持将原片理解的完整报告（含 Logline、全片故事、事件链、人物图谱、二创方向及片段明细）一键导出为本地 Markdown，方便归档和分发。

## 用户故事

1. **作为**剪辑创作者，**我想要**在未配置 AI 模型时在工作台看到明确的配置引导，**以便**我能快速前往设置页面完成模型绑定，而不是面对没有反应的生成按钮。
2. **作为**剪辑创作者，**我想要**全片串联生成的是像“解说电影”般流畅、有逻辑因果的故事内容，**以便**我可以一眼掌握视频的主题和脉络，而不是看到拼装的流水账或兜底状态。
3. **作为**剪辑创作者，**我想要**同时拥有 300 字以内的短摘要和更完整的全片内容描述，**以便**我既能快速扫读，也能获得完整视频内容。
4. **作为**剪辑创作者，**我想要**在全片串联（Rollup）遭遇超时或格式解析失败时，在总览区域看到明确的报错原因并可以通过“重跑全片故事”按钮修复，**以便**我可以快速重试而不用重置所有已分析片段。
5. **作为**剪辑创作者，**我想要**直接在片段卡片的台词栏进行修改并保存，**以便**我能人工修正 Whisper ASR 识别错误的错别字和专有名词。
6. **作为**剪辑创作者，**我想要**在修改完台词后，将对应的片段标记为“已编辑”或“已确认”状态，**以便**我直观知道哪几段台词已经人工核对过。
7. **作为**剪辑创作者，**我想要**片段和全片在台词修改后自动标记为“已过期（Stale）”，**以便**系统能精确提示哪些范围需要重新生成理解。
8. **作为**剪辑创作者，**我想要**重新生成某片段时，AI 模型能优先使用我人工修正后的台词作为输入，**以便**生成更准确的画面描述和二创提示词。
9. **作为**剪辑创作者，**我想要**点击展开卡片，能完整审阅片段的画面场景、人物、道具、镜头语言、前后因果、剧情功能以及可替换点和风险点，**以便**我全面把控素材信息。
10. **作为**剪辑创作者，**我想要**卡片输出人物主体、场景、动作、表演、镜头机位、光线、色彩等 14 个维度的中文 `videoPrompt`，**以便**更贴合当下主流国产 AI 视频生成模型的提示词接收格式。
11. **作为**剪辑创作者，**我想要**在前端一键复制完整的中文 prompt，或单独复制某一个特定维度的 prompt（如只复制“动作表演”或“机位运动”），**以便**我在文生视频模型或图生视频模型中精细化修改。
12. **作为**剪辑创作者，**我想要**让系统通过多模态模型抽取该片段关键帧的视觉说明，作为输入传给片段 LLM，**以便**AI 能在“看到”画面的基础上进行描述，避免由于纯文本分析造成的猜测泛化。
13. **作为**剪辑创作者，**我想要**旧项目和新项目在同一个工作台里稳定打开，**以便**已有资产不会因为 V2 schema 升级而无法继续使用。
14. **作为**剪辑创作者，**我想要**支持一键导出包含 Logline、故事线、事件链、人物关系和分段明细的 Markdown 报告至本地项目目录，**以便**我能离线归档或将脚本发给他人复用。

## 实现决策

### 1. 升级与新增数据结构（JSON Schemas）

* **[NEW] 台词校对文档** (`RemixSegmentTranscriptCorrectionDocument` v1)：
  保存于磁盘 `{segmentId}.correction.json`，保存 `asrText`、`correctedText`（人工修改值）、`effectiveText`（最终值，优先使用 corrected）、`correctionStatus` (`raw` | `edited` | `confirmed`)。
* **[NEW] 关键帧视觉理解文档** (`RemixSegmentFrameVisionDocument` v1)：
  保存于磁盘 `{segmentId}.frame_vision.json`，保存首中尾关键帧的 `imagePath`、`caption`（多模态视觉提取）和 `confidence`。支持纯文本兼容模式（视觉 caption 为空，并写入降级 warning）。
* **[MODIFY] 片段理解文档** (`RemixSegmentUnderstandingDocument` 升级至 v2)：
  * `version` 升级为 `2`。
  * `inputRefs` 补足 ASR 路径、校对路径、视觉理解路径。
  * `audio` 增加 `asrText`、`correctedText`、`effectiveDialogue`。
  * `videoPrompt` 变更为中文多维度结构 `RemixChineseVideoPrompt`，包含 14 个中文影视维度和 `negativePrompt` 字段。
* **[MODIFY] 全片汇总文档** (`RemixOriginalUnderstandingDocument` 升级至 v2)：
  * `version` 升级为 `2`。
  * `overall` 改用 `storyContent` 代替原 `summary`，新增 `logline`、`storySummaryShort`、`eventChain`、`characterMap`。
  * `quality` 增加 `rollupFallbackUsed`、`errors`、`warnings`、`staleReasons`，以供前端区分是否为兜底状态。

### 2. Rollup 状态字段统一约定

`rollupFallbackUsed` 与错误信息属于质量和执行状态，不属于故事内容本身。因此统一放入 `quality`：

```ts
quality: {
  segmentCount: number;
  understoodSegmentCount: number;
  rollupConfidence: number;
  avgSegmentConfidence: number | null;
  needsHumanReview: boolean;
  rollupFallbackUsed: boolean;
  errors: string[];
  warnings: string[];
  staleReasons: string[];
}
```

`overall` 只存放内容字段：

```ts
overall: {
  logline: string;
  storySummaryShort: string;
  storyContent: string;
  eventChain: string[];
  characterMap: Array<{ nameOrRole: string; description: string; relation?: string | null }>;
  mainConflict: string;
  keyTurns: string[];
  emotionCurve: string;
  visualStyle: string;
  dialogueStyle: string;
  highValueSegmentIds: string[];
}
```

### 3. 全片内容长度约定

为了同时满足“快速扫读”和“完整理解视频内容”，Rollup V2 必须输出两个层级：

* `storySummaryShort`：300 字以内，用于顶部简短摘要和资产列表扫读。
* `storyContent`：建议 600-1200 字，用于完整讲清楚整个视频内容、人物行为、事件因果和情绪变化。短视频内容较少时可以低于 600 字，但不得退化成处理状态说明。

### 4. 中文影视级 Prompt 14 维度约定

`RemixChineseVideoPrompt` 固定包含以下 14 个可复制维度：

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

同时保留：

```ts
fullChinesePrompt: string;
negativePrompt: string;
modelHints?: {
  seedance?: string;
  kling?: string;
  veo?: string;
  runway?: string;
};
```

### 5. 后端服务拆分与 IPC 契约

* 抽离 `RemixOriginalStoryRollupService` 独立服务，只依赖已有的各片段理解 JSON 进行串联，支持 Rollup Only 触发。
* 引入 `RemixTranscriptCorrectionService`，处理校对台词的读写保存。
* 引入 `RemixFrameVisionService`，处理多模态或单帧 caption 获取逻辑。
* 引入或扩展 `RemixUnderstandingWorkbenchService` / `loadRemixUnderstandingWorkbench`，统一聚合 V1/V2 数据为前端 snapshot。
* 注册并暴露以下安全通道 IPC 方法：
  * `getSegmentTranscriptCorrection`：获取某片段的台词校对文档。
  * `updateSegmentTranscriptCorrection`：更新并保存台词校对。
  * `runSegmentFrameVision`：运行关键帧画面视觉分析（支持并发控制）。
  * `rerunSegmentUnderstanding`：重跑单段理解（可指定是否使用修正台词）。
  * `rerunStaleSegmentUnderstandings`：只重跑当前已过期的片段理解。
  * `rerunOriginalStoryRollup`：重跑全片故事汇总。
  * `validateUnderstandingFreshness`：验证当前原片理解的 inputHash 是否新鲜。
  * `exportUnderstandingReport`：导出原片理解 Markdown 报告。

`exportUnderstandingReport` 契约建议：

```ts
exportUnderstandingReport(input: {
  projectDir: string;
  sourceAssetId: string;
  format?: 'markdown';
}): Promise<{
  reportPath: string;
}>;
```

`validateUnderstandingFreshness` 契约建议：

```ts
export interface RemixUnderstandingFreshnessReport {
  sourceAssetId: string;
  isStale: boolean;
  staleSegmentIds: string[];
  staleReasons: Array<
    | 'segments_changed'
    | 'keyframes_changed'
    | 'transcript_changed'
    | 'transcript_correction_changed'
    | 'frame_vision_changed'
    | 'prompt_version_changed'
    | 'model_changed'
  >;
  checkedAt: string;
}
```

### 6. 新鲜度（Freshness）与 inputHash 机制

* 在片段级文档中维护 `inputHash`，其值由以下参数组合哈希所得：
  * 片段时间范围 `timeRange`
  * 关键帧时间戳与文件路径
  * 关键帧视觉 caption（`RemixSegmentFrameVisionDocument` 产物）
  * ASR 原始台词与人工修正台词
  * 模型 Provider 与提示词配置的版本号
* 在 `RemixOriginalStoryRollupService` 或 `validateUnderstandingFreshness` 中检测各依赖文件的 inputHash。一旦不匹配，更新 `staleReasons` 数组（例如 `['transcript_correction_changed']`），前端据此在界面高亮显示“已过期，需要重跑”。
* stale 检查必须幂等，只报告状态，不自动触发重跑。

### 7. 多模态输入适配策略

远程多模态模型不能直接读取本地 `imagePath`。`RemixFrameVisionService` 必须显式处理图片输入：

* 优先将关键帧读取为受控尺寸的 base64 / data URL，或调用 provider-specific file API。
* 对图片进行尺寸限制和压缩，避免大图反复传输。
* 在 AI settings 中记录能力：

```ts
capabilities: {
  structuredJson: boolean;
  visionInput: boolean;
  localFileImageInput: boolean;
}
```

* 对 frame vision 结果做 inputHash 缓存。关键帧路径、时间戳、文件 hash、模型和 prompt version 未变化时复用 caption。
* 不支持多模态时，不得只把本地路径拼进 prompt 假装模型看到了画面；必须写入降级 warning，并将 `needsHumanReview` 置为 `true`。

### 8. Workbench Snapshot V2 统一契约

前端不直接读取原始 V1/V2 JSON，而是通过统一 snapshot 渲染：

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
    storySummaryShort: string | null;
    storyContent: string | null;
    eventChain: string[];
    characterMap: Array<{ nameOrRole: string; description: string; relation?: string | null }>;
    remixDirections: Array<{ title: string; idea: string; risk?: string }>;
    warnings: string[];
  };
  segments: RemixUnderstandingWorkbenchSegmentCardV2[];
}
```

V1 兼容映射：

| V1 字段 | V2 ViewModel 映射 |
| --- | --- |
| `overall.summary` | `overview.storyContent` fallback |
| `overall.remixPotential` | `overview.remixDirections` fallback |
| `videoPrompt.positivePrompt` | `videoPrompt.fullChinesePrompt` fallback |
| `audio.speechSummary` | `audio.speechSummary` |
| `transcript.plainText` | `audio.asrText` / `effectiveDialogue` fallback |

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

* **行为预期**：当 LLM 提供商报错或连接超时，Rollup 服务不能崩溃，需返回 `quality.rollupFallbackUsed: true` 并将错误信息塞进 `quality.errors` 数组，前端需正确提示，而不是呈现生成正常的假象。

### 5. 多模态降级测试

* **行为预期**：当模型不支持 `visionInput` 时，`RemixFrameVisionService` 不崩溃，不假装读取图片，生成带 warning 的 frame vision 文档，并在片段理解 quality 中体现 `needsHumanReview`。

### 6. 建议测试文件

* `tests/sceneforge-remix-understanding-v2.test.ts`
* `tests/sceneforge-remix-transcript-correction.test.ts`
* `tests/sceneforge-remix-understanding-freshness.test.ts`
* `tests/sceneforge-remix-frame-vision.test.ts`
* `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
* `tests/sceneforge-remix-original-rollup-v2.test.ts`

## 超出范围

1. **AI 视频生成及本地渲染**：本功能仅负责生成可直接复制、校对的 video prompt 数据，不涉及将 prompt 输送给外部 AI 视频服务进行生成，也不包含渲染 MP4 产物。
2. **多用户协同和审核流**：原片理解主要面向单机创作者，不提供复杂的多人协作标记、批注审批流。
3. **分镜模板与 Seedance 结合**：影视级 V2 提示词仅用作资产存储，不参与后续的二创策略、分镜拼接以及 Seedance template 的编排。

## 进一步说明

* 所有生成的 `original_understanding.json`、`{segmentId}.analysis.json`、`{segmentId}.correction.json`、`{segmentId}.frame_vision.json` 以及导出的报告 Markdown 均存储于本地用户项目目录中，保证数据隐私和本地优先原则。
* V2 首要目标是提升原片理解阶段的“可审查、可编辑、可复用”能力。所有字段和 IPC 设计都应优先服务这一目标，避免为了架构完整性引入过重实现。
