# SceneForge 2.0 Remix 分镜切片与视频片段产物整合设计

> 主文档。本文定义 SceneForge 2.0 Remix 的分镜切片总体方案：快速模式使用 PySceneDetect AdaptiveDetector，高精模式使用 TransNetV2；Electron/TypeScript 负责编排、状态、IPC 与产物管理；Python Worker 负责真实分镜/换场检测；切片阶段不仅生成 `SourceSegment[]`，还必须保存可复用的分镜视频片段，用于 Seedance 2.0、人工二创、片段预览、素材库复用和后续视频编辑。

---

## 1. 核心结论

当前 Remix 资产处理工作台已经具备前端入口、IPC 契约、时间轴、人工合并/拆分、边界确认、最小镜头长度粒度和重跑保留人工校准等能力。真正缺失的是：

1. **真实分镜检测**：当前 `fast` / `accurate` 仍是规则模拟候选边界。
2. **真实分镜视频片段产物**：当前段落路径 `sourceClipPath` 已存在，但需要真正按 `timeRange` 裁切并保存视频片段，而不是只保存时间区间或复制源视频。
3. **检测、切片、产物、人工校准的一体化闭环**：自动检测后生成片段，人工调整后重新生成片段，下游可以直接使用这些片段。

最终目标不是“只识别镜头边界”，而是形成完整资产处理结果：

```text
源视频
  → 分镜/换场检测
  → SourceSegment[] 时间结构
  → 真实分镜视频片段 source_clip.mp4
  → 关键帧 first/middle/last
  → 原片理解与二创设计
  → Seedance 2.0 / 其他视频编辑链路复用
```

推荐架构：

```text
快速模式：PySceneDetect AdaptiveDetector
高精模式：TransNetV2
TS 主进程：业务编排、IPC、状态、SourceSegment、clip artifact 写入
Python Worker：视频检测算法、模型推理、返回 scenes/boundaries JSON
FFmpeg Clip Service：按 segment timeRange 生成真实 source_clip.mp4
```

---

## 2. 当前项目现状

### 2.1 已经具备的能力

前端 `RemixAssetProcessing.tsx` 已经提供：

- 快速模式 / 高精模式切换。
- 最小镜头长度：精细、均衡、较粗。
- 重跑时保留人工校准。
- 时间轴、视频预览、SegmentTable、人工合并、人工拆分、确认当前边界。
- diagnostics summary 展示入口。

IPC 已经提供：

```ts
runSourceSegmentation(input: RunSourceSegmentationInput): Promise<RemixAssetProcessingSnapshot>
```

后端输入已经包含：

```ts
mode?: RemixSegmentationMode;
preserveManualEdits?: boolean;
minShotDurationMs?: number;
```

因此第一阶段无需大改前端和 IPC 契约，主要改造集中在 Electron 主进程和 Python Worker。

### 2.2 当前核心缺口

当前 `RemixSegmentationService` 中的边界候选来自模拟逻辑：

```ts
buildCandidateBoundaries(inputProfile, mode)
```

当前 `writeSegmentArtifacts()` 的职责也需要升级。它已经写 segment manifest 和 index，但分镜视频片段必须改为真实裁切产物：

```text
sceneforge/remix/source-assets/{sourceAssetId}/source_segments/{segmentId}/source_clip.mp4
sceneforge/remix/source-assets/{sourceAssetId}/source_segments/{segmentId}/segment_manifest.json
sceneforge/remix/source-assets/{sourceAssetId}/source_segments/segment_manifest_index.json
```

`source_clip.mp4` 应成为下游可直接使用的真实片段，而不是占位文件。

---

## 3. `transnetv2Pro` 接入参考评估

参考项目：`https://github.com/antcloudsman/transnetv2Pro`

### 3.1 可以参考的部分

`transnetv2Pro` 的 CLI 链路有参考价值：

```text
输入视频
  → 校验视频
  → ffprobe 获取 fps / duration / width / height
  → ffmpeg 提取 48x27 RGB 帧
  → TransNetV2 推理
  → predictions 转 scenes
  → 可视化 / 缩略图 / 视频切割
```

可借鉴模块：

| 模块 | 可借鉴点 | 建议 |
|---|---|---|
| `app/models/transnetv2.py` | PyTorch 模型结构、输入格式、权重加载 | 参考，不直接复制；先核验授权 |
| `app/core/frame_extractor.py` | ffmpeg rawvideo 抽 `48x27 rgb24` 帧 | 可按本项目 Worker 重写 |
| `app/core/scene_predictor.py` | batch 推理、设备选择、OOM 降 batch | 可参考策略 |
| `app/core/scene_detector.py` | 动态阈值、平滑、短场景合并、转场分析 | 可参考思想，需简化 |
| `bin/segmentation_cli.py` | 单视频处理流程 | 可参考流程，不作为依赖入口 |
| 视频切割逻辑 | 将 scenes 产出为独立视频片段 | 思路可复用，但实现应放在 TS/FFmpeg Clip Service |

### 3.2 不建议整库接入

不建议 vendor 整个 `transnetv2Pro`，原因：

1. 依赖过重，包含 PyQt5、FastAPI、uvicorn、matplotlib 等；本项目已有 Electron/React UI。
2. FastAPI 部分目前更像任务壳/模拟流程，并非真实推理服务。
3. 输出形态偏“视频分割工具”，而本项目需要的是 Remix asset pipeline 里的结构化产物。
4. 授权信息需要核验，仓库 setup classifier 写 MIT，但需要确认根目录 license 与可复制条件。

推荐方式：参考其推理和后处理思路，独立实现本项目最小 Worker。

---

## 4. 总体架构

```text
Renderer / React
  RemixAssetProcessing.tsx
    - 模式选择 fast / accurate
    - 最小镜头长度 fine / balanced / coarse
    - preserveManualEdits
    - 运行切片 / 人工合并 / 人工拆分 / 确认边界
    - 查看分镜片段 / 打开片段文件夹 / 导出片段包（后续）

Preload
  window.electronAPI.sceneForgeRemix.runSourceSegmentation(input)
  window.electronAPI.sceneForgeRemix.updateSourceSegments(input)
  window.electronAPI.sceneForgeRemix.exportSourceSegmentClips(input)（后续新增）

Electron Main / TypeScript
  RemixService
  RemixSegmentationService
  ShotDetectionRunner
  SegmentClipService
  Artifact Writer

Python Worker
  detect_shots.py
  fast_pyscenedetect.py
  accurate_transnetv2.py

Runtime / Models
  ffmpeg / ffprobe
  Python runtime or user venv
  resources/models/transnetv2/transnetv2-pytorch-weights.pth
```

职责边界：

| 层 | 职责 | 不负责 |
|---|---|---|
| React UI | 参数选择、任务触发、结果审校、片段查看/导出入口 | 模型推理、ffmpeg 裁切 |
| IPC/preload | 安全暴露 API | 业务算法 |
| RemixSegmentationService | 读取资产、调用检测、构造 segments、触发 clip 生成、写入 manifest | torch/opencv 细节 |
| ShotDetectionRunner | spawn Python、传参、解析 JSON、fallback | 业务 segment 语义 |
| Python Worker | PySceneDetect / TransNetV2 检测，输出 JSON | 写 Remix manifest、裁切最终片段 |
| SegmentClipService | 根据 segment.timeRange 用 ffmpeg 生成 source_clip.mp4 | 识别分镜边界 |
| KeyframeService | 从真实 clip 或源视频抽 first/middle/last | 决定镜头边界 |

---

## 5. 数据与产物模型

### 5.1 SourceSegment 保持主结构

当前 `SourceSegment` 已包含：

```ts
id: string;
sourceAssetId: string;
index: number;
title: string;
boundaryType: RemixSegmentBoundaryType;
timeRange: { startMs; endMs; durationMs };
boundary?: RemixSegmentBoundaryDetails | null;
reviewStatus?: RemixSegmentReviewStatus | null;
sourceClipPath: string;
keyframes: SourceKeyframe[];
semantic?: RemixSegmentSemanticDetails | null;
```

`sourceClipPath` 应从“理论路径”升级为“真实片段产物路径”。第一阶段可以不新增字段，直接保证该路径对应的 `source_clip.mp4` 真实存在。

### 5.2 建议后续新增 clip artifact 元信息

第二阶段可增加：

```ts
export interface RemixSegmentClipArtifact {
  path: string;
  status: 'pending' | 'ready' | 'failed';
  generatedAt?: string | null;
  startMs: number;
  endMs: number;
  durationMs: number;
  clipMode: 'stream_copy' | 'reencode_accurate';
  codec?: string | null;
  fileSizeBytes?: number | null;
  error?: string | null;
}
```

并在 `SourceSegment` 中追加：

```ts
clipArtifact?: RemixSegmentClipArtifact | null;
```

第一阶段为了减少类型扩散，可先不加，使用 `mediaValidation` 验证 `sourceClipPath` 是否存在。

### 5.3 Segment 目录产物

每个 segment 目录建议最终包含：

```text
segment-001/
  source_clip.mp4              # 真实分镜片段，可直接给 Seedance / 编辑器使用
  segment_manifest.json        # segment 元信息
  first_frame.png              # 关键帧
  middle_frame.png             # 可选，长镜头才有
  last_frame.png               # 关键帧
  clip_metadata.json           # 可选，裁切模式、ffmpeg 参数、hash、大小、错误信息
```

全局 index：

```text
source_segments/
  segment_manifest_index.json
```

建议 index 后续包含：

```json
{
  "segmentIds": ["segment-001", "segment-002"],
  "generatedAt": "...",
  "clipCount": 2,
  "totalDurationMs": 12345
}
```

---

## 6. 快速模式：PySceneDetect AdaptiveDetector

快速模式用于普通素材快速粗切、低成本预览和 CPU 友好处理。

参数映射：

| 前端粒度 | minShotDurationMs | PySceneDetect min_scene_len |
|---|---:|---:|
| fine | 1000 | 1.0s |
| balanced | 默认 1800 | 1.8s |
| coarse | 3000 | 3.0s |

推荐默认：

```python
AdaptiveDetector(
    adaptive_threshold=3.0,
    min_scene_len=f"{min_scene_len_seconds}s",
    window_width=2,
    min_content_val=15.0,
)
```

输出不是模型概率，confidence 可先规则映射：

```text
基础 0.72
过短片段 0.62，需要 review
fallback 结果 0.55，需要 review
```

---

## 7. 高精模式：TransNetV2

高精模式用于复杂剪辑、短镜头密集场景、转场较多素材。

建议第一版使用 Python + PyTorch Worker：

```text
ffmpeg 提取 48x27 RGB 帧
  → TransNetV2 batch 推理
  → predictions
  → peak / threshold / smoothing 后处理
  → scenes + boundaries JSON
```

设备选择：

```python
mps if torch.backends.mps.is_available()
cuda if torch.cuda.is_available()
cpu fallback
```

阈值策略：

```text
默认自动阈值：clip(mean + std, 0.35, 0.65)
手动阈值：后续高级设置再开放
高置信短镜头：confidence >= 0.90 时即使低于 minShotDuration 也可保留，但标记 needs_review
```

fallback：

```text
accurate 失败
  → fast PySceneDetect
  → detector = hybrid_fallback
  → usedFallback = true
  → notes 写明缺模型、缺 torch、OOM 或 worker 失败原因
```

---

## 8. 分镜视频片段保存设计

### 8.1 为什么必须保存真实片段

Remix 二创的“镜头切片”不是纯分析功能。每个分镜片段会用于：

- 直接丢给 Seedance 2.0 做视频编辑或视频续写。
- 作为关键帧抽取和原片理解的局部上下文。
- 作为素材库中可复用的 segment asset。
- 供用户人工预览、导出、二次剪辑。
- 后续批量生成 prompt bundle 时作为引用素材。

因此 `source_clip.mp4` 是一等产物，切片阶段必须生成。

### 8.2 SegmentClipService

新增：

```text
electron/sceneforge/remix/segment-clips/segment-clip-service.ts
```

职责：

```text
输入：sourceVideoPath + SourceSegment[]
输出：每段 segment.sourceClipPath 对应的 source_clip.mp4
```

接口：

```ts
export interface GenerateSegmentClipsInput {
  projectDir: string;
  sourceVideoPath: string;
  sourceAssetId: string;
  segments: SourceSegment[];
  mode?: 'stream_copy' | 'reencode_accurate';
  overwrite?: boolean;
}

export interface SegmentClipGenerationResult {
  segmentId: string;
  clipPath: string;
  status: 'ready' | 'failed';
  durationMs: number;
  fileSizeBytes?: number | null;
  error?: string | null;
}
```

### 8.3 裁切模式

#### 模式 A：stream copy

```bash
ffmpeg -ss {start} -i source.mp4 -t {duration} -c copy -avoid_negative_ts make_zero source_clip.mp4
```

优点：快，不重新编码。  
缺点：不一定帧精确，可能受关键帧影响，首帧可能偏移。

适合：快速预览、大批量粗切。

#### 模式 B：reencode accurate

```bash
ffmpeg -ss {start} -i source.mp4 -t {duration} \
  -c:v libx264 -preset veryfast -crf 18 \
  -c:a aac -b:a 128k \
  -pix_fmt yuv420p -movflags +faststart \
  source_clip.mp4
```

优点：更接近帧精确，兼容性好，适合 Seedance / 外部平台。  
缺点：慢，占用 CPU，文件可能变大或有轻微画质损失。

推荐默认：

```text
fast 模式：stream_copy 优先，失败后 reencode_accurate
accurate 模式：reencode_accurate
用户导出正式片段包：reencode_accurate
```

实际第一版可以统一使用 `reencode_accurate`，保证片段可直接复用。

### 8.4 人工校准后的片段重生成

以下操作都会改变 segment 时间边界，因此必须重新生成片段：

- 自动重跑切片。
- 人工合并当前段与下一段。
- 在当前播放点拆分。
- 手工调整边界（未来）。

当前 `updateSourceSegments()` 已经会调用 `writeSegmentArtifacts()`，因此建议将 `writeSegmentArtifacts()` 拆分/升级为：

```ts
await writeSegmentManifests(...);
await segmentClipService.generateClips(...);
await writeSegmentManifestIndex(...);
```

为了第一版简单，可以每次重生成全部 segment clips。第二版再做增量：

```text
segmentId + startMs + endMs + sourceVideoPath hash 不变 → 跳过
否则重新生成
```

### 8.5 与关键帧提取的关系

关键帧可以从源视频按 timestamp 抽，也可以从 `source_clip.mp4` 抽。

推荐：

```text
first/middle/last timestamp 仍以源视频绝对时间记录
图片实际抽取可以使用源视频，避免 clip reencode 造成轻微时间偏差
source_clip.mp4 用于下游视频编辑/Seedance
```

后续也可为每个 clip 抽一套局部时间关键帧。

---

## 9. 前后端对接

### 9.1 第一阶段无需修改 runSourceSegmentation 输入

当前输入已足够：

```ts
mode?: RemixSegmentationMode;
preserveManualEdits?: boolean;
minShotDurationMs?: number;
```

后端内部在完成检测后直接生成 clips。

### 9.2 建议新增片段导出 IPC

第二阶段新增：

```ts
export interface ExportSourceSegmentClipsInput extends RemixSourceAssetRefInput {
  outputDir?: string | null;
  includeManifest?: boolean;
  includeKeyframes?: boolean;
  naming?: 'index_title' | 'index_time_range';
}

export interface ExportSourceSegmentClipsResult {
  outputDir: string;
  clipCount: number;
  manifestPath?: string | null;
}
```

IPC：

```text
sceneForgeRemix:exportSourceSegmentClips
sceneForgeRemix:regenerateSourceSegmentClips
sceneForgeRemix:openSourceSegmentClipFolder
```

### 9.3 前端 UI 调整建议

第一阶段：轻量调整即可。

- diagnostics 增加 detector / fallback / clip 生成状态。
- SegmentTable 每行可显示片段状态：`片段已生成` / `生成失败`。
- 当前段操作区增加“打开当前片段”或“在文件夹中显示”。

第二阶段：增加导出能力。

- 在切片步骤增加按钮：`导出全部分镜片段`。
- 支持导出 manifest：片段编号、时间段、标题、置信度、文件名。
- 可选“重新生成片段视频”。

不建议第一版新增大量高级参数，避免干扰主流程。

---

## 10. 打包与运行时

开发期：

```bash
python3 -m venv .venv-shot
source .venv-shot/bin/activate
pip install -r resources/shot-detectors/requirements-accurate.txt
LINGJI_SHOT_PYTHON=$(pwd)/.venv-shot/bin/python npm run dev
```

发布期分两步：

1. 内测版：允许用户配置 Python / 模型路径。
2. 正式版：内置 Python runtime + site-packages + TransNetV2 模型权重。

asar unpack 建议加入：

```text
resources/shot-detectors
resources/models
resources/python-runtime
```

FFmpeg 路径由 TS 解析后传给 Python 或 SegmentClipService：

```text
LINGJI_FFMPEG_PATH
LINGJI_FFPROBE_PATH
```

---

## 11. 模块拆分

基于本文，详细设计拆成以下模块文档：

| 文档 | 模块 | 重点 |
|---|---|---|
| `shot-segmentation/00-module-map.md` | 模块地图 | 功能拆分、依赖关系、实施顺序 |
| `shot-segmentation/01-detection-worker-design.md` | 检测 Worker | PySceneDetect / TransNetV2 / Python Runner / fallback |
| `shot-segmentation/02-segment-clip-artifacts-design.md` | 分镜视频片段产物 | ffmpeg 裁切、source_clip.mp4、导出、人工校准重生成 |
| `shot-segmentation/03-backend-integration-design.md` | TS 后端整合 | RemixSegmentationService、SourceSegment、diagnostics、IPC |
| `shot-segmentation/04-frontend-ui-design.md` | 前端 UI | 模式选择、片段状态、导出入口、错误提示 |
| `shot-segmentation/05-implementation-plan.md` | 实施计划 | 分阶段落地、验收标准、测试计划 |

---

## 12. 推荐实施顺序

```text
Phase 1：真实 fast 检测 + 真实 source_clip.mp4 生成
Phase 2：TransNetV2 accurate 检测 + accurate fallback
Phase 3：片段导出与打开文件夹 UI
Phase 4：真实关键帧抽取替换 1px 占位图
Phase 5：进度事件、调试 artifacts、内置 Python runtime
```

最小闭环应优先完成：

```text
快速模式真实检测
  + 生成 SourceSegment[]
  + 生成真实 source_clip.mp4
  + 前端能预览/人工调整
  + 人工调整后重新生成 clip
```

这样即使高精模式还在接入中，用户已经可以拿到可用的分镜视频片段，并用于 Seedance 2.0 或其他二创流程。
