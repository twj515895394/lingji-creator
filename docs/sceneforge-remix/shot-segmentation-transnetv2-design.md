# SceneForge 2.0 Remix 分镜切片检测整合设计

> 目标：把当前 Remix 二创工作台中的“真实镜头切片”从规则模拟升级为真实视频分镜/换场检测能力。快速模式使用 PySceneDetect AdaptiveDetector，高精模式使用 TransNetV2。项目主体仍保持 Electron + TypeScript 架构，模型与视频检测能力通过 Python Worker 接入。

---

## 1. 背景与结论

当前 `sceneforge2.0-remix` 分支已经完成 Remix 资产处理工作台的 UI、IPC、状态流和人工校准交互。前端已经提供：

- 快速模式 / 高精模式选择。
- 最小镜头长度粒度：精细、均衡、较粗。
- 重跑时是否保留人工校准。
- 时间轴、表格、视频预览、合并、拆分、确认边界等人工审校能力。

但当前后端 `RemixSegmentationService` 仍然使用模拟候选边界：

- `fast` 模式只是按固定步长生成 `adaptive` 候选点。
- `accurate` 模式只是额外加入 `accurate_refiner` 候选点。
- diagnostics 中也明确表达当前 accurate 没有接入独立模型 worker。

本设计的核心结论：

1. **快速模式接 PySceneDetect AdaptiveDetector**：轻量、成熟、适合 CPU 快速粗切。
2. **高精模式接 TransNetV2**：模型权重只有几十 MB，适合本地随包或本地模型目录接入。
3. **TS 不重写模型逻辑**：Electron 主进程负责业务流程、IPC、文件写入、状态管理；Python Worker 负责检测算法。
4. **不建议整库搬运 `transnetv2Pro`**：可参考它的 PyTorch 推理链路、帧提取方式、动态阈值后处理，但不直接引入 GUI、FastAPI、视频切割输出等重型模块。
5. **真实镜头边界与工程拆长镜头要分开记录**：TransNetV2 / PySceneDetect 检测真实剪辑点，`maxDuration` / `maxFrames` 产生的是下游模型限制导致的人工工程切分，不能混淆。

---

## 2. `transnetv2Pro` 接入参考评估

参考项目：`https://github.com/antcloudsman/transnetv2Pro`

### 2.1 可以参考的部分

`transnetv2Pro` 的 README 定位是“基于 TransNetV2 深度学习模型的视频场景自动分割工具”，并声明支持 GUI、CLI、批处理、REST API、可视化边界等能力。

它的 CLI 处理流程值得参考：

```text
输入视频
  → 校验视频
  → ffprobe 获取 fps / duration / width / height
  → ffmpeg 提取 48x27 RGB 帧
  → TransNetV2 推理
  → 根据预测分数生成 scenes
  → 可视化 / 缩略图 / 视频切割
```

其中，以下模块对本项目有参考价值：

| 模块 | 参考价值 | 是否建议直接复用 |
|---|---|---|
| `app/models/transnetv2.py` | PyTorch 版 TransNetV2 结构、输入格式、权重加载 | 谨慎参考，不建议直接复制，先核验 license |
| `app/core/frame_extractor.py` | 用 ffmpeg 输出 `48x27 rgb24 rawvideo` 的帧提取方式 | 可参考实现方式 |
| `app/core/scene_predictor.py` | batch 推理、自动设备选择、OOM 降 batch | 可参考改写 |
| `app/core/scene_detector.py` | 动态阈值、平滑、短场景合并、transition 分析 | 可参考思想，需简化和重测 |
| `bin/segmentation_cli.py` | CLI 参数组织、单视频处理流程 | 可参考流程，不建议直接接入 |

### 2.2 不建议直接复用的部分

1. **依赖过重**  
   `requirements.txt` 包含 PyQt5、pyqtgraph、FastAPI、uvicorn、matplotlib 等。对本项目来说，GUI 已经由 Electron/React 提供，REST API 也不是第一阶段必须能力。

2. **REST API 当前不适合作为真实服务参考**  
   `app/api/server.py` 里的 `process_video_task` 当前主要是模拟步骤和模拟 scenes，并没有真正调用 TransNetV2 推理链路。因此不能直接作为后端服务接入。

3. **输出形态不匹配**  
   `transnetv2Pro` 偏向“视频切割工具”，最终会生成 segments 视频文件、可视化图、缩略图。而本项目需要的是：

   ```text
   ShotDetectionResult JSON
     → SourceSegment[]
     → Remix source asset manifest
     → 前端时间轴/表格/关键帧流程
   ```

4. **授权信息需要谨慎核验**  
   仓库 `setup.py` classifier 写了 MIT License，但仓库根目录没有看到标准 `LICENSE` 文件。若要直接拷贝代码，必须先补齐授权核验。更稳妥的做法是：参考算法结构，独立实现 Worker；模型代码优先使用官方 TransNetV2 或明确授权的实现。

### 2.3 推荐借鉴方式

推荐做法不是 vendor 整个 `transnetv2Pro`，而是抽象为本项目自己的 Python Worker：

```text
resources/shot-detectors/detect_shots.py
resources/shot-detectors/fast_pyscenedetect.py
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/common_io.py
resources/models/transnetv2/...
```

只保留本项目需要的最小能力：

- 输入：视频路径、模式、最小镜头长度、阈值、fps/duration。
- 输出：JSON scenes / boundaries / metrics / diagnostics。
- 不做 GUI。
- 不启动常驻 REST API。
- 不直接切割视频文件。
- 不把日志写到 stdout，stdout 只返回 JSON。

---

## 3. 当前项目现状与改造点

### 3.1 当前架构

当前 Remix 流程：

```text
React 页面 RemixAssetProcessing.tsx
  ↓ getRemixApiClient()
preload.ts 暴露 window.electronAPI.sceneForgeRemix
  ↓ ipcRenderer.invoke('sceneForgeRemix:runSourceSegmentation')
electron/sceneforge/remix/remix-ipc.ts
  ↓ service.runSourceSegmentation(input)
RemixService.runSourceSegmentation()
  ↓ RemixSegmentationService.run(projectDir, sourceAssetId, options)
remix-segmentation-service.ts
  ↓ buildCandidateBoundaries()  当前模拟候选边界
  ↓ buildSegmentsFromCandidates()
  ↓ writeSegmentArtifacts()
  ↓ writeStoredSourceAsset()
```

第一阶段改造时，前端和 IPC 契约基本可以保持不变，核心改造集中在：

```text
electron/sceneforge/remix/remix-segmentation-service.ts
新增 electron/sceneforge/remix/shot-detection/*
新增 resources/shot-detectors/*
新增 resources/models/transnetv2/*
```

### 3.2 需要替换的当前逻辑

当前服务内有以下逻辑：

```ts
buildCandidateBoundaries(inputProfile, mode)
```

它应该被替换为：

```ts
await runShotDetector({
  projectDir,
  sourceAssetId,
  videoPath: document.sourceAsset.sourceVideoPath,
  mode,
  minShotDurationMs,
  durationMs: document.sourceAsset.videoMetadata.durationMs,
  fps: document.sourceAsset.videoMetadata.fps ?? 25,
  width: document.sourceAsset.videoMetadata.width,
  height: document.sourceAsset.videoMetadata.height,
})
```

然后统一进入：

```ts
buildSegmentsFromDetectionResult(...)
```

---

## 4. 总体架构设计

### 4.1 目标架构

```text
Renderer / React
  RemixAssetProcessing.tsx
    - 模式选择：fast / accurate
    - 粒度选择：fine / balanced / coarse
    - 人工校准保留：preserveManualEdits
    - 运行切片按钮

Preload
  window.electronAPI.sceneForgeRemix.runSourceSegmentation(input)

Electron Main / TS
  remix-ipc.ts
  remix-service.ts
  remix-segmentation-service.ts
  shot-detection/shot-detector-runner.ts
  shot-detection/shot-boundary-normalizer.ts

Python Worker
  detect_shots.py
  fast_pyscenedetect.py
  accurate_transnetv2.py

Models / Runtime
  resources/models/transnetv2/transnetv2-pytorch-weights.pth
  可选 resources/python-runtime/{platform}-{arch}/...
```

### 4.2 职责边界

| 层 | 职责 | 不负责 |
|---|---|---|
| React UI | 参数选择、任务触发、结果查看、人工校准 | 模型推理 |
| preload / IPC | 安全暴露 Electron API | 算法细节 |
| RemixService | 任务状态、错误处理、snapshot 构建 | 视频帧处理 |
| RemixSegmentationService | 读取素材、调用 detector、构造 SourceSegment、写 artifacts | 直接加载 torch / opencv |
| ShotDetectionRunner | spawn Python、传参、解析 JSON、fallback | 业务 segment 语义 |
| Python Worker | PySceneDetect / TransNetV2 检测 | 读写 Remix manifest |
| Artifact Writer | 写 segment manifest、segment index、source clip path | 决定真实边界 |

---

## 5. TypeScript 后端设计

### 5.1 新增类型

新增文件：

```text
electron/sceneforge/remix/shot-detection/shot-detector-types.ts
```

建议内容：

```ts
import type { RemixSegmentationMode } from '../../../../src/sceneforge/remix/types';

export type ShotDetectorName =
  | 'pyscenedetect_adaptive'
  | 'transnetv2'
  | 'hybrid_fallback';

export type ShotBoundaryKind = 'hard_cut' | 'gradual' | 'inferred';

export interface ShotDetectionRequest {
  projectDir: string;
  sourceAssetId: string;
  videoPath: string;
  mode: RemixSegmentationMode;
  minShotDurationMs: number;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  threshold?: number | null;
}

export interface ShotBoundaryCandidate {
  timeMs: number;
  frameIndex: number;
  confidence: number;
  sources: string[];
  boundaryType: ShotBoundaryKind;
  rawScore?: number | null;
}

export interface ShotSceneRange {
  startMs: number;
  endMs: number;
  durationMs: number;
  startFrame: number;
  endFrame: number;
  confidence?: number | null;
}

export interface ShotDetectionMetrics {
  elapsedMs?: number;
  frameCount?: number;
  analysisFps?: number;
  modelDevice?: 'cpu' | 'cuda' | 'mps' | 'unknown';
  rawBoundaryCount?: number;
  filteredBoundaryCount?: number;
}

export interface ShotDetectionResult {
  mode: RemixSegmentationMode;
  detector: ShotDetectorName;
  usedFallback: boolean;
  fallbackReason?: string | null;
  boundaries: ShotBoundaryCandidate[];
  scenes: ShotSceneRange[];
  metrics?: ShotDetectionMetrics;
  notes: string[];
}
```

### 5.2 Python Worker Runner

新增：

```text
electron/sceneforge/remix/shot-detection/shot-detector-runner.ts
```

核心职责：

1. 定位 Python 可执行文件。
2. 定位 `detect_shots.py`。
3. 定位 TransNetV2 模型目录。
4. 通过 stdin 发送 JSON。
5. 从 stdout 读取 JSON。
6. stderr 只作为日志/错误信息。
7. accurate 失败时自动 fallback 到 fast。

伪代码：

```ts
export async function runShotDetector(
  request: ShotDetectionRequest,
): Promise<ShotDetectionResult> {
  try {
    return await invokePythonDetector(request);
  } catch (error) {
    if (request.mode === 'accurate') {
      const fallback = await invokePythonDetector({ ...request, mode: 'fast' });
      return {
        ...fallback,
        mode: 'accurate',
        detector: 'hybrid_fallback',
        usedFallback: true,
        fallbackReason: error instanceof Error ? error.message : String(error),
        notes: [
          ...fallback.notes,
          'TransNetV2 高精检测不可用，已自动降级为 PySceneDetect AdaptiveDetector。',
        ],
      };
    }
    throw error;
  }
}
```

### 5.3 Python 路径解析

新增：

```text
electron/sceneforge/remix/shot-detection/python-runtime-resolver.ts
```

解析顺序：

```text
1. process.env.LINGJI_SHOT_PYTHON
2. resources/python-runtime/${platform}-${arch}/bin/python 或 python.exe
3. 项目根目录 .venv-shot/bin/python 或 Scripts/python.exe
4. 系统 python3
5. 系统 python
```

开发阶段建议先使用：

```bash
LINGJI_SHOT_PYTHON=/path/to/.venv-shot/bin/python npm run dev
```

发布阶段再考虑内置 Python runtime。

### 5.4 模型路径解析

新增：

```text
electron/sceneforge/remix/shot-detection/model-path-resolver.ts
```

解析顺序：

```text
1. process.env.LINGJI_TRANSNETV2_MODEL_PATH
2. resources/models/transnetv2/transnetv2-pytorch-weights.pth
3. 用户数据目录 models/transnetv2/transnetv2-pytorch-weights.pth
```

推荐支持用户手动放置模型，避免早期包体变大：

```text
~/Library/Application Support/灵机剪影/models/transnetv2/transnetv2-pytorch-weights.pth
```

### 5.5 RemixSegmentationService 改造

当前：

```ts
buildSegmentsFromCandidates(
  sourceAssetId,
  durationMs,
  buildCandidateBoundaries(inputProfile, mode),
  minShotDurationMs,
)
```

改造后：

```ts
const detectionResult = preservedSegments
  ? null
  : await runShotDetector({
      projectDir,
      sourceAssetId,
      videoPath: document.sourceAsset.sourceVideoPath,
      mode,
      minShotDurationMs,
      durationMs: document.sourceAsset.videoMetadata.durationMs,
      fps: document.sourceAsset.videoMetadata.fps ?? 25,
      width: document.sourceAsset.videoMetadata.width,
      height: document.sourceAsset.videoMetadata.height,
    });

const { segments, lowConfidenceSegmentIds } = preservedSegments
  ? buildFromPreservedSegments(preservedSegments)
  : buildSegmentsFromDetectionResult(
      sourceAssetId,
      document.sourceAsset.videoMetadata.durationMs,
      detectionResult,
      minShotDurationMs,
    );
```

---

## 6. Python Worker 设计

### 6.1 目录结构

建议新增：

```text
resources/shot-detectors/
  detect_shots.py
  common.py
  fast_pyscenedetect.py
  accurate_transnetv2.py
  requirements-fast.txt
  requirements-accurate.txt

resources/models/transnetv2/
  transnetv2-pytorch-weights.pth
  README.md
```

### 6.2 Worker 输入

Node 通过 stdin 传入：

```json
{
  "videoPath": "/absolute/path/source.mp4",
  "mode": "accurate",
  "minShotDurationMs": 1200,
  "durationMs": 65432,
  "fps": 25,
  "width": 1920,
  "height": 1080,
  "threshold": null,
  "modelPath": "/absolute/path/transnetv2-pytorch-weights.pth"
}
```

### 6.3 Worker 输出

stdout 只输出 JSON：

```json
{
  "ok": true,
  "mode": "accurate",
  "detector": "transnetv2",
  "usedFallback": false,
  "boundaries": [
    {
      "timeMs": 2480,
      "frameIndex": 62,
      "confidence": 0.93,
      "sources": ["transnetv2_single_frame"],
      "boundaryType": "hard_cut",
      "rawScore": 0.93
    }
  ],
  "scenes": [
    {
      "startMs": 0,
      "endMs": 2480,
      "durationMs": 2480,
      "startFrame": 0,
      "endFrame": 61,
      "confidence": 0.93
    }
  ],
  "metrics": {
    "elapsedMs": 1820,
    "frameCount": 1635,
    "modelDevice": "mps",
    "rawBoundaryCount": 43,
    "filteredBoundaryCount": 36
  },
  "notes": []
}
```

错误时：

```json
{
  "ok": false,
  "error": "TransNetV2 model file not found: ..."
}
```

### 6.4 `detect_shots.py` 主入口

```python
import json
import sys
import time
from fast_pyscenedetect import run_fast_detection
from accurate_transnetv2 import run_accurate_detection


def main():
    request = json.loads(sys.stdin.read())
    started = time.time()
    mode = request.get("mode", "fast")

    if mode == "fast":
        result = run_fast_detection(request)
    elif mode == "accurate":
        result = run_accurate_detection(request)
    else:
        raise ValueError(f"Unsupported mode: {mode}")

    result.setdefault("metrics", {})
    result["metrics"]["elapsedMs"] = int((time.time() - started) * 1000)
    print(json.dumps({"ok": True, **result}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
```

---

## 7. 快速模式设计：PySceneDetect AdaptiveDetector

### 7.1 定位

快速模式用于：

- 快速预览。
- CPU 友好处理。
- 对分镜准确率要求中等，但要求稳定和速度。
- 减少大幅运动导致的误切。

### 7.2 依赖

```text
scenedetect
opencv-python-headless
numpy
```

建议 `requirements-fast.txt`：

```text
scenedetect>=0.6.5
opencv-python-headless>=4.8.0
numpy>=1.23
```

### 7.3 参数映射

| 前端粒度 | minShotDurationMs | PySceneDetect min_scene_len |
|---|---:|---:|
| fine | 1000 | 1.0s |
| balanced | 默认 1800 | 1.8s |
| coarse | 3000 | 3.0s |

推荐默认参数：

```python
AdaptiveDetector(
    adaptive_threshold=3.0,
    min_scene_len=f"{min_scene_len_seconds}s",
    window_width=2,
    min_content_val=15.0,
)
```

### 7.4 输出置信度

PySceneDetect 的 scene list 本身不是概率模型输出。建议第一阶段用规则 confidence：

```text
默认 0.72
如果 scene duration 太短：0.62，标记 needs_review
如果边界过密后被过滤：不输出边界，但 diagnostics 记录 filteredBoundaryCount
```

后续增强可打开 stats file，读取 adaptive_ratio/content_val 做更精确 confidence 映射。

### 7.5 fallback

fast 模式失败时：

1. 首先尝试当前已有模拟候选逻辑作为 emergency fallback。
2. diagnostics 标记 `usedFallback: true`。
3. notes 写明：`PySceneDetect 不可用，已使用规则候选边界降级结果。`

---

## 8. 高精模式设计：TransNetV2

### 8.1 定位

高精模式用于：

- 用户明确选择“高精模式”。
- 希望更接近真实剪辑点。
- 需要识别硬切、常见转场、短镜头密集切换。
- 可接受比 fast 更慢的处理时间。

### 8.2 依赖

第一版推荐使用 PyTorch 版：

```text
torch
numpy
opencv-python-headless 或 ffmpeg rawvideo
```

建议 `requirements-accurate.txt`：

```text
-r requirements-fast.txt
torch>=2.1.0
```

macOS Apple Silicon 可以优先尝试 MPS：

```python
if torch.backends.mps.is_available():
    device = torch.device("mps")
elif torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")
```

### 8.3 帧提取

参考 `transnetv2Pro` 的设计，统一使用 ffmpeg 提取：

```bash
ffmpeg -i input.mp4 \
  -vf scale=48:27:flags=fast_bilinear \
  -f rawvideo \
  -pix_fmt rgb24 \
  pipe:
```

输出 numpy shape：

```text
[n_frames, 27, 48, 3], dtype=uint8
```

注意：

- 不要一次性处理超长视频时无限制读入内存。
- 可设置最大内存阈值，长视频按 chunk 读取。
- TransNetV2 需要时间上下文，chunk 之间要保留 overlap，例如 50 帧。

第一版可以先全量读入，限制 Remix 源素材时长；第二版再做 chunk/overlap。

### 8.4 推理

高精模式输出两类预测：

- `single_frame_predictions`
- 可选 `many_hot_predictions`

第一版建议先用 single frame 预测，并保留扩展字段：

```json
{
  "sources": ["transnetv2_single_frame"]
}
```

第二版再融合 many-hot：

```text
single_frame > 0.5：硬边界
many_hot 连续高分：渐变/转场区间
single + many_hot 同时强：高置信边界
```

### 8.5 阈值策略

建议第一版采用：

```text
基础阈值：0.5
动态阈值：max(0.35, min(0.65, mean + std * 1.0))
最终阈值：如果用户未设置，取动态阈值；如果用户设置，取用户阈值。
```

实际逻辑：

```python
scores = predictions
if threshold is None:
    threshold = np.clip(np.mean(scores) + np.std(scores), 0.35, 0.65)
peaks = local_maxima(scores >= threshold)
```

### 8.6 最小镜头长度过滤

TransNetV2 产生的是候选边界，仍然需要业务侧过滤：

```text
candidate.timeMs - previous.timeMs < minShotDurationMs
  且 candidate.confidence < 0.86
  → 合并/丢弃
```

高置信度边界可以例外保留，例如：

```text
confidence >= 0.90，即使距离较短，也保留但标记 needs_review
```

这样可以避免误删快速剪辑里的真实短镜头。

### 8.7 高精 fallback

高精模式失败时，不直接报错给用户，优先 fallback：

```text
TransNetV2 失败
  → PySceneDetect AdaptiveDetector
  → diagnostics.usedFallback = true
  → detector = hybrid_fallback
  → notes 写明降级原因
```

只有 fast fallback 也失败时，才让 `runSourceSegmentation` 失败。

---

## 9. SourceSegment 构造与后处理

### 9.1 检测结果到 SourceSegment

`ShotDetectionResult.scenes` 转换为 `SourceSegment[]`：

```ts
function buildSegmentsFromDetectionResult(
  sourceAssetId: string,
  durationMs: number,
  detection: ShotDetectionResult,
  minShotDurationMs: number,
): { segments: SourceSegment[]; lowConfidenceSegmentIds: string[] } {
  const scenes = normalizeScenes(detection.scenes, durationMs, minShotDurationMs);
  return buildSourceSegments(sourceAssetId, scenes, detection);
}
```

每个 segment：

```ts
{
  id: `segment-${String(index + 1).padStart(3, '0')}`,
  sourceAssetId,
  index: index + 1,
  title: buildSegmentTitle(...),
  boundaryType: resolveBusinessBoundaryType(...),
  timeRange: { startMs, endMs, durationMs },
  boundary: {
    startConfidence,
    endConfidence,
    startSources,
    endSources,
    boundaryType: 'hard_cut' | 'gradual' | 'inferred',
  },
  reviewStatus,
  sourceClipPath,
  keyframes: [],
  semantic,
}
```

### 9.2 业务 boundaryType 映射

| 检测/后处理来源 | SourceSegment.boundaryType | boundary.boundaryType | sources |
|---|---|---|---|
| TransNetV2 真实检测 | `source_shot` | `hard_cut` / `gradual` | `transnetv2_single_frame` |
| PySceneDetect 真实检测 | `source_shot` | `hard_cut` | `pyscenedetect_adaptive` |
| 短段合并 | `merged_short_shots` | `inferred` | 原 sources + `min_duration_merge` |
| 长镜头工程拆分 | `split_long_shot` | `inferred` | `max_duration_split` |
| 尾段过长但保留 | `long_segment` | `inferred` | 原 sources |
| 人工合并/拆分 | `manual_adjusted` 状态 + boundary manual | `manual` | `manual_override` |

### 9.3 长镜头工程拆分

建议新增参数：

```ts
maxSegmentDurationMs?: number;
```

第一版可内置：

```text
默认 8000ms
如果未来对接 Seedance/Wan 帧数限制，可按 fps 映射 81 帧：81 / fps * 1000
```

伪代码：

```ts
if (scene.durationMs > maxSegmentDurationMs) {
  split into N chunks;
  mark boundary sources = ['max_duration_split'];
  boundaryType = 'split_long_shot';
}
```

这一步必须和真实检测边界分开，否则后续镜头理解会误判。

### 9.4 低置信度判定

建议：

```text
endConfidence < 0.7 → needs_review
segment.durationMs < minShotDurationMs 且 confidence < 0.9 → needs_review
fallback 结果中的全部低置信边界 → needs_review
人工调整过 → manual_adjusted
```

---

## 10. 前后端对接方案

### 10.1 IPC 契约

当前 IPC 输入已够用：

```ts
export interface RunSourceSegmentationInput extends RemixSourceAssetRefInput {
  mode?: RemixSegmentationMode;
  preserveManualEdits?: boolean;
  minShotDurationMs?: number;
}
```

第一阶段无需改 IPC。

第二阶段可扩展：

```ts
export interface RunSourceSegmentationInput extends RemixSourceAssetRefInput {
  mode?: RemixSegmentationMode;
  preserveManualEdits?: boolean;
  minShotDurationMs?: number;
  threshold?: number | null;
  maxSegmentDurationMs?: number | null;
  debugArtifacts?: boolean;
}
```

### 10.2 preload

当前 preload 已暴露：

```ts
runSourceSegmentation: (input) =>
  ipcRenderer.invoke('sceneForgeRemix:runSourceSegmentation', input)
```

第一阶段无需改。

### 10.3 前端状态

当前前端已经有：

```ts
segmentationMode: 'fast' | 'accurate'
preserveManualEdits: boolean
granularity: 'fine' | 'balanced' | 'coarse'
```

第一阶段无需新增状态。

### 10.4 diagnostics 显示

当前 UI 调用：

```ts
buildSegmentationDiagnosticsSummary(asset.segmentationDiagnostics)
```

建议改造 summary 文案：

```text
快速模式 · PySceneDetect AdaptiveDetector · 生成 32 个镜头段 · 用时 3.2s
高精模式 · TransNetV2 · 生成 41 个镜头段 · 用时 8.7s
高精模式 · 已降级 · PySceneDetect AdaptiveDetector · 原因：缺少模型权重
```

### 10.5 是否需要进度条

第一阶段不强制做流式进度，因为当前 `runProcessingStage` 已经是一次 Promise 任务。

第二阶段建议新增事件：

```text
sceneForgeRemix:segmentationProgress
```

事件 payload：

```ts
interface RemixSegmentationProgressPayload {
  sourceAssetId: string;
  phase:
    | 'validating'
    | 'extracting_frames'
    | 'loading_model'
    | 'predicting'
    | 'postprocessing'
    | 'writing_artifacts';
  percent?: number;
  message: string;
}
```

Python Worker 可以 stderr 输出 JSONL 进度，TS runner 解析后转发给 renderer。

---

## 11. 前端 UI 是否需要调整

### 11.1 第一阶段：基本不用调整

当前 UI 已经有：

- 快速模式按钮。
- 高精模式按钮。
- 最小镜头长度下拉。
- 运行切片。
- 保留人工校准。
- diagnostics summary。
- 时间轴和人工校准按钮。

这已经能承载新后端。

### 11.2 建议做的小调整

#### 1. 模式说明改真实

当前 tooltip 可以改为：

```text
快速模式：使用 PySceneDetect AdaptiveDetector 快速检测镜头变化，适合预览和普通素材。
高精模式：使用 TransNetV2 深度模型检测镜头边界，适合复杂剪辑和高精度切片。
```

#### 2. diagnostics 增加 detector 标签

在 diagnostics summary 旁显示小标签：

```text
Detector: TransNetV2
Fallback: No
Elapsed: 8.7s
```

#### 3. 高精模式首次使用提示

如果本地缺少模型权重或 Python 环境：

```text
高精模型未就绪。你仍可运行快速模式，或在设置中配置 TransNetV2 模型路径。
```

但不要阻断用户点击，后端可以 fallback。

#### 4. 可选“高级设置”折叠项

不建议第一版暴露太多参数。第二阶段可以在折叠项里提供：

- 高精阈值：自动 / 0.35 / 0.5 / 0.65。
- 最大片段时长：不限制 / 5s / 8s / 10s。
- 保存检测调试文件。

默认保持简洁。

### 11.3 不建议的 UI 调整

不建议增加一堆模型细节参数，比如 batch size、device、window size。普通用户不需要理解这些。它们应该进入设置页或 debug config，而不是资产处理主工作台。

---

## 12. 打包与运行时设计

### 12.1 开发期

开发期使用项目本地 venv：

```bash
python3 -m venv .venv-shot
source .venv-shot/bin/activate
pip install -r resources/shot-detectors/requirements-accurate.txt

LINGJI_SHOT_PYTHON=$(pwd)/.venv-shot/bin/python npm run dev
```

### 12.2 发布期：两种方案

#### 方案 A：不内置 Python，只提示用户配置

优点：

- 包体小。
- 实现快。
- 适合内部测试。

缺点：

- 普通用户配置成本高。
- 环境不稳定。

#### 方案 B：内置 Python runtime + site-packages

优点：

- 用户开箱即用。
- 版本可控。

缺点：

- 包体显著增大。
- macOS arm64/x64、Windows x64 要分平台打包。
- torch 包体较大，签名/公证更复杂。

建议路线：

```text
内部开发版：方案 A
小范围测试版：方案 A + 一键环境检测
正式发布版：方案 B
```

### 12.3 asar unpack

当前打包只 stage `resources`，但需要确保 Python 脚本和模型不被压进 asar 后无法直接访问。

建议在 `scripts/package-mac-helpers.cjs` 的 `RENDER_RUNTIME_ASAR_UNPACK_DIRS` 增加：

```text
resources/shot-detectors
resources/models
resources/python-runtime
```

### 12.4 ffmpeg 路径

当前项目已有 `resolveFfmpegPath` 和 `resolveFfprobePath`。Python Worker 可以通过环境变量接收：

```text
LINGJI_FFMPEG_PATH=/absolute/path/ffmpeg
LINGJI_FFPROBE_PATH=/absolute/path/ffprobe
```

避免 Python 自己到系统 PATH 中找 ffmpeg。

---

## 13. 错误处理与 fallback 策略

### 13.1 错误分类

| 错误 | fast 模式 | accurate 模式 |
|---|---|---|
| Python 不存在 | 失败，提示配置 Python | fallback 不可用，失败 |
| PySceneDetect 不存在 | emergency fallback 到规则候选 | 先尝试 TransNetV2，失败再规则 fallback |
| torch 不存在 | 不影响 fast | fallback 到 fast |
| 模型权重不存在 | 不影响 fast | fallback 到 fast |
| 视频解码失败 | 失败 | 失败 |
| TransNetV2 OOM | 不影响 fast | 降 batch；仍失败则 fallback 到 fast |
| Worker stdout 非 JSON | 失败并记录 stderr | fallback 到 fast |

### 13.2 用户可理解提示

不要直接显示 Python stacktrace。前端显示：

```text
高精模型暂不可用，已自动使用快速模式完成切片。你可以继续人工校准，或稍后在设置中配置 TransNetV2 环境。
```

技术细节放 diagnostics notes。

---

## 14. 测试计划

### 14.1 单元测试

新增：

```text
tests/sceneforge-remix-shot-detector-runner.test.ts
tests/sceneforge-remix-segmentation-detection-result.test.ts
tests/sceneforge-remix-segmentation-fallback.test.ts
```

测试点：

- `ShotDetectionResult` 转 `SourceSegment[]`。
- minShotDurationMs 过滤。
- 高置信短镜头保留。
- 长镜头工程拆分。
- accurate 失败 fallback 到 fast。
- preserveManualEdits=true 时不调用 detector。
- diagnostics detector / usedFallback / notes 正确。

### 14.2 Python Worker 测试

新增：

```text
resources/shot-detectors/tests/test_detect_shots_fast.py
resources/shot-detectors/tests/test_detect_shots_output_schema.py
```

使用极短测试视频或 mock 输出。

### 14.3 集成测试

准备 3 类素材：

1. 明显硬切视频。
2. 快速运动但没有剪辑的视频。
3. 淡入淡出 / 溶解转场视频。

验收标准：

- fast 不产生大量误切。
- accurate 能明显优于 fast，尤其是短镜头和转场。
- fallback 不阻塞用户流程。
- 前端 timeline 和表格都能正常显示结果。
- 人工合并/拆分后重跑保留逻辑仍有效。

---

## 15. 分阶段实施路线

### Phase 1：接入最小 Python Worker + fast 模式

目标：真实替换当前 fast 模拟逻辑。

任务：

- 新增 Python Worker 框架。
- 新增 PySceneDetect fast 实现。
- 新增 TS runner。
- `RemixSegmentationService` 调用 runner。
- diagnostics 显示真实 detector。
- fast 失败时保留当前规则 fallback。

验收：

- 点击“快速模式 → 运行切片”，能基于真实视频内容生成镜头段。
- 前端时间轴、表格、人工合并拆分不受影响。

### Phase 2：接入 TransNetV2 accurate 模式

目标：高精模式真实可用。

任务：

- 增加 TransNetV2 PyTorch 推理。
- 增加模型路径解析。
- 增加 MPS/CUDA/CPU 设备选择。
- 增加 predictions → scenes 后处理。
- accurate 失败 fallback 到 fast。

验收：

- 点击“高精模式 → 运行切片”，真实调用 TransNetV2。
- diagnostics 显示 `TransNetV2`、耗时、边界数量。
- 缺模型时自动降级，不破坏流程。

### Phase 3：关键帧真实抽取

当前 `RemixKeyframeService` 仍然写 1px PNG 占位图。真实切片完成后，应改为用 ffmpeg 从每个 segment 的 first/middle/last 时间点抽帧。

任务：

- 用 `ffmpeg -ss timestamp -frames:v 1` 抽帧。
- first 避免取在黑场/边界瞬间，可偏移 +100ms。
- last 避免取到下一镜头，可偏移 -100ms。
- middle 取中点。

### Phase 4：进度事件与调试可视化

目标：提升用户等待体验和算法调试能力。

任务：

- Python stderr 输出 JSONL progress。
- TS runner 转发 IPC progress。
- 前端显示阶段进度。
- 可选保存 predictions CSV / boundary debug JSON。

### Phase 5：内置 Python Runtime / 正式打包

目标：开箱即用。

任务：

- 为 macOS arm64/x64 打包 Python runtime。
- Windows x64 单独打包。
- 模型权重随包或首次下载。
- 增加设置页环境检测。

---

## 16. 推荐首批文件变更清单

```text
electron/sceneforge/remix/remix-segmentation-service.ts
src/sceneforge/remix/types/index.ts
scripts/package-mac-helpers.cjs

electron/sceneforge/remix/shot-detection/shot-detector-types.ts
electron/sceneforge/remix/shot-detection/shot-detector-runner.ts
electron/sceneforge/remix/shot-detection/python-runtime-resolver.ts
electron/sceneforge/remix/shot-detection/model-path-resolver.ts
electron/sceneforge/remix/shot-detection/shot-boundary-normalizer.ts

resources/shot-detectors/detect_shots.py
resources/shot-detectors/fast_pyscenedetect.py
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/common.py
resources/shot-detectors/requirements-fast.txt
resources/shot-detectors/requirements-accurate.txt
resources/models/transnetv2/README.md
```

---

## 17. 最终建议

对于当前项目，最合适的方案不是把 TransNetV2 封装成 Node 原生模块，也不是启动一个长期运行的外部 REST 服务，而是：

```text
Electron 主进程 spawn Python Worker
  fast: PySceneDetect AdaptiveDetector
  accurate: TransNetV2
  accurate 失败自动 fallback fast
  所有结果统一转 SourceSegment[]
```

这样改造面最小，和当前 Remix 工作台架构最匹配，也方便未来扩展：

- 后续可以替换 AutoShot 或其他模型。
- 可以增加视觉调试图。
- 可以从一次性 Worker 演进成长驻 Worker。
- 可以接入内置 Python runtime，做到开箱即用。

前端第一阶段不需要大改，只需要让 diagnostics 文案真实反映 detector、fallback、耗时和边界数量。当前 UI 的“快速模式 / 高精模式 / 最小镜头长度 / 保留人工校准”已经足够承载这次算法升级。
