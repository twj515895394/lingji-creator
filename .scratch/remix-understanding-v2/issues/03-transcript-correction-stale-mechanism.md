Status: ready-for-agent

# 原片理解新鲜度机制（Stale）、局部/过期重跑与校对台词 Prompt 联动

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

构建原片理解状态新鲜度（Freshness）校验，并在台词修改后自动标记相关片段与全片故事为“已过期”，引导用户局部重跑片段或重跑 Rollup，降低 AI 使用开销。

端到端行为：

- **inputHash 算法实现**：在后端对片段 inputs 进行哈希（含切片范围、关键帧路径与时间、ASR 原文、人工校对台词、模型配置与提示词版本），将哈希存入各片段分析 JSON 文件的 `inputHash` 属性。
- **新鲜度校验 IPC**：后端实现并暴露 `validateUnderstandingFreshness` IPC 方法。每次前端 workbench 加载或台词保存后触发，比较各片段当前哈希。若不匹配，在 Snapshot 中返回 `staleReasons`（包含 `['transcript_correction_changed']`）并置 `isStale: true`。
- **校对台词 Prompt 联动**：修改片段 LLM 分析的 Prompt 构建（`buildSegmentUserPrompt`），使分析模型在提取剧情和 videoPrompt 时，优先使用有效校对台词 `effectiveText` 替代 Whisper 原始 ASR，从而彻底阻断 ASR 错字对下游 AI 理解的污染。
- **前端过期展示与局部重跑**：
  * 若片段被标记为 Stale，卡片外框呈黄色虚线并悬浮显示“台词已修改，本段已过期”。
  * 卡片上提供“重跑本段理解”按钮。
  * 操作栏增加“只重跑过期片段”按钮。点击重跑按钮时触发 `rerunSegmentUnderstanding` 或 `rerunStaleSegmentUnderstandings` IPC，完成后将状态置为 Fresh。
- **Rollup stale 联动**：任一片段 stale 时，`original_understanding` 的 Rollup 也应视为 stale。重跑片段后仍需提示“全片故事需要重新汇总”，直到用户触发 `rerunOriginalStoryRollup`。

## 实施约束

- 校验及 Prompt 注入需要在 `RemixSegmentUnderstandingService` 或其拆分后的 V2 service 中处理。
- `rerunSegmentUnderstanding` 必须支持 `useCorrectedTranscript` 参数以指示 LLM 加载校对后文本。
- 新鲜度过期判断必须是幂等的，不引发死循环重跑。
- `validateUnderstandingFreshness` 只能报告状态，不应自动重跑 LLM。
- 如果某片段没有 existing analysis JSON，应返回 `missing_analysis` 或等价 warning，但不要把它误判为 transcript stale。

## 建议接口

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
    | 'missing_analysis'
  >;
  segmentReports: Array<{
    segmentId: string;
    isStale: boolean;
    staleReasons: string[];
    previousInputHash?: string | null;
    currentInputHash: string;
  }>;
  checkedAt: string;
}

validateUnderstandingFreshness(input: {
  projectDir: string;
  sourceAssetId: string;
}): Promise<RemixUnderstandingFreshnessReport>;

rerunStaleSegmentUnderstandings(input: {
  projectDir: string;
  sourceAssetId: string;
  useCorrectedTranscript?: boolean;
}): Promise<RemixAssetProcessingSnapshot>;
```

## 验收标准

- [ ] 保存某片段台词校对后，运行 Freshness 检验，其 `staleReasons` 数组返回 `transcript_correction_changed` 且 snapshot 的 `isStale` 为 `true`。
- [ ] 过期片段在工作台列表高亮显示，且“重跑本段理解”与“只重跑过期片段”按钮可点击。
- [ ] 触发重跑该片段后，传递给 LLM 的 user prompt 包含修正台词内容，生成的新 JSON 的 `inputHash` 与最新输入对齐，状态恢复为 Fresh（虚线外框消失）。
- [ ] 任一片段 stale 时，全片 Rollup 区域显示“全片故事需要重新汇总”。
- [ ] `validateUnderstandingFreshness` 连续调用多次结果稳定，不产生额外文件写入或自动任务。
- [ ] 缺少片段 analysis 文件时返回明确 warning，不和台词修改 stale 混淆。

## 建议测试文件

- `tests/sceneforge-remix-understanding-freshness.test.ts`
  - 修改 correctedText 后返回 `transcript_correction_changed`。
  - 未修改任何输入时连续校验保持 fresh。
  - prompt version 变化时返回 `prompt_version_changed`。
  - 缺少片段 analysis 文件时返回 `missing_analysis`。
- `tests/sceneforge-remix-understanding-v2.test.ts`
  - `buildSegmentUserPrompt` 优先注入 `effectiveText`。
  - `rerunSegmentUnderstanding` 能把最新 inputHash 写入新 analysis JSON。
- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
  - staleSegmentIds 和 rollup stale 状态能被 snapshot 暴露给前端。

## 被阻塞于

- `02-transcript-correction-core.md`
