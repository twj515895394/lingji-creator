# 分镜切片与片段产物实施计划

> 本文定义从当前规则模拟切片升级到真实检测 + 真实分镜视频片段产物的实施计划。

---

## 1. 总体阶段

```text
Phase 1：快速模式真实检测 + source_clip.mp4 最小闭环
Phase 2：TransNetV2 高精模式 + fallback
Phase 3：片段导出与文件操作
Phase 4：真实关键帧抽取
Phase 5：进度事件、调试产物、内置 Python runtime
```

优先级：先让用户拿到可用片段视频，再提升高精检测能力，最后增强导出、进度和运行时体验。

---

## 2. Phase 1：快速模式真实检测 + 视频片段产物

### 目标

用 PySceneDetect 替换 fast 模式模拟边界，并在切片后生成真实 `source_clip.mp4`。

### 后端任务

1. 新增 Python Worker 基础结构：

```text
resources/shot-detectors/detect_shots.py
resources/shot-detectors/fast_pyscenedetect.py
resources/shot-detectors/common.py
resources/shot-detectors/requirements-fast.txt
```

2. 新增 TS runner：

```text
electron/sceneforge/remix/shot-detection/shot-detector-runner.ts
electron/sceneforge/remix/shot-detection/shot-detector-types.ts
electron/sceneforge/remix/shot-detection/python-runtime-resolver.ts
```

3. 改造 `RemixSegmentationService`：

```text
buildCandidateBoundaries(fast)
  → runShotDetector(fast)
```

4. 新增 SegmentClipService：

```text
electron/sceneforge/remix/segment-clips/segment-clip-service.ts
```

5. 改造 `writeSegmentArtifacts()`：写 manifests → 生成 source clips → 写 index。

6. `updateSourceSegments()` 人工合并/拆分后也重新生成 clips。

### 前端任务

- 更新快速模式说明。
- diagnostics summary 展示 detector、段数、片段视频生成数量。
- clip 生成失败时显示失败信息。

### 验收

- 快速模式不再使用固定步长模拟。
- 每个 segment 目录存在真实 `source_clip.mp4`。
- 用户可以在本地打开片段视频。
- 人工合并/拆分后视频片段同步更新。

---

## 3. Phase 2：TransNetV2 高精模式

### 目标

高精模式真实调用 TransNetV2，失败时自动 fallback 到 fast。

### 后端任务

1. 新增：

```text
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/requirements-accurate.txt
resources/models/transnetv2/README.md
```

2. 新增模型路径解析：

```text
electron/sceneforge/remix/shot-detection/model-path-resolver.ts
```

3. 支持环境变量：

```text
LINGJI_SHOT_PYTHON
LINGJI_TRANSNETV2_MODEL_PATH
LINGJI_FFMPEG_PATH
LINGJI_FFPROBE_PATH
```

4. Worker 支持 ffmpeg 抽分析帧、PyTorch 模型加载、MPS/CUDA/CPU 自动选择、predictions 转 scenes。

5. accurate 失败时 fallback 到 fast，并在 diagnostics 记录原因。

### 前端任务

- 更新高精模式说明。
- diagnostics summary 显示 TransNetV2 或 fallback。
- 高精模型未就绪时显示温和提示。

### 验收

- 高精模式真实检测复杂剪辑。
- 缺模型时不阻塞用户流程。
- 生成 clips 与检测边界一致。

---

## 4. Phase 3：片段导出与文件操作

### 目标

让用户直接导出分镜片段给外部视频编辑或二创流程使用。

### 后端任务

新增 IPC：

```text
sceneForgeRemix:exportSourceSegmentClips
sceneForgeRemix:regenerateSourceSegmentClips
sceneForgeRemix:openSourceSegmentClipFolder
```

新增服务：

```text
electron/sceneforge/remix/segment-clips/segment-clip-exporter.ts
```

导出内容示例：

```text
001_00-00-00-000_00-00-03-240.mp4
002_00-00-03-240_00-00-07-600.mp4
clips_manifest.json
```

### 前端任务

- 切片步骤增加“导出全部分镜片段”。
- 当前段增加“打开当前片段 / 在文件夹中显示”。
- SegmentTable 增加片段状态。

### 验收

- 导出目录包含全部 clips。
- manifest 可追踪 segmentId、时间段、原始 sourceAssetId。
- 导出片段可被外部工具打开。

---

## 5. Phase 4：真实关键帧抽取

### 目标

替换当前关键帧占位图，使用 ffmpeg 抽真实 first/middle/last。

### 后端任务

改造：

```text
electron/sceneforge/remix/remix-keyframe-service.ts
```

抽帧策略：

```text
first: startMs + 100ms
middle: midpoint
last: endMs - 100ms
```

短片段需要 clamp 到有效范围。

### 验收

- 每个 keyframe 图片真实来自源视频。
- UI KeyframeGallery 显示真实画面。
- 关键帧 timestamp 与 segment timeRange 一致。

---

## 6. Phase 5：进度、调试、发布运行时

### 进度事件

新增：

```text
sceneForgeRemix:segmentationProgress
```

阶段：

```text
detecting
building_segments
generating_clips
writing_artifacts
validating
```

### 调试产物

可选保存：

```text
shot_detection_result.json
predictions.csv
clip_generation_report.json
```

### 发布运行时

```text
内测：用户配置 Python / 模型路径
正式：内置 Python runtime + site-packages + TransNetV2 weights
```

asar unpack 增加：

```text
resources/shot-detectors
resources/models
resources/python-runtime
```

---

## 7. 测试矩阵

| 场景 | fast | accurate | clips | UI |
|---|---|---|---|---|
| 普通硬切视频 | 应检测 | 应检测更准 | 全部生成 | 正常显示 |
| 快速运动无切点 | 少误切 | 少误切 | 全部生成 | 可人工调整 |
| 淡入淡出/溶解 | 可能低置信 | 应更好 | 全部生成 | needs_review |
| 缺 Python | 失败提示 | fallback 不可用 | 不生成 | 明确错误 |
| 缺 TransNetV2 权重 | fast 正常 | fallback fast | 全部生成 | 降级提示 |
| ffmpeg 裁切失败 | job failed | job failed | 标记失败 | 错误提示 |
| 人工合并/拆分 | 不重新检测 | 不重新检测 | 重新生成 | 时间轴更新 |

---

## 8. 最小可交付版本

最小版本要求：

```text
fast 真实检测
+ source_clip.mp4 真实生成
+ 人工校准后 clip 同步
+ diagnostics 清楚
```

完成这个闭环后，Remix 二创工作台才真正拥有可复用的分镜素材资产。
