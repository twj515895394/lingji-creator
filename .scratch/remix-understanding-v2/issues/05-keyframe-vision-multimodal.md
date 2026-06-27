Status: ready-for-agent

# 多模态关键帧视觉描述抽取与片段分析视觉 Prompt 融合

Type: AFK

## 父问题

`.scratch/remix-understanding-v2/PRD.md`

## 要构建什么

引入关键帧多模态视觉说明模块，解决纯文本 LLM 无法感知视频画面导致镜头动作完全靠猜的“盲区痛点”。

端到端行为：
- **画面视觉描述服务**：实现 `RemixFrameVisionService` 并注册 `runSegmentFrameVision` IPC。通过多模态模型对片段的首帧、中帧、尾帧进行视觉内容分析，生成环境、人物动作、服装道具的文字描述，持久化落盘至 `{segmentId}.frame_vision.json`。
- **多模态与纯文本兼容降级**：
  * 在全局 AI 选项中加入 `capabilities.visionInput` 参数。
  * 若模型不支持多模态，仅在 frame_vision 中保存 `imagePath`，文字描述置空，并在 `quality.warnings` 中写入 “当前模型不支持多模态视觉识别，使用文本上下文 fallback”，置 `needsHumanReview = true`。
- **视觉 Prompt 上下文融合**：在片段 LLM 分析触发时，读取对应的 `frame_vision.json`，并将三帧的关键画面描述作为 `keyframe captions` 直接拼接在 user prompt 中，让片段 LLM 获得画面先验，确保生成的动作和镜头描述符合事实。

## 实施约束

- `RemixSegmentFrameVisionDocument` schema 必须与 PRD 4.2 节对齐。
- 为了应对大图传输导致的 API 瓶颈与额度限制，对 `runSegmentFrameVision` 的调用需要支持并发控制。

## 验收标准

- [ ] 多模态开启时，运行视觉描述能成功在本地生成并保存 `{segmentId}.frame_vision.json`，且包含首中尾三帧的描述。
- [ ] 纯文本 LLM 模式下，视觉服务能无缝降级，前端展示对应的降级 warnings 警告且不崩溃。
- [ ] 片段重跑时，发往片段 LLM 的 Prompt 中包含视觉 caption 信息。

## 被阻塞于

- `04-chinese-prompt-v2.md`
