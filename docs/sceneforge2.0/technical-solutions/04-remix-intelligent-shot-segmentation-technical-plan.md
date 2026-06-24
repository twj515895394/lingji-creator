# 04 - Remix 智能分镜切片技术方案

日期：2026-06-24  
适用分支：`sceneforge2.0-remix`  
对应问题：P0-06  
主目标：解决当前视频切片“傻乎乎乱切”的问题，让切片结果尽量贴合真实分镜边界，并提供可解释、可校准、可回归的技术闭环。

---

## 1. 背景

用户预期的“视频切片”不是按固定时长粗暴切分，也不是随机生成几个片段，而是根据实际视频画面中的真实镜头边界进行分镜切分。

如果分镜切片不准确，会直接影响：

1. 关键帧提取。
2. 原片理解。
3. 人工标注。
4. Remix Design。
5. 关键帧改图 Prompt。
6. Seedance 视频提示词。

因此，分镜切片必须作为 Remix 资产处理链的核心能力来做，而不是当成一个简单按钮。

---

## 2. 术语定义

| 术语 | 含义 |
|------|------|
| Shot / 镜头 | 连续拍摄的一段画面，通常没有剪辑切换 |
| Shot Boundary / 镜头边界 | 两个镜头之间的切换点 |
| Hard Cut / 硬切 | 相邻帧突然切换 |
| Gradual Transition / 渐变切换 | 淡入淡出、叠化、擦除等慢切换 |
| Segment / 镜头段 | 系统输出给 UI 的可管理片段 |
| Scene / 场景 | 语义上的一组镜头，不一定等于单个镜头 |

本项目当前“切片”更准确应叫：**智能分镜切片 / Shot Boundary Detection**。

---

## 3. 总体方案

不要只用一个算法。推荐四层结构：

```text
视频预处理
  ↓
候选边界检测（FFmpeg / PySceneDetect）
  ↓
模型精修（TransNetV2 / AutoShot 可选）
  ↓
规则约束与置信度融合
  ↓
人工校准与回写
```

关键原则：

- 先检测真实视觉边界，再生成 segment。
- LLM/VLM 只做语义命名、合并建议、低置信度解释，不直接凭空决定边界。
- 所有边界都要有 `confidence`、`source`、`reason`。
- UI 必须允许人工合并、拆分、微调边界。

---

## 4. 第一层：视频预处理

输入：`sourceVideoPath`

步骤：

1. 使用 `ffprobe` 读取基础信息：duration、fps、width、height、codec。
2. 对长视频先做低分辨率采样，避免过慢。
3. 生成分析用帧序列：
   - 短视频：可按原 fps 或 12fps 分析。
   - 长视频：可降到 6fps 或 8fps。
4. 保留原始时间映射，保证边界能回写到真实时间戳。

输出：

```ts
interface SegmentationInputProfile {
  durationMs: number;
  fps: number;
  analysisFps: number;
  width: number;
  height: number;
  frameCount: number;
}
```

---

## 5. 第二层：候选边界检测

### 5.1 PySceneDetect 快速模式

推荐默认使用 PySceneDetect 的 `AdaptiveDetector` 或 `ContentDetector` 作为快速候选边界检测器。

- `ContentDetector` 基于 HSV 色彩空间中相邻帧变化检测快速切换。
- `AdaptiveDetector` 在 ContentDetector 的基础上使用滚动平均，有助于缓解快速镜头运动带来的误检。
- `min_scene_len` 用于限制相邻切点的最小间隔，避免一段动作被碎切。

建议默认参数：

```yaml
mode: fast
backend: pyscenedetect
algorithm: adaptive
adaptive_threshold: 3.0
min_scene_len: 0.6s
min_content_val: 15.0
```

### 5.2 FFmpeg scene score 兜底模式

FFmpeg `select` 过滤器有 `scene` 值，可表示当前帧引入新场景的可能性，通常可用 `gt(scene,0.3~0.5)` 选择候选帧。

建议用途：

- 作为无 Python 环境时的兜底。
- 作为候选边界参考，不作为唯一真值。
- 用于快速生成缩略图和初步预览。

示例：

```bash
ffmpeg -i input.mp4 -vf "select='gt(scene,0.35)',showinfo" -f null -
```

---

## 6. 第三层：模型精修

### 6.1 TransNetV2 高精度模式

TransNetV2 是专门用于 Shot Boundary Detection 的深度网络，适合用于高精度分镜切分。

建议引入方式：

- 本地 Python worker 运行。
- Electron 主进程通过子进程调用。
- 首次可作为可选能力，不阻塞基础流程。

输出建议：

```ts
interface ModelBoundaryPrediction {
  timeMs: number;
  frameIndex: number;
  confidence: number;
  boundaryType: 'hard_cut' | 'gradual' | 'unknown';
  model: 'transnetv2';
}
```

### 6.2 AutoShot / 短视频模型后续可选

如果项目主要处理短视频、二创视频、社媒素材，可以后续评估 AutoShot 类短视频 Shot Boundary Detection 模型。

建议不要一开始就追求最复杂模型，先建立可替换检测器接口。

---

## 7. 第四层：边界融合与规则约束

候选边界不能直接输出给用户，必须融合：

```text
PySceneDetect 边界
+ FFmpeg scene score
+ TransNetV2 模型边界
+ 最小时长约束
+ 最大时长软约束
+ 低置信度标记
= Segment 列表
```

### 7.1 融合规则

建议：

1. 时间距离小于 300ms 的边界合并为一个边界。
2. 多检测器命中的边界置信度提高。
3. 只有单一规则检测器命中的边界标记为 `medium` 或 `low`。
4. 小于 `minShotDurationMs` 的镜头段默认合并，除非置信度极高。
5. 大于 `maxShotDurationMs` 的片段不强切，只提示“可能需要人工检查”。

### 7.2 置信度计算示意

```ts
confidence = weightedSum({
  transnet: 0.55,
  pyscenedetect: 0.25,
  ffmpegScene: 0.15,
  rulePenalty: -0.10,
  manualOverride: 1.00,
});
```

### 7.3 输出 Segment 结构

```ts
interface SourceSegment {
  id: string;
  title: string;
  timeRange: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  boundary: {
    startConfidence: number;
    endConfidence: number;
    startSource: string[];
    endSource: string[];
    boundaryType: 'hard_cut' | 'gradual' | 'manual' | 'inferred';
  };
  reviewStatus: 'auto' | 'needs_review' | 'approved' | 'manual_adjusted';
  keyframes: SourceKeyframe[];
}
```

---

## 8. VLM / LLM 的正确使用方式

VLM/LLM 不应该直接决定“第几秒切一刀”。它更适合：

1. 给每个镜头段生成标题。
2. 识别镜头内容：人物、动作、景别、情绪。
3. 对低置信度边界给出解释。
4. 建议相邻镜头是否语义上应合并。
5. 为后续原片理解提供结构化文本。

示例：

```json
{
  "segmentId": "seg_003",
  "visualSummary": "男子从门口逼近，对方后退，形成压迫感。",
  "shotType": "近景/中近景",
  "motion": "人物前进，镜头基本稳定",
  "mergeSuggestion": null,
  "keepForRemix": true
}
```

---

## 9. UI 校准闭环

智能切片必须配套校准 UI，否则用户无法信任。

### 9.1 切片时间轴

每个边界显示：

- 时间点
- 置信度
- 来源：PySceneDetect / TransNetV2 / FFmpeg / Manual
- 是否需要人工确认

### 9.2 人工操作

必须支持：

- 点击边界跳转视频。
- 拖动边界微调。
- 合并相邻段。
- 在当前播放点拆分。
- 标记边界已确认。
- 重新运行切片，保留人工覆盖项。

### 9.3 低置信度提示

示例：

```text
检测到 12 个镜头段，其中 2 个边界置信度较低，建议人工核对。
```

---

## 10. 后端接口建议

### 10.1 runSourceSegmentation

```ts
runSourceSegmentation({
  projectDir,
  sourceAssetId,
  mode: 'fast' | 'accurate' | 'custom',
  detector?: 'pyscenedetect' | 'ffmpeg' | 'transnetv2' | 'hybrid',
  minShotDurationMs?: number,
  preserveManualEdits?: boolean,
})
```

### 10.2 updateSourceSegments

```ts
updateSourceSegments({
  projectDir,
  sourceAssetId,
  segments,
  reason: 'manual_adjust' | 'merge' | 'split' | 'rerun',
})
```

### 10.3 getSegmentationDiagnostics

```ts
getSegmentationDiagnostics({
  projectDir,
  sourceAssetId,
})
```

返回检测器分数、低置信度边界、错误信息等。

---

## 11. 存储建议

```text
.sceneforge/remix/source-assets/{sourceAssetId}/
  source.json
  segmentation/
    run-20260624-203000.json
    diagnostics.json
    manual-overrides.json
  keyframes/
    seg_001_first.jpg
    seg_001_last.jpg
```

`source.json` 只保存当前有效 segments；历史检测结果进入 `segmentation/run-*.json`。

---

## 12. 实施路线

### Phase 1：去掉傻切

- 接入 PySceneDetect AdaptiveDetector。
- 加 `min_scene_len`。
- 输出置信度和检测来源。
- UI 展示低置信度提示。

### Phase 2：可校准

- 时间轴支持点击跳转。
- 支持人工合并、拆分、微调边界。
- 保存 manual overrides。

### Phase 3：高精度模型

- 引入 TransNetV2 worker。
- 增加 accurate 模式。
- 与 PySceneDetect/FFmpeg 结果融合。

### Phase 4：语义增强

- VLM 给镜头段命名。
- LLM 生成镜头段摘要。
- 为原片理解和二创提示词消费。

---

## 13. 评测与回归

必须建立小型 ground truth：

```text
tests/fixtures/remix-segmentation/
  video-001.mp4
  video-001.expected-segments.json
  video-002.mp4
  video-002.expected-segments.json
```

指标：

- 边界误差容忍：±500ms。
- Precision：检测边界中有多少是真的。
- Recall：真实边界中有多少被检测到。
- F1：综合指标。
- 人工调整次数：越少越好。

验收目标：

- 普通硬切视频：主要边界基本正确。
- 快速运动视频：不过度碎切。
- 渐变/淡入淡出：至少标记为低置信度待确认。
- 低置信度边界能在 UI 中被人工校准。

---

## 14. 参考资料

- PySceneDetect Detectors 文档：`https://www.scenedetect.com/docs/latest/api/detectors.html`
- FFmpeg select/scene 文档：`https://ffmpeg.org/ffmpeg-filters.html`
- TransNetV2 论文：`https://arxiv.org/abs/2008.04838`
- TransNetV2 GitHub：`https://github.com/soCzech/TransNetV2`
- AutoShot 论文：`https://arxiv.org/abs/2304.06116`

---

## 15. 一句话

Remix 的切片不能再是“按时间或弱规则切几段”，必须升级为 **检测真实镜头边界 + 模型精修 + 人工校准** 的工作流。否则后续关键帧、原片理解和二创生成都会建立在错误分段上。
