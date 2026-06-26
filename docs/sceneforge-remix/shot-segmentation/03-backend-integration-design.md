# TS 后端整合设计

> 本文定义 Electron/TypeScript 后端如何把检测 Worker、SourceSegment 构造、分镜视频片段生成和 Remix store 串成完整切片流程。

---

## 1. 当前后端链路

当前链路：

```text
remix-ipc.ts
  → RemixService.runSourceSegmentation(input)
  → RemixSegmentationService.run(projectDir, sourceAssetId, options)
  → buildCandidateBoundaries() 当前模拟
  → buildSegmentsFromCandidates()
  → writeSegmentArtifacts()
  → writeStoredSourceAsset()
```

目标链路：

```text
RemixSegmentationService.run()
  → readStoredSourceAsset()
  → assert source video exists
  → preserve manual override?
      yes → use manual segments
      no  → runShotDetector()
             → buildSegmentsFromDetectionResult()
  → SegmentClipService.generateClips()
  → write segment manifests + index
  → update sourceAsset.segments / diagnostics / stage states
  → writeStoredSourceAsset()
```

---

## 2. 需要新增的 TS 模块

```text
electron/sceneforge/remix/shot-detection/
  shot-detector-types.ts
  shot-detector-runner.ts
  python-runtime-resolver.ts
  model-path-resolver.ts
  shot-boundary-normalizer.ts


electron/sceneforge/remix/segment-clips/
  segment-clip-service.ts
  segment-clip-types.ts
  segment-clip-exporter.ts       # Phase 2


electron/sceneforge/remix/remix-segmentation-service.ts
  改造调用链
```

---

## 3. RemixSegmentationService 改造

### 3.1 当前入口保持不变

```ts
async run(
  projectDir: string,
  sourceAssetId: string,
  options: RunSegmentationOptions = {},
): Promise<StoredSourceAssetDocument>
```

### 3.2 核心流程伪代码

```ts
const document = await readStoredSourceAsset(projectDir, sourceAssetId);
await assertFileExists(document.sourceAsset.sourceVideoPath, '原片视频');

const mode = options.mode ?? 'fast';
const preserveManualEdits = options.preserveManualEdits ?? true;
const minShotDurationMs = Math.max(
  600,
  options.minShotDurationMs ?? (mode === 'accurate' ? 1200 : 1800),
);

const preservedSegments = this.applyManualOverrideIfNeeded(document, preserveManualEdits);

let detectionResult: ShotDetectionResult | null = null;
let segments: SourceSegment[];
let lowConfidenceSegmentIds: string[];

if (preservedSegments) {
  segments = normalizePreservedSegments(preservedSegments);
  lowConfidenceSegmentIds = collectLowConfidence(segments);
} else {
  detectionResult = await runShotDetector({
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

  ({ segments, lowConfidenceSegmentIds } = buildSegmentsFromDetectionResult(
    sourceAssetId,
    document.sourceAsset.videoMetadata.durationMs,
    detectionResult,
    minShotDurationMs,
  ));
}

await writeSegmentManifests(projectDir, sourceAssetId, segments);
await segmentClipService.generateClips({
  projectDir,
  sourceVideoPath: document.sourceAsset.sourceVideoPath,
  sourceAssetId,
  segments,
  mode: mode === 'accurate' ? 'reencode_accurate' : 'reencode_accurate',
  overwrite: true,
});
await writeSegmentManifestIndex(projectDir, sourceAssetId, segments);
```

第一版可以继续复用 `writeSegmentArtifacts()` 名称，但内部职责应拆清楚。

---

## 4. buildSegmentsFromDetectionResult

### 4.1 输入

```ts
function buildSegmentsFromDetectionResult(
  sourceAssetId: string,
  durationMs: number,
  detection: ShotDetectionResult,
  minShotDurationMs: number,
): { segments: SourceSegment[]; lowConfidenceSegmentIds: string[] }
```

### 4.2 scenes 归一化

需要保证：

1. 第一段从 `0` 开始。
2. 最后一段到 `durationMs` 结束。
3. 段之间 contiguous，不重叠，不留空洞。
4. `endMs > startMs`。
5. 过短段按策略合并或标记 `needs_review`。

### 4.3 SourceSegment 构造

```ts
const segment: SourceSegment = {
  id: `segment-${String(index + 1).padStart(3, '0')}`,
  sourceAssetId,
  index: index + 1,
  title: buildSegmentTitle(index + 1, duration, reviewStatus),
  boundaryType,
  timeRange: { startMs, endMs, durationMs: endMs - startMs },
  boundary: {
    startConfidence,
    endConfidence,
    startSources,
    endSources,
    boundaryType: endBoundaryKind,
  },
  reviewStatus,
  sourceClipPath: getRemixSegmentClipPath(sourceAssetId, segmentId),
  keyframes: [],
  semantic: buildSemanticDetails(...),
  analysisMarkdownPath: null,
  analysisJsonPath: null,
};
```

---

## 5. Diagnostics 改造

当前 diagnostics 只有：

```ts
mode;
detector: 'adaptive' | 'hybrid';
inputProfile;
lowConfidenceSegmentIds;
notes;
usedFallback;
preserveManualEdits;
generatedAt;
```

建议扩展：

```ts
export interface RemixSegmentationDiagnostics {
  mode: RemixSegmentationMode;
  detector:
    | 'pyscenedetect_adaptive'
    | 'transnetv2'
    | 'hybrid_fallback'
    | 'adaptive'
    | 'hybrid';
  inputProfile: RemixSegmentationInputProfile;
  lowConfidenceSegmentIds: string[];
  notes: string[];
  usedFallback: boolean;
  fallbackReason?: string | null;
  preserveManualEdits: boolean;
  generatedAt: string;
  detectionMetrics?: {
    elapsedMs?: number;
    frameCount?: number;
    modelDevice?: string;
    rawBoundaryCount?: number;
    filteredBoundaryCount?: number;
  } | null;
  clipGeneration?: {
    mode: 'stream_copy' | 'reencode_accurate';
    totalCount: number;
    successCount: number;
    failedCount: number;
    elapsedMs?: number;
  } | null;
}
```

第一版如果担心类型影响测试，可以先把新增信息写入 `notes`，后续再扩类型。

---

## 6. writeSegmentArtifacts 拆分

建议从单函数拆成：

```ts
async function resetSegmentArtifactsDir(...)
async function writeSegmentManifests(...)
async function writeSegmentManifestIndex(...)
async function writeSegmentArtifacts(...) {
  await resetSegmentArtifactsDir(...);
  await writeSegmentManifests(...);
  await segmentClipService.generateClips(...);
  await writeSegmentManifestIndex(...);
}
```

注意：

- 自动切片重跑可以清空整个 `source_segments` 目录。
- 人工校准时，如果未来想保留可复用 clip，需要做增量；第一版可全量重建。
- clip 生成失败要抛错，让 processing job failed。

---

## 7. updateSourceSegments 改造

当前人工合并/拆分会调用 `updateSourceSegments()`。改造后它也必须生成真实 clips。

流程：

```text
updateSourceSegments(input)
  → normalize manual segments
  → document.sourceAsset.segments = normalizedSegments
  → manualSegmentationOverride = {...}
  → writeSegmentArtifacts(..., normalizedSegments)
      → generate source_clip.mp4
  → validateSourceAssetMedia
  → snapshot
```

这样可确保用户手动调整后，下游视频片段总是同步的。

---

## 8. 新增 IPC 建议

第一阶段无需新增 IPC。

第二阶段新增：

```text
sceneForgeRemix:regenerateSourceSegmentClips
sceneForgeRemix:exportSourceSegmentClips
sceneForgeRemix:openSourceSegmentClipFolder
```

### 8.1 regenerateSourceSegmentClips

用于 clip 生成失败后的单独修复。

```ts
interface RegenerateSourceSegmentClipsInput extends RemixSourceAssetRefInput {
  segmentIds?: string[];
  mode?: 'stream_copy' | 'reencode_accurate';
}
```

### 8.2 exportSourceSegmentClips

用于导出给 Seedance / 外部编辑。

```ts
interface ExportSourceSegmentClipsInput extends RemixSourceAssetRefInput {
  outputDir?: string | null;
  includeManifest?: boolean;
  includeKeyframes?: boolean;
}
```

---

## 9. 测试点

1. `runSourceSegmentation(fast)` 调用 detector mock，生成 segments 和 clips。
2. `runSourceSegmentation(accurate)` detector 抛错时 fallback 到 fast。
3. `updateSourceSegments(merge)` 后重新生成 clips。
4. clip 生成失败时 job 状态 failed。
5. preserveManualEdits=true 时不调用 detector，但仍确保 clips 存在/重生成。
6. diagnostics 包含 detector、fallback、clipGeneration。

---

## 10. 验收标准

1. `SourceSegment.sourceClipPath` 文件真实存在。
2. segment manifest 与 clip 文件一一对应。
3. 自动切片和人工校准后的文件都一致。
4. UI 刷新 snapshot 后能看到最新 segment 和 clip 状态。
5. 后端不把 Python/ffmpeg 错误吞掉，能进入 job failed 并显示原因。
