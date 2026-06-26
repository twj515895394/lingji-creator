# 检测 Worker 设计：PySceneDetect + TransNetV2

> 本文定义分镜/换场检测 Worker。它只负责从视频中检测 scenes/boundaries，不负责写 Remix manifest，也不负责生成最终 `source_clip.mp4`。

---

## 1. 设计目标

检测 Worker 的目标是把当前规则模拟的边界候选替换为真实算法输出：

```text
输入：视频路径 + 模式 + 最小镜头长度 + 基础元数据
输出：ShotDetectionResult JSON
```

支持两种模式：

| 模式 | detector | 定位 |
|---|---|---|
| `fast` | PySceneDetect AdaptiveDetector | 快速、稳定、CPU 友好 |
| `accurate` | TransNetV2 | 高精度、模型推理、适合复杂剪辑 |

---

## 2. 为什么采用 Python Worker

项目主体是 Electron + TypeScript，但视频算法生态主要在 Python。强行在 TS 中重写 TransNetV2 不划算。

推荐边界：

```text
TypeScript
  - IPC
  - 任务状态
  - SourceSegment 构造
  - diagnostics
  - fallback 编排
  - 模型路径 / vendor 路径解析

Python
  - PySceneDetect
  - TransNetV2
  - ffmpeg rawvideo 帧提取
  - predictions → scenes 初步转换
```

Worker 采用一次性进程：

```text
spawn python detect_shots.py
stdin: request JSON
stdout: result JSON
stderr: logs / progress
```

第一版使用一次性进程足够简单。后续如果 TransNetV2 冷启动明显影响体验，再演进为常驻 Worker。

---

## 3. TypeScript Runner

建议新增：

```text
electron/sceneforge/remix/shot-detection/
  shot-detector-types.ts
  shot-detector-runner.ts
  python-runtime-resolver.ts
  model-path-resolver.ts
```

### 3.1 请求类型

```ts
export interface ShotDetectionRequest {
  projectDir: string;
  sourceAssetId: string;
  videoPath: string;
  mode: 'fast' | 'accurate';
  minShotDurationMs: number;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  threshold?: number | null;
  modelPath?: string | null;
  modelVendorDir?: string | null;
}
```

### 3.2 返回类型

```ts
export interface ShotDetectionResult {
  mode: 'fast' | 'accurate';
  detector: 'pyscenedetect_adaptive' | 'transnetv2' | 'hybrid_fallback';
  usedFallback: boolean;
  fallbackReason?: string | null;
  boundaries: ShotBoundaryCandidate[];
  scenes: ShotSceneRange[];
  metrics?: ShotDetectionMetrics;
  notes: string[];
}
```

### 3.3 fallback 策略

```text
accurate 失败
  → 自动调用 fast
  → detector = hybrid_fallback
  → usedFallback = true
  → fallbackReason = accurate 失败原因

fast 失败
  → 可选 emergency fallback 到当前规则模拟
  → 否则任务失败
```

---

## 4. Python Worker 文件结构

```text
resources/shot-detectors/
  detect_shots.py              # 主入口
  common.py                    # JSON IO、时间转换、scene normalization
  fast_pyscenedetect.py        # PySceneDetect AdaptiveDetector
  accurate_transnetv2.py       # TransNetV2 推理
  requirements-fast.txt
  requirements-accurate.txt
  vendor/
    transnetv2/                # Hugging Face / PyTorch 模型结构代码
      __init__.py
      transnetv2_pytorch.py    # 示例名，实际以来源仓库为准
```

### 4.1 `detect_shots.py`

职责：

1. 从 stdin 读取 JSON。
2. 根据 `mode` 分发到 fast / accurate。
3. 捕获异常。
4. stdout 只输出 JSON。
5. stderr 输出日志。

伪代码：

```python
request = json.loads(sys.stdin.read())
if request["mode"] == "fast":
    result = run_fast_detection(request)
elif request["mode"] == "accurate":
    result = run_accurate_detection(request)
print(json.dumps({"ok": True, **result}, ensure_ascii=False))
```

错误：

```python
print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
sys.exit(1)
```

---

## 5. TransNetV2 模型资产与加载要求

高精模式不能只准备 `.pth`。它至少需要：

```text
1. PyTorch 权重文件：*.pth，例如 transnetv2-pytorch-weights.pth
2. 与权重匹配的模型结构代码：例如 transnetv2_pytorch.py / model.py
3. Python 依赖：torch、numpy、ffmpeg/opencv 相关依赖
```

推荐来源：

```text
https://huggingface.co/magnusdtd/TransNetV2/tree/main
```

如果该 Hugging Face 仓库提供现成 PyTorch 代码和 `.pth` 权重，优先使用它；不要再从 TensorFlow 权重手动转换。实际接入时不要把权重文件名写死为 `transnetv2-pytorch-weights.pth`，而是：

```text
1. 优先使用 LINGJI_TRANSNETV2_MODEL_PATH
2. 再找 resources/models/transnetv2/transnetv2-pytorch-weights.pth
3. 再扫描 resources/models/transnetv2/*.pth 中唯一文件
4. 找不到则 accurate fallback 到 fast
```

推荐目录：

```text
resources/models/transnetv2/
  transnetv2-pytorch-weights.pth        # 或实际 .pth 文件
  model-config.json
  README.md

resources/shot-detectors/vendor/transnetv2/
  transnetv2_pytorch.py                 # 或实际模型结构代码
  __init__.py
  LICENSE                               # 如果来源仓库提供
```

Worker 加载流程：

```python
sys.path.insert(0, vendor_dir)
from transnetv2_pytorch import TransNetV2
model = TransNetV2()
state_dict = torch.load(model_path, map_location=device)
model.load_state_dict(state_dict)
model.eval().to(device)
```

如果 Hugging Face 仓库的模型结构文件名不同，则在 `accurate_transnetv2.py` 里适配，不要直接从 TS 调 Hugging Face 仓库的 CLI；本项目 Worker 仍然输出统一 `ShotDetectionResult JSON`。

详细约定见：

```text
docs/sceneforge-remix/shot-segmentation/06-model-assets-and-directory-design.md
```

---

## 6. fast：PySceneDetect AdaptiveDetector

### 6.1 参数

```python
AdaptiveDetector(
    adaptive_threshold=3.0,
    min_scene_len=f"{min_scene_len_seconds}s",
    window_width=2,
    min_content_val=15.0,
)
```

`min_scene_len_seconds` 来源：

```text
fine      → 1.0s
balanced  → 1.8s
coarse    → 3.0s
```

### 6.2 输出转换

PySceneDetect 返回 scene list：

```text
[(start_timecode, end_timecode), ...]
```

转换为：

```json
{
  "scenes": [
    {
      "startMs": 0,
      "endMs": 2480,
      "durationMs": 2480,
      "startFrame": 0,
      "endFrame": 61,
      "confidence": 0.72
    }
  ],
  "boundaries": [
    {
      "timeMs": 2480,
      "frameIndex": 62,
      "confidence": 0.72,
      "sources": ["pyscenedetect_adaptive"],
      "boundaryType": "hard_cut"
    }
  ]
}
```

第一版 confidence 可规则化：

```text
正常边界：0.72
过短场景或接近阈值：0.62
fallback：0.55
```

后续可读取 stats file，把 adaptive_ratio / content_val 映射为 confidence。

---

## 7. accurate：TransNetV2

### 7.1 输入帧

TransNetV2 输入：

```text
[n_frames, 27, 48, 3], dtype=uint8, RGB
```

使用 ffmpeg rawvideo：

```bash
ffmpeg -i input.mp4 \
  -vf scale=48:27:flags=fast_bilinear \
  -f rawvideo \
  -pix_fmt rgb24 \
  pipe:
```

### 7.2 设备选择

```python
if torch.backends.mps.is_available():
    device = torch.device("mps")
elif torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")
```

### 7.3 阈值与后处理

第一版策略：

```text
scores = sigmoid(single_frame_predictions)
threshold = clip(mean(scores) + std(scores), 0.35, 0.65)
寻找 local maxima
过滤小于 minShotDurationMs 的低置信边界
高置信短镜头 confidence >= 0.90 可保留，但标记 needs_review
```

### 7.4 many-hot 扩展

第二版可融合 many-hot：

```text
single_frame 高峰：hard_cut
many_hot 连续高分：gradual / transition region
single + many_hot 同时高：高置信边界
```

---

## 8. 进度与日志

第一版 stdout 必须只输出最终 JSON。stderr 可以输出普通日志。

第二版建议 stderr 输出 JSONL 进度：

```json
{"type":"progress","phase":"extracting_frames","percent":20,"message":"正在提取分析帧"}
{"type":"progress","phase":"predicting","percent":60,"message":"TransNetV2 正在推理"}
```

TS runner 解析后转发给 renderer。

---

## 9. 验收标准

1. `fast` 模式真实调用 PySceneDetect，而非固定步长模拟。
2. `accurate` 模式能找到 `.pth` 权重和模型结构代码，并调用 TransNetV2 输出 scenes。
3. `accurate` 缺权重、缺模型结构代码、缺 torch 或 OOM 时能 fallback 到 fast。
4. Worker stdout 始终是可解析 JSON。
5. 长视频不会导致 Electron 主进程崩溃；异常能写入 diagnostics。
6. diagnostics 能区分“缺权重文件”和“缺模型结构代码”。
