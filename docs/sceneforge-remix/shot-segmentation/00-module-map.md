# 分镜切片模块地图

> 本目录承接主文档 `docs/sceneforge-remix/shot-segmentation-transnetv2-design.md`，用于拆分具体功能模块、依赖关系与实施边界。

---

## 1. 总体目标

SceneForge 2.0 Remix 的“真实镜头切片”不只是识别边界，而是生成一组可审校、可复用、可导出的分镜资产：

```text
Source Video
  → Shot Detection
  → SourceSegment[]
  → source_clip.mp4 per segment
  → keyframes
  → source understanding
  → Seedance 2.0 / 二创 / 素材库 / 导出包
```

核心原则：

1. 检测和视频裁切分离：检测负责边界，裁切负责产物。
2. 自动切片和人工校准同等重要：人工合并/拆分后必须重新生成对应视频片段。
3. TypeScript 负责业务编排，Python 只负责算法检测。
4. 每个 segment 的 `source_clip.mp4` 是一等产物，可直接用于外部视频编辑。
5. TransNetV2 高精模式要把“权重文件”和“模型结构代码”分开管理，不能只准备 `.pth`。

---

## 2. 功能模块拆分

| 模块 | 文档 | 主要职责 | 依赖 | 首期优先级 |
|---|---|---|---|---|
| 检测 Worker | `01-detection-worker-design.md` | PySceneDetect / TransNetV2 检测，输出 scenes/boundaries JSON | Python、PySceneDetect、torch、ffmpeg | P0 |
| 分镜视频片段产物 | `02-segment-clip-artifacts-design.md` | 根据 SourceSegment.timeRange 生成 `source_clip.mp4`，支持导出 | FFmpeg、artifact paths | P0 |
| TS 后端整合 | `03-backend-integration-design.md` | RemixSegmentationService 调用检测、生成 segments、触发 clip 生成、写 diagnostics | Remix store、IPC | P0 |
| 前端 UI | `04-frontend-ui-design.md` | 展示检测模式、片段状态、打开/导出片段入口、错误提示 | React、Remix API client | P1 |
| 实施计划 | `05-implementation-plan.md` | 分阶段任务、验收标准、测试计划 | 全模块 | P0 |
| 模型文件与目录 | `06-model-assets-and-directory-design.md` | TransNetV2 权重、模型代码、HF 来源、环境变量、打包策略 | `.pth`、模型结构代码、torch、Git LFS | P0 |

---

## 3. 推荐落地顺序

### Phase 1：最小真实闭环

目标：快速模式真实可用，并生成真实视频片段。

```text
PySceneDetect fast detection
  → SourceSegment[]
  → SegmentClipService 生成 source_clip.mp4
  → 时间轴/表格显示
  → 人工合并/拆分后重新生成片段
```

完成后，即使高精模式未接入，用户也能拿到可用于 Seedance 2.0 的分镜视频片段。

### Phase 2：TransNetV2 高精模式

```text
准备 TransNetV2 .pth 权重 + 匹配的 PyTorch 模型结构代码
  → model resolver 解析模型路径和 vendor 代码路径
  → TransNetV2 accurate detection
  → predictions 后处理
  → fallback 到 fast
  → diagnostics 显示模型、耗时、fallback 原因
```

### Phase 3：片段导出与前端体验

```text
打开当前片段
打开片段文件夹
导出全部分镜片段
导出 segment_manifest.json / clips_manifest.json
```

### Phase 4：真实关键帧抽取

当前关键帧服务仍有占位图逻辑，后续应改为 ffmpeg 抽真实帧。

### Phase 5：运行时与发布

```text
内测：用户配置 Python/模型路径
正式：内置 Python runtime + 模型权重 + 环境检测
```

---

## 4. 模块依赖关系

```text
RemixAssetProcessing.tsx
  ↓
runSourceSegmentation IPC
  ↓
RemixService.runSourceSegmentation
  ↓
RemixSegmentationService
  ├─ ShotDetectionRunner
  │   └─ Python Worker
  │       ├─ PySceneDetect AdaptiveDetector
  │       └─ TransNetV2
  │           ├─ resources/models/transnetv2/*.pth
  │           └─ resources/shot-detectors/vendor/transnetv2/*.py
  ├─ SegmentBuilder
  ├─ SegmentClipService
  │   └─ ffmpeg
  └─ RemixStore / ArtifactWriter
```

人工校准路径：

```text
RemixAssetProcessing.tsx
  ↓ updateSourceSegments IPC
RemixService.updateSourceSegments
  ↓
normalize manual segments
  ↓
SegmentClipService regenerate clips
  ↓
write manifests
```

---

## 5. 首期成功标准

P0 完成后应满足：

1. 选择快速模式运行切片，真实检测视频内容，而不是固定步长模拟。
2. 每个 `SourceSegment.sourceClipPath` 对应真实 `source_clip.mp4`。
3. 人工合并/拆分后，segment manifest 和 `source_clip.mp4` 同步更新。
4. 后端 diagnostics 能说明 detector、fallback、clip 生成状态和失败原因。
5. 生成的片段可以在本地播放器打开，并可作为 Seedance 2.0 输入素材。
6. 高精模式缺少 `.pth` 权重或模型结构代码时，能清晰 fallback 到 fast，并说明缺失项。
