Status: ready-for-agent

# 全片故事 Rollup V2 服务化、多维度看板与原片理解 Markdown 导出

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

重塑全片故事串联（Rollup）生成机制，使其能深入归纳全片的事件因果、角色关系与二创策略，并在前端工作台提供丰富的可视化故事看板，同时支持一键导出原片理解 Markdown。

端到端行为：

- **Rollup 服务抽离与升级**：
  * 构建独立的 `RemixOriginalStoryRollupService`，只读取本地各片段理解 JSON 进行汇总。
  * 重新设计 Rollup V2 的 System Prompt：要求输出 Logline（一句话梗概）、短摘要（`storySummaryShort`，300 字内）、完整剧情解说（`storyContent`，建议 600-1200 字）、`eventChain`（事件链）、`characterMap`（主要人物图谱）以及 `remixStrategy`（含保留元素、替换建议、重构方向与风险）。
- **总览面板升级**：工作台顶部的“全片故事总览”卡片进行结构化拆分，以精美侧栏或排布优雅的 Bento 看板分别呈现场景 Logline、短摘要、完整剧情描述、事件链、角色图谱、二创建议等，不再是一大段文字。
- **Markdown 报告导出**：在界面操作栏增加“导出理解 Markdown”按钮，触发 `exportUnderstandingReport` IPC。该服务在项目目录下生成 `original_understanding_v2.md` 文件（对齐 PRD 与设计文档模板），方便用户归档和分发。
- **Rollup Only 重跑**：支持 `rerunOriginalStoryRollup` 单独触发，只读取已完成的片段理解 V2 数据，不重新请求每段分析 LLM。
- **质量状态与 fallback**：Rollup 失败时写入 `quality.rollupFallbackUsed: true` 与 `quality.errors`，前端看板显示明确失败状态，不假装生成成功。

## 依赖关系

- 必须依赖 `03-transcript-correction-stale-mechanism.md`，确保 Rollup 能识别 stale 状态。
- 必须依赖 `04-chinese-prompt-v2.md`，因为 Rollup V2 要读取片段理解 V2 schema 中的完整 story、audio、visual、remix 和中文 prompt 信息。
- 可选增强依赖 `05-keyframe-vision-multimodal.md`。如果 frame vision 已完成，Rollup 输入应包含 frame vision summary；如果未完成，Rollup 应基于片段理解 V2 fallback，不阻塞整体能力。

## 输出契约

`RemixOriginalUnderstandingV2Document` 中 Rollup 核心字段应包含：

```ts
interface RemixOriginalUnderstandingV2Document {
  schema: 'sceneforge-remix-original-understanding';
  version: 2;
  sourceAssetId: string;
  title: string;
  generatedAt: string;
  inputHash: string;

  overall: {
    logline: string;
    storySummaryShort: string;
    storyContent: string;
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
  };
}
```

## IPC 契约

```ts
rerunOriginalStoryRollup(input: {
  projectDir: string;
  sourceAssetId: string;
}): Promise<RemixAssetProcessingSnapshot>;

exportUnderstandingReport(input: {
  projectDir: string;
  sourceAssetId: string;
  format?: 'markdown';
}): Promise<{
  reportPath: string;
}>;
```

## Markdown 导出模板

导出的 `original_understanding_v2.md` 至少包含：

```md
# 原片理解报告

## 基础信息
- 标题：
- 片段数：
- 生成时间：
- LLM 模型：
- 台词校对状态：

## 一句话概括
...

## 短摘要
...

## 完整视频内容
...

## 事件链
1. ...

## 人物与关系
- ...

## 情绪曲线
...

## 二创方向
### 方向 1
- 想法：
- 保留点：
- 替换点：
- 风险：

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
- 中文 Prompt：
```

## 实施约束

- 全片汇总结构必须完全对齐 `RemixOriginalUnderstandingV2Document` (version 2)。
- 导出 Markdown 格式需严格符合设计文档第 9 节的模板约定。
- Rollup V2 不应重新生成片段理解；它只读取本地已存在的 segment understanding / transcript correction / frame vision 等文档。
- 如果部分片段缺失 V2 数据，可兼容读取 V1 fallback，但必须在 `quality.warnings` 中说明。
- `storyContent` 不得再写“共 x 段，已完成 x 段”这类处理状态文案。
- Rollup 输入必须包含每段的画面、动作、台词、剧情功能、冲突、情绪、前后关系、保留点、替换点和风险点；不能只输入 `mainAction + speechSummary + plotFunction` 三项。

## 验收标准

- [ ] 单独重跑 Rollup 汇总能快速执行完毕并输出包含 Logline、短摘要、完整故事、人物关系、二创策略的 V2 格式 JSON。
- [ ] `storySummaryShort` 控制在 300 字以内，`storyContent` 能更完整地讲清楚视频内容，建议 600-1200 字。
- [ ] 前端看板不仅展示完整故事，还能清晰呈现事件链和角色关系列表，UI 表现精美。
- [ ] 点击“导出 Markdown 报告”，用户项目目录下正确生成 `original_understanding_v2.md` 文件。
- [ ] Rollup 失败时写入 `quality.rollupFallbackUsed: true` 与 `quality.errors`，前端显示失败状态和重跑入口。
- [ ] V1 片段理解数据可以作为 fallback 被 Rollup 读取，但 warnings 中明确标记为旧版数据。

## 建议测试文件

- `tests/sceneforge-remix-original-rollup-v2.test.ts`
  - V2 segment documents 输入时生成完整 Rollup V2 JSON。
  - V1 segment documents 输入时生成 fallback Rollup，并写 warnings。
  - LLM 失败时写入 `quality.rollupFallbackUsed` 和 `quality.errors`。
- `tests/sceneforge-remix-understanding-report-export.test.ts`
  - `exportUnderstandingReport` 能生成 Markdown 文件。
  - Markdown 包含基础信息、完整视频内容、事件链、人物关系、二创方向和片段明细。
- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
  - workbench snapshot 能展示 logline、storySummaryShort、storyContent、eventChain、characterMap、remixStrategy。

## 被阻塞于

- `03-transcript-correction-stale-mechanism.md`
- `04-chinese-prompt-v2.md`
