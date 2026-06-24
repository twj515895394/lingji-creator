# 05 - Remix 媒体预览、关键帧与缩略图可信度技术方案

日期：2026-06-24  
适用分支：`sceneforge2.0-remix`  
对应问题：P0-07、P0-04、P0-05  
主目标：解决资产库、处理页、关键帧图库中“看起来像有媒体，但实际可能是暗色占位或加载失败”的可信度问题。

---

## 1. 背景

录屏中，用户导入素材并执行关键帧提取后，界面显示了切片数和关键帧数，但部分关键帧区域仍然看起来像暗色占位。资产库卡片和右侧详情也依赖缩略图识别素材，如果缩略图不是稳定真实帧，资产库可信度会直接下降。

媒体预览不是装饰项，而是资产处理链路的验证基础：

- 视频预览用于确认导入的是不是正确素材。
- 切片时间轴用于确认边界是否准确。
- 关键帧用于确认每个镜头段是否有可引用画面。
- 资产卡缩略图用于快速识别已入库资产。

---

## 2. 设计原则

1. 媒体能显示就显示真实内容，不能显示就明确报错。
2. 不允许用暗色占位伪装成成功结果。
3. “关键帧已完成”必须与图片路径存在、文件可读、前端可加载绑定。
4. 缩略图生成失败必须进入资产状态或处理摘要，而不是只在 UI 空白。
5. 所有媒体路径都要经过项目内相对路径或安全 file URL 转换，不要在 UI 中直接展示长绝对路径。

---

## 3. 资产封面优先级

资产卡和详情侧栏封面按以下顺序选择：

1. 用户指定封面。
2. 第一段首帧关键帧。
3. 第一段中间帧关键帧。
4. 第一段尾帧关键帧。
5. 视频首帧截图缓存。
6. 明确 fallback：显示“暂无可用缩略图”，并提示原因。

不要直接显示无语义渐变封面。

---

## 4. 关键帧生成与验证

### 4.1 生成路径

建议每个 segment 至少生成：

```text
seg_001_first.jpg
seg_001_middle.jpg
seg_001_last.jpg
```

短片段可以只生成 first/last，但 UI 必须说明为什么没有 middle。

### 4.2 文件校验

生成关键帧后，后端需要校验：

- 文件是否存在。
- 文件大小是否大于最小阈值。
- 图片能否被解码。
- 图片尺寸是否合理。
- 图片路径是否能转换为前端可加载 URL。

建议输出：

```ts
interface KeyframeValidationResult {
  keyframeId: string;
  imagePath: string;
  exists: boolean;
  readable: boolean;
  width?: number;
  height?: number;
  error?: string;
}
```

---

## 5. 前端展示规则

### 5.1 KeyframeGallery

每张关键帧卡片必须显示：

- 真实图片。
- 角色：首帧 / 中间帧 / 尾帧。
- 时间点。
- 所属镜头段。
- 加载失败时的错误状态。

加载失败不应只显示空块，而应显示：

```text
关键帧加载失败
文件不存在或路径不可读
重新提取关键帧
```

### 5.2 SourceAssetThumbnail

封面组件需要区分以下状态：

| 状态 | UI |
|------|----|
| 有关键帧 | 显示关键帧图片 |
| 有视频但无关键帧 | 显示视频首帧 |
| 视频可读但首帧抓取失败 | 显示错误 fallback + 重试入口 |
| 视频路径为空 | 显示“缺少源视频路径” |
| 视频路径不可读 | 显示“源文件不可读” |

---

## 6. 后端接口建议

### 6.1 ensureSourceAssetThumbnail

```ts
ensureSourceAssetThumbnail({
  projectDir,
  sourceAssetId,
  strategy: 'first_keyframe' | 'video_first_frame' | 'auto',
})
```

返回：

```ts
{
  thumbnailPath: string | null,
  source: 'keyframe' | 'video_frame' | 'fallback',
  status: 'ready' | 'failed',
  error?: string
}
```

### 6.2 validateSourceAssetMedia

```ts
validateSourceAssetMedia({
  projectDir,
  sourceAssetId,
})
```

用于处理页加载时检查视频、关键帧、缩略图是否可用。

---

## 7. 存储建议

```text
.sceneforge/remix/source-assets/{sourceAssetId}/
  media/
    source.mp4 或 source-path.json
  thumbnails/
    cover.jpg
  keyframes/
    seg_001_first.jpg
    seg_001_middle.jpg
    seg_001_last.jpg
  media-validation.json
```

`media-validation.json` 记录最近一次媒体校验结果，便于 UI 快速提示。

---

## 8. UI 与状态联动

### 8.1 关键帧状态

关键帧步骤不能只看 `asset.segments[].keyframes.length`。

必须同时满足：

- keyframe 数量满足要求。
- 每个 required keyframe 的 imagePath 存在。
- 文件可读。
- 前端加载成功或后端校验成功。

### 8.2 资产库状态

资产卡显示“9 关键帧”时，如果其中有加载失败，应显示：

```text
9 张关键帧 · 2 张异常
```

点击可进入处理页修复。

---

## 9. 验收标准

- [ ] 关键帧图片加载失败时显示明确错误，不再是暗色占位。
- [ ] 资产卡封面优先使用真实关键帧。
- [ ] 没有关键帧时使用视频首帧作为封面。
- [ ] 视频路径不可读时，预览区显示明确错误和修复建议。
- [ ] “关键帧已完成”必须与图片可读绑定。
- [ ] 右侧详情栏不展示长绝对路径，只展示文件名和折叠技术信息。
- [ ] 刷新或重进项目后，缩略图仍可加载。

---

## 10. 实施顺序

1. 后端增加关键帧文件校验。
2. `RemixFrameImage` 增加错误 UI，不再返回空块。
3. `SourceAssetThumbnail` 增加状态分支和错误文案。
4. 增加 `ensureSourceAssetThumbnail`。
5. 资产卡增加异常关键帧提示。
6. E2E 增加：关键帧路径缺失、源视频缺失、缩略图回退三类用例。

---

## 11. 一句话

Remix 资产库不能靠“看起来像封面”的卡片建立可信度，必须让视频预览、关键帧和缩略图都成为真实、可校验、失败可解释的媒体能力。
