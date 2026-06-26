# 分镜视频片段产物设计

> 本文定义分镜切片阶段如何保存真实视频片段。核心要求：每个 `SourceSegment` 不仅有时间范围，还必须有可直接使用的 `source_clip.mp4`。

---

## 1. 为什么分镜片段是核心产物

Remix 二创的镜头切割结果会用于：

- 直接丢给 Seedance 2.0 做视频编辑、视频续写、局部重绘。
- 作为原片理解和关键帧抽取的局部上下文。
- 作为素材库中的可复用镜头资产。
- 供用户人工预览、导出和二次剪辑。
- 后续 prompt bundle 打包时作为引用素材。

因此分镜切片阶段必须生成：

```text
SourceSegment[]
  + 每段真实 source_clip.mp4
  + 每段 segment_manifest.json
  + 全局 segment_manifest_index.json
```

---

## 2. 当前路径约定

现有 artifact path 已经定义：

```text
sceneforge/remix/source-assets/{sourceAssetId}/source_segments/{segmentId}/source_clip.mp4
sceneforge/remix/source-assets/{sourceAssetId}/source_segments/{segmentId}/segment_manifest.json
sceneforge/remix/source-assets/{sourceAssetId}/source_segments/segment_manifest_index.json
```

第一阶段应保持路径不变，只把 `source_clip.mp4` 从占位/复制升级为真实裁切视频。

---

## 3. SegmentClipService

建议新增：

```text
electron/sceneforge/remix/segment-clips/segment-clip-service.ts
```

### 3.1 输入

```ts
export interface GenerateSegmentClipsInput {
  projectDir: string;
  sourceVideoPath: string;
  sourceAssetId: string;
  segments: SourceSegment[];
  mode?: 'stream_copy' | 'reencode_accurate';
  overwrite?: boolean;
}
```

### 3.2 输出

```ts
export interface SegmentClipGenerationResult {
  segmentId: string;
  clipPath: string;
  status: 'ready' | 'failed';
  startMs: number;
  endMs: number;
  durationMs: number;
  fileSizeBytes?: number | null;
  error?: string | null;
}
```

### 3.3 职责

```text
for each segment:
  resolve project relative sourceClipPath
  mkdir segment dir
  run ffmpeg trim
  validate output exists and readable
  optionally write clip_metadata.json
```

---

## 4. 裁切模式

### 4.1 stream copy

命令：

```bash
ffmpeg -ss {startSeconds} -i source.mp4 \
  -t {durationSeconds} \
  -c copy \
  -avoid_negative_ts make_zero \
  source_clip.mp4
```

优点：

- 很快。
- 不重新编码。
- 画质无损。

缺点：

- 不一定帧精确。
- 受关键帧影响，开头可能偏移。
- 外部平台兼容性不一定稳定。

适合：快速预览、内部缓存、大量粗切。

### 4.2 reencode accurate

命令：

```bash
ffmpeg -ss {startSeconds} -i source.mp4 \
  -t {durationSeconds} \
  -c:v libx264 \
  -preset veryfast \
  -crf 18 \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  source_clip.mp4
```

优点：

- 更接近帧精确。
- MP4/H.264/AAC 兼容性更好。
- 更适合 Seedance 2.0 或外部视频编辑工具。

缺点：

- 更慢。
- 会重新编码。
- 文件大小可能变化。

推荐：

```text
第一版：统一 reencode_accurate，保证可复用和兼容性。
第二版：fast 模式可支持 stream_copy 预览，导出/正式片段仍使用 reencode_accurate。
```

---

## 5. 与切片阶段的关系

自动切片完成后：

```text
ShotDetectionResult
  → SourceSegment[]
  → write segment_manifest.json
  → generate source_clip.mp4
  → write segment_manifest_index.json
```

人工校准后：

```text
merge / split / manual adjust
  → normalize segments
  → regenerate affected source_clip.mp4
  → rewrite manifests
```

第一版可以全部重生成，逻辑简单可靠。第二版做增量：

```text
如果 sourceVideoPath + startMs + endMs + mode 没变，则跳过重生成。
```

可用 `clip_metadata.json` 记录 hash：

```json
{
  "sourceVideoPath": "/abs/source.mp4",
  "startMs": 1000,
  "endMs": 4200,
  "durationMs": 3200,
  "mode": "reencode_accurate",
  "generatedAt": "...",
  "ffmpegArgs": ["..."],
  "fileSizeBytes": 1234567
}
```

---

## 6. 错误处理

### 6.1 单段失败

如果单个 segment 裁切失败：

- 不应静默成功。
- segment 可保留，但 diagnostics 标记 clip 失败。
- `processingJob` 应失败还是部分成功，需要按阶段判断。

推荐第一版：

```text
任意 clip 生成失败 → segmentation job failed
```

原因：下游 Seedance / 关键帧 / 素材库都依赖 clip，部分缺失会造成更隐蔽的问题。

第二版可以允许部分成功，并标记 segment `needs_review`。

### 6.2 ffmpeg fallback

如果 reencode 失败，可尝试 stream copy：

```text
reencode_accurate failed
  → stream_copy retry
  → still failed: throw
```

但如果目标是 Seedance 兼容性，fallback 后应在 diagnostics 中注明裁切模式降级。

---

## 7. 片段导出

建议新增第二阶段功能：

```text
sceneForgeRemix:exportSourceSegmentClips
```

输入：

```ts
export interface ExportSourceSegmentClipsInput extends RemixSourceAssetRefInput {
  outputDir?: string | null;
  includeManifest?: boolean;
  includeKeyframes?: boolean;
  naming?: 'index_title' | 'index_time_range';
}
```

输出：

```ts
export interface ExportSourceSegmentClipsResult {
  outputDir: string;
  clipCount: number;
  manifestPath?: string | null;
}
```

导出文件命名示例：

```text
001_00-00-00-000_00-00-03-240.mp4
002_00-00-03-240_00-00-07-600.mp4
clips_manifest.json
```

`clips_manifest.json`：

```json
{
  "sourceAssetId": "...",
  "exportedAt": "...",
  "clips": [
    {
      "segmentId": "segment-001",
      "index": 1,
      "title": "片段 01",
      "startMs": 0,
      "endMs": 3240,
      "file": "001_00-00-00-000_00-00-03-240.mp4"
    }
  ]
}
```

---

## 8. 与关键帧的关系

当前关键帧服务后续也需要真实化。建议：

```text
关键帧 timestamp 仍以源视频绝对时间记录。
抽帧可以从源视频抽，避免 clip reencode 造成时间偏差。
source_clip.mp4 主要用于外部视频编辑和局部二创。
```

first/last 抽帧偏移建议：

```text
first: startMs + 100ms
middle: (startMs + endMs) / 2
last: endMs - 100ms
```

短片段要 clamp 到有效范围。

---

## 9. 验收标准

1. 运行切片后，每个 segment 目录下存在真实 `source_clip.mp4`。
2. `source_clip.mp4` 时长与 `segment.timeRange.durationMs` 基本一致，允许少量编码误差。
3. 人工合并/拆分后，旧 clip 不会错误复用。
4. 导出的片段可以被本地播放器打开。
5. 片段可以作为 Seedance 2.0 输入素材。
6. clip 生成失败时，用户能看到明确错误，而不是继续进入后续阶段。
