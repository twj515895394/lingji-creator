Status: ready-for-agent

# 多模态关键帧视觉描述抽取与片段分析视觉 Prompt 融合

Type: AFK

## 父问题

- `.scratch/remix-understanding-v2/PRD.md`
- `docs/sceneforge-remix/original-understanding-v2-design.md`

## 要构建什么

引入关键帧多模态视觉说明模块，解决纯文本 LLM 无法感知视频画面导致镜头动作完全靠猜的“盲区痛点”。

端到端行为：

- **画面视觉描述服务**：实现 `RemixFrameVisionService` 并注册 `runSegmentFrameVision` IPC。通过多模态模型对片段的首帧、中帧、尾帧进行视觉内容分析，生成环境、人物动作、服装道具的文字描述，持久化落盘至 `{segmentId}.frame_vision.json`。
- **多模态与纯文本兼容降级**：
  * 在全局 AI 选项中加入 `capabilities.visionInput` 与 `capabilities.localFileImageInput` 参数。
  * 若模型不支持多模态，仅在 frame_vision 中保存 `imagePath`，文字描述置空，并在 `quality.warnings` 中写入 “当前模型不支持多模态视觉识别，使用文本上下文 fallback”，置 `needsHumanReview = true`。
- **视觉 Prompt 上下文融合**：在片段 LLM 分析触发时，读取对应的 `frame_vision.json`，并将三帧的关键画面描述作为 `keyframe captions` 直接拼接在 user prompt 中，让片段 LLM 获得画面先验，确保生成的动作和镜头描述符合事实。
- **缓存与新鲜度**：关键帧路径、时间戳、文件 hash、模型与 prompt version 未变化时，复用已有 frame vision 结果；变化后 stale 并允许重跑。

## 多模态输入适配策略

远程多模态模型通常不能直接读取本地 `imagePath`。本 issue 必须明确实现图片输入方式，不能只把本地路径拼进 prompt。

推荐策略：

1. 读取本地关键帧图片。
2. 按 provider 限制压缩图片尺寸和质量，例如最大边长 1024 或 1280，避免大图传输。
3. 根据模型能力选择输入方式：
   - 支持 data URL / base64 的 provider：构造 `data:image/jpeg;base64,...`。
   - 支持 file API 的 provider：先上传临时图片，再传 file reference。
   - 仅支持文本的 provider：进入降级模式。
4. 为每帧计算 image hash，并写入 frame vision 文档 inputHash。
5. 同一帧在 hash、模型、prompt version 不变时复用 caption。

能力字段建议：

```ts
capabilities: {
  structuredJson: boolean;
  visionInput: boolean;
  localFileImageInput: boolean;
}
```

## Schema 要求

`RemixSegmentFrameVisionDocument` 至少包含：

```ts
export interface RemixSegmentFrameVisionDocument {
  schema: 'sceneforge-remix-segment-frame-vision';
  version: 1;
  sourceAssetId: string;
  segmentId: string;
  generatedAt: string;
  inputHash: string;
  provider: string | null;
  model: string | null;

  frames: Array<{
    frameId: string;
    frameRole: 'first' | 'middle' | 'last' | string;
    timestampMs: number;
    imagePath: string;
    imageHash?: string | null;
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

## 实施约束

- `RemixSegmentFrameVisionDocument` schema 必须与 PRD 和设计文档对齐。
- 为了应对大图传输导致的 API 瓶颈与额度限制，对 `runSegmentFrameVision` 的调用需要支持并发控制。
- 必须实现纯文本 LLM 降级路径，且降级路径不能报错。
- 不支持 vision 的模型不得假装读取了图片。必须写 warning，且前端能展示该 warning。
- frame vision 应该可以单段运行，也可以对所有片段批量运行。
- frame vision 结果应纳入 #17 的 inputHash / stale 判断。

## 验收标准

- [ ] 多模态开启时，运行视觉描述能成功在本地生成并保存 `{segmentId}.frame_vision.json`，且包含首中尾三帧的描述。
- [ ] 纯文本 LLM 模式下，视觉服务能无缝降级，前端展示对应的降级 warnings 警告且不崩溃。
- [ ] 片段重跑时，发往片段 LLM 的 Prompt 中包含视觉 caption 信息。
- [ ] image hash、模型和 prompt version 未变化时，重复运行可以复用已有 caption。
- [ ] 关键帧变化后，Freshness 报告能返回 `frame_vision_changed` 或等价 stale reason。
- [ ] 并发控制生效，不会一次性把所有片段关键帧同时发送给多模态模型。

## 建议测试文件

- `tests/sceneforge-remix-frame-vision.test.ts`
  - 多模态 mock 成功时生成 frame vision JSON。
  - 不支持 vision 时生成降级文档和 warnings。
  - imageHash / model / promptVersion 不变时复用 caption。
- `tests/sceneforge-remix-understanding-v2.test.ts`
  - 片段 user prompt 能包含 keyframe captions。
  - 无 captions 时 prompt 明确写入视觉不足提示。
- `tests/sceneforge-remix-understanding-freshness.test.ts`
  - frame vision 输入变化时返回 stale reason。

## 被阻塞于

- `04-chinese-prompt-v2.md`
