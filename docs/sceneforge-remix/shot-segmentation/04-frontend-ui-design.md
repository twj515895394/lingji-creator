# 前端 UI 设计：分镜检测与片段产物

> 本文定义 Remix 资产处理工作台在接入真实检测和真实分镜视频片段后，前端需要展示和新增的交互。

---

## 1. 设计原则

1. 第一阶段尽量不打断现有 UI：当前快速/高精、最小镜头长度、保留人工校准已经足够。
2. 用户关心的是“切出来是否能用”，所以 UI 需要展示片段生成状态，而不是只展示 detector 名称。
3. 高精模型不可用时不能把用户卡死，应提示已降级快速模式。
4. 分镜视频片段是核心资产，必须有打开、查看、导出入口。

---

## 2. 当前已有 UI

`RemixAssetProcessing.tsx` 已有：

- 快速模式 / 高精模式 segmented control。
- 最小镜头长度下拉：精细、均衡、较粗。
- 运行切片按钮。
- 重跑时保留人工校准 checkbox。
- diagnostics summary。
- SegmentTimeline。
- SegmentTable。
- 视频预览。
- 合并当前段与下一段。
- 在当前播放点拆分。
- 确认当前边界。

因此第一阶段主要是补文案和状态，不需要大规模重构布局。

---

## 3. 切片步骤 UI 调整

### 3.1 模式说明

tooltip 更新：

```text
快速模式：使用 PySceneDetect AdaptiveDetector 快速检测镜头变化，适合预览和普通素材。
高精模式：使用 TransNetV2 深度模型检测镜头边界，适合复杂剪辑和短镜头密集素材。
```

### 3.2 diagnostics summary

当前 summary 应升级为：

```text
快速模式 · PySceneDetect AdaptiveDetector · 32 个镜头段 · 32 个片段视频已生成 · 用时 3.2s
```

高精：

```text
高精模式 · TransNetV2 · 41 个镜头段 · 41 个片段视频已生成 · 用时 8.7s
```

fallback：

```text
高精模式已降级 · PySceneDetect AdaptiveDetector · 原因：未找到 TransNetV2 模型权重 · 36 个片段视频已生成
```

clip 失败：

```text
切片完成，但 2 个分镜视频片段生成失败，请重新生成片段或查看错误。
```

第一版如果 diagnostics 类型未扩展，可从 `notes` 中拼 summary。

---

## 4. SegmentTable 调整

每行建议增加一列或状态徽章：

```text
片段视频：已生成 / 生成失败 / 待生成
```

行级操作：

- `播放片段`：优先播放 `source_clip.mp4`，如果不存在则回退源视频时间段预览。
- `打开片段`：调用 shell 打开当前 `source_clip.mp4`。
- `在文件夹中显示`：打开 segment 目录。

第一阶段可以只做全局入口，不必每行都加按钮，避免表格拥挤。

---

## 5. 当前段操作区

在现有按钮组旁增加：

```text
打开当前片段
在文件夹中显示
```

显示条件：

```text
activePreviewSegment 存在
sourceClipPath 存在且 media validation 通过
```

如果 clip 不存在：

```text
当前片段视频尚未生成
```

并提供：

```text
重新生成片段视频
```

该按钮可第二阶段实现。

---

## 6. 导出全部分镜片段

第二阶段在切片步骤顶部增加：

```text
导出全部分镜片段
```

点击后：

1. 选择输出目录。
2. 调用 `sceneForgeRemix:exportSourceSegmentClips`。
3. 复制所有 `source_clip.mp4` 到目标目录。
4. 生成 `clips_manifest.json`。
5. 可选包含关键帧。

导出命名示例：

```text
001_00-00-00-000_00-00-03-240.mp4
002_00-00-03-240_00-00-07-600.mp4
clips_manifest.json
```

导出完成提示：

```text
已导出 32 个分镜片段，可直接用于 Seedance 2.0 或其他视频编辑工具。
```

---

## 7. 视频预览策略

当前 SourceVideoPreview 基于源视频时间点预览。接入 clips 后有两种方式：

### 7.1 第一阶段：继续预览源视频

优点：

- 改动小。
- 播放头和全局时间轴一致。
- 人工拆分/合并逻辑不变。

### 7.2 第二阶段：支持当前片段预览

增加 toggle：

```text
预览源视频 / 预览当前分镜片段
```

片段预览用于确认导出效果，源视频预览用于精确定位全局边界。

推荐第一阶段继续源视频预览，先保证产物生成。

---

## 8. 高精模型环境提示

如果 diagnostics 表示高精降级：

```text
高精模型未就绪，已自动使用快速模式完成切片。
```

可提供次级入口：

```text
查看配置说明
```

不要在主界面直接暴露 Python、torch、模型路径等复杂配置；这些后续应进入设置页或开发者诊断页。

---

## 9. Progress UI

第一阶段可维持当前 pending 状态：

```text
处理中…
```

第二阶段增加阶段进度：

```text
正在检测镜头边界
正在生成分镜视频片段 12/32
正在写入片段索引
```

对应事件：

```ts
interface RemixSegmentationProgressPayload {
  sourceAssetId: string;
  phase:
    | 'detecting'
    | 'building_segments'
    | 'generating_clips'
    | 'writing_artifacts'
    | 'validating';
  current?: number;
  total?: number;
  percent?: number;
  message: string;
}
```

---

## 10. UI 分阶段实施

### Phase 1

- 更新快速/高精 tooltip。
- diagnostics summary 支持 detector/fallback/clip 信息。
- 切片完成后提示片段视频已生成。

### Phase 2

- 当前段增加“打开当前片段 / 在文件夹中显示”。
- SegmentTable 显示片段状态。
- 新增重新生成片段视频按钮。

### Phase 3

- 新增“导出全部分镜片段”。
- 导出完成提示和打开导出目录。

### Phase 4

- 增加阶段进度事件。
- 增加源视频/当前片段预览切换。

---

## 11. 验收标准

1. 用户能理解快速/高精模式真实差异。
2. 用户能知道分镜片段视频是否已生成。
3. 用户可以打开或导出生成的片段。
4. 高精 fallback 不造成失败恐慌，提示清晰。
5. 片段生成失败时，前端能显示具体失败状态，而不是只显示“切片失败”。
