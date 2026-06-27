Status: ready-for-agent

# 原片理解 Workbench Snapshot V2 聚合、V1/V2 兼容与前端统一渲染

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

为原片理解 V2 建立统一的 Workbench Snapshot 聚合层，集中处理 V1/V2 JSON 兼容、Rollup 质量状态、Stale 状态、台词校对状态、Frame Vision 警告、中文影视级 Prompt 字段和前端渲染所需 ViewModel。

该 issue 解决的问题是：V2 会横向引入多个新产物，如果每个前端组件直接读取原始 JSON，会导致字段口径不一致、fallback 分散、旧项目兼容困难、状态展示混乱。因此需要一个统一的 `RemixUnderstandingWorkbenchSnapshotV2` 作为前端唯一数据入口。

## 端到端行为

- **统一 Snapshot 契约**：后端 `loadRemixUnderstandingWorkbench` 或拆分后的 `RemixUnderstandingWorkbenchService` 返回统一 snapshot，前端不直接读原始 JSON。
- **V1/V2 兼容**：读取旧项目 version: 1 的 `original_understanding.json` 和 `{segmentId}.analysis.json` 时，稳定映射到 V2 ViewModel，不白屏、不空指针。
- **Rollup 状态聚合**：聚合 `quality.rollupFallbackUsed`、`quality.errors`、`quality.warnings`，驱动前端总览卡片的失败/兜底/正常状态。
- **Stale 状态聚合**：聚合 `validateUnderstandingFreshness` 结果，把 `isStale`、`staleReasons`、`staleSegmentIds` 暴露给前端。
- **台词校对状态聚合**：对每段输出 `transcriptCorrectionStatus`、`asrText`、`correctedText`、`effectiveText`，供片段卡片编辑区渲染。
- **中文 Prompt 聚合**：对 V2 输出完整 `RemixChineseVideoPrompt`；对 V1 输出 `fullChinesePrompt` fallback。
- **Frame Vision 状态聚合**：将关键帧视觉 caption、降级 warning、`needsHumanReview` 暴露给片段卡片。

## 建议 Snapshot 契约

```ts
export interface RemixUnderstandingWorkbenchSnapshotV2 {
  ready: boolean;
  version: 1 | 2;
  isPlaceholder: boolean;
  isStale: boolean;
  staleReasons: string[];
  staleSegmentIds: string[];
  rollupFallbackUsed: boolean;
  errors: string[];

  overview: {
    logline: string | null;
    storySummaryShort: string | null;
    storyContent: string | null;
    eventChain: string[];
    characterMap: Array<{
      nameOrRole: string;
      description: string;
      relation?: string | null;
    }>;
    mainConflict: string | null;
    emotionCurve: string | null;
    visualStyle: string | null;
    remixDirections: Array<{
      title: string;
      idea: string;
      suitableStyle?: string | null;
      risk?: string | null;
    }>;
    warnings: string[];
  };

  segments: Array<{
    segmentId: string;
    segmentIndex: number;
    title: string;
    timeRangeLabel: string;
    thumbnailPath: string | null;

    transcript: {
      asrText: string;
      correctedText: string;
      effectiveText: string;
      correctionStatus: 'raw' | 'edited' | 'confirmed';
    };

    visual: {
      sceneSummary: string;
      mainAction: string;
      characters: string[];
      environmentDetails: string;
      props: string[];
      lighting: string;
      colorTone: string;
    };

    camera: {
      shotSize: string;
      movement: string;
      angle?: string;
      composition?: string;
    };

    story: {
      plotFunction: string;
      event?: string;
      conflict?: string;
      emotion?: string;
      beforeAfterRelation?: string;
    };

    remix: {
      keepElements: string[];
      replaceableElements: string[];
      rewriteIdeas: string[];
      riskNotes: string[];
    };

    videoPrompt: {
      version: 1 | 2;
      fullChinesePrompt: string;
      dimensions: Array<{
        key: string;
        label: string;
        text: string;
      }>;
      negativePrompt: string;
    };

    frameVision: {
      available: boolean;
      segmentVisualSummary: string | null;
      warnings: string[];
    };

    quality: {
      confidence: number | null;
      needsHumanReview: boolean;
      warnings: string[];
    };

    isStale: boolean;
    staleReasons: string[];
    understandingPath: string;
    isPlaceholder: boolean;
  }>;

  annotationPrefill: {
    suggestedTags: string[];
    suggestedNote: string;
  } | null;
}
```

## V1/V2 兼容映射规则

| V1 字段 | V2 ViewModel 映射 |
| --- | --- |
| `original.overall.summary` | `overview.storyContent` fallback |
| `original.overall.remixPotential` | `overview.remixDirections` fallback |
| `original.overall.storyArc` | 可拆成 `overview.eventChain` fallback，或展示为旧版剧情链 |
| `original.overall.emotionCurve` | `overview.emotionCurve` |
| `segment.visual.mainAction` | `segment.visual.mainAction` |
| `segment.audio.speechSummary` | `segment.transcript.effectiveText` fallback 或台词摘要 |
| `segment.videoPrompt.positivePrompt` | `segment.videoPrompt.fullChinesePrompt` fallback |
| 缺失的 14 维 prompt | `dimensions` 为空数组，并显示“旧版数据未生成该维度” |
| 缺失的 correction 文件 | `correctionStatus: raw`，`effectiveText` 使用 ASR 或 speechSummary |

## 实施约束

- 前端组件只能依赖统一 snapshot，不应在多个组件中重复写 V1/V2 fallback 逻辑。
- Snapshot 聚合层要容错：缺少 original、segment analysis、correction、frame vision 时不崩溃，但要把 errors/warnings 暴露给前端。
- Annotation prefill 仍然要兼容旧逻辑，继续从 keepElements / replaceableElements / remixStrategy 中提取建议标签。
- 该 issue 不负责生成新 AI 内容，只负责读取、兼容、聚合和 ViewModel 输出。

## 验收标准

- [ ] V1 原片理解结果能正常打开，前端展示故事内容和 positivePrompt fallback，不白屏。
- [ ] V2 原片理解结果能完整暴露 overview、segments、transcript、videoPrompt、frameVision、quality、stale 状态。
- [ ] 缺少 correction 文件时，片段显示 raw 状态并使用 ASR 原文 fallback。
- [ ] 缺少 frame vision 文件时，片段不崩溃，并显示视觉理解未生成或降级 warning。
- [ ] Rollup fallback / errors 能在 snapshot 中统一暴露。
- [ ] 前端 `UnderstandingWorkbenchPanel` 不再直接依赖原始 V1/V2 JSON 字段。

## 建议测试文件

- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
  - V1 original + V1 segment analysis 映射为 V2 snapshot。
  - V2 original + V2 segment analysis 映射为完整 snapshot。
  - 缺少 correction / frame vision / original 文件时返回 warnings，不崩溃。
  - rollupFallbackUsed 和 staleSegmentIds 正确透出。
- `tests/sceneforge-remix-understanding-panel.test.tsx`
  - 前端基于 snapshot 渲染 V1 fallback 和 V2 完整字段。
  - 片段校对状态、stale 状态、prompt dimensions 可见。

## 被阻塞于

- `01-status-fallback.md`
- `02-transcript-correction-core.md`
- `03-transcript-correction-stale-mechanism.md`
- `04-chinese-prompt-v2.md`

## 可并行说明

本 issue 可以在 #16-#18 完成基础字段后开始，也可以由同一 agent 在实现前端聚合时一并处理。它不阻塞 #19 多模态能力，但 #19 完成后需要把 frame vision 字段接入 snapshot。
