Status: ready-for-agent

# 片段台词校对层持久化、IPC 契约与前端双向编辑

Type: AFK

## 父问题

`.scratch/remix-understanding-v2/PRD.md`

## 要构建什么

实现片段台词的本地人工校对与状态追踪。提供用户修正 Whisper ASR 转写字幕的交互入口，并为后续理解层和入库层提供干净、高可信度的有效台词产物。

端到端行为：
- **Schema 定义与存储**：定义台词校对 JSON schema（`RemixSegmentTranscriptCorrectionDocument`），在编辑保存时将数据持久化写入本地项目目录 `{segmentId}.correction.json` 中，包含 `asrText`（Whisper 原始文本）、`correctedText`（人工修改文本）、`effectiveText`（最终有效值，优先 corrected 否则 asr）和 `correctionStatus`（`raw` | `edited` | `confirmed`）。
- **IPC 契约建立**：在主进程与 preload 注册并实现 `getSegmentTranscriptCorrection` 与 `updateSegmentTranscriptCorrection` 通道。
- **前端编辑交互**：在工作台片段卡片的展开态中，台词展示区域可编辑。用户双击或点击编辑按钮后，文本变为输入框，保存时触发 `updateSegmentTranscriptCorrection`。卡片右侧渲染微缩校对状态徽标（显示 raw/edited/confirmed），以便识别核对进度。支持将台词一键标记为 `confirmed`。

## 实施约束

- 严格遵循 PRD 与原设计文档 5.1 节定义的 `RemixSegmentTranscriptCorrectionDocument` 字段契约。
- 新增 `RemixTranscriptCorrectionService` 独立服务处理校对读写，隔离于已有字幕转写服务。
- 前端修改限制在片段卡片及其父面板组件中，不能影响其它阶段的字幕渲染。

## 验收标准

- [ ] 保存校对台词时，本地生成对应的 `{segmentId}.correction.json` 且字段完整、哈希正确。
- [ ] 片段卡片展开后支持台词的双向编辑，保存/标记确认后能触发 IPC，并立即在卡片徽标中渲染为 `edited` 或 `confirmed`。
- [ ] 首次加载或旧项目无校对文件时，片段的有效台词默认呈现 ASR 识别结果且徽标为 `raw`。

## 被阻塞于

- `01-status-fallback.md`
