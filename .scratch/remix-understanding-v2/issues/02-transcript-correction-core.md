Status: ready-for-agent

# 片段台词校对层持久化、IPC 契约与前端双向编辑

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

实现片段台词的本地人工校对与状态追踪。提供用户修正 Whisper ASR 转写字幕的交互入口，并为后续理解层和入库层提供干净、高可信度的有效台词产物。

端到端行为：

- **Schema 定义与存储**：定义台词校对 JSON schema（`RemixSegmentTranscriptCorrectionDocument`），在编辑保存时将数据持久化写入本地项目目录 `{segmentId}.correction.json` 中，包含 `asrText`（Whisper 原始文本）、`correctedText`（人工修改文本）、`effectiveText`（最终有效值，优先 corrected 否则 asr）和 `correctionStatus`（`raw` | `edited` | `confirmed`）。
- **IPC 契约建立**：在主进程与 preload 注册并实现 `getSegmentTranscriptCorrection` 与 `updateSegmentTranscriptCorrection` 通道。
- **前端编辑交互**：在工作台片段卡片的展开态中，台词展示区域可编辑。用户双击或点击编辑按钮后，文本变为输入框，保存时触发 `updateSegmentTranscriptCorrection`。卡片右侧渲染微缩校对状态徽标（显示 raw/edited/confirmed），以便识别核对进度。支持将台词一键标记为 `confirmed`。
- **保存后联动**：保存台词后不自动重跑昂贵 LLM，而是刷新 workbench snapshot，并将对应片段和全片 Rollup 标记为 stale。前端轻提示：“台词已保存，本段理解已过期。”并提供“重跑本段理解 / 稍后批量重跑”的后续动作入口。
- **有效台词优先级**：后续所有片段理解和 Rollup 输入均通过 `effectiveText` 读取台词。`correctedText` 非空时以人工修正版为准；否则回退 ASR 原文。

## 实施约束

- 严格遵循 PRD 与原设计文档 5.1 节定义的 `RemixSegmentTranscriptCorrectionDocument` 字段契约。
- 新增 `RemixTranscriptCorrectionService` 独立服务处理校对读写，隔离于已有字幕转写服务。
- 前端修改限制在片段卡片及其父面板组件中，不能影响其它阶段的字幕渲染。
- 保存校对台词时必须保留 ASR 原文，不得覆盖原始 Whisper transcript 文件。
- 保存校对台词后必须触发 workbench 数据刷新；stale 标记的最终计算可在 #17 中完成，但本 issue 需预留状态字段或刷新链路。

## 建议接口

```ts
getSegmentTranscriptCorrection(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId: string;
}): Promise<RemixSegmentTranscriptCorrectionDocument | null>;

updateSegmentTranscriptCorrection(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId: string;
  correctedText: string;
  markConfirmed?: boolean;
}): Promise<RemixUnderstandingWorkbenchSnapshot>;
```

## 验收标准

- [ ] 保存校对台词时，本地生成对应的 `{segmentId}.correction.json` 且字段完整。
- [ ] `effectiveText` 正确反映修正值：`correctedText` 非空时使用修正版，否则使用 ASR 原文。
- [ ] 片段卡片展开后支持台词的双向编辑，保存/标记确认后能触发 IPC，并立即在卡片徽标中渲染为 `edited` 或 `confirmed`。
- [ ] 首次加载或旧项目无校对文件时，片段的有效台词默认呈现 ASR 识别结果且徽标为 `raw`。
- [ ] 保存台词后不会自动重跑 LLM，但会刷新 workbench，并提示用户本段理解需要重跑。
- [ ] 原始 ASR transcript 文件不被覆盖。

## 建议测试文件

- `tests/sceneforge-remix-transcript-correction.test.ts`
  - 无校对文件时可从 segment transcript 生成 raw correction view。
  - 保存 correctedText 后落盘完整 correction JSON。
  - `markConfirmed` 能把状态置为 `confirmed`。
  - `effectiveText` 优先使用 correctedText。
- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
  - workbench snapshot 能展示 raw / edited / confirmed 状态。
  - 保存校对后 snapshot 刷新且对应片段暴露校对状态。

## 被阻塞于

- `01-status-fallback.md`
