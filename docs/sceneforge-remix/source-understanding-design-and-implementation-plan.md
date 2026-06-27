# Remix 原片理解模块功能详细设计与实施计划

> 版本：v1.0（仓库迁入版）
> 适用项目：`lingji-creator / sceneforge2.0-remix`

---

## 仓库对齐说明（2026-06-26）

本文件由外部设计稿迁入。实施以**当前代码契约**为准：

- 分段视频：`sceneforge/remix/source-assets/<id>/source_segments/<segmentId>/source_clip.mp4`
- 关键帧：`first_frame.png` / `middle_frame.png` / `last_frame.png`
- 全片摘要路径：`analysis/source_overview.*`、`analysis/segment_analysis.*`（当前为占位实现）
- 每段 `segment_understanding.json`、Remix 专用分段 ASR：**尚未实现**

PRD / issues：`.scratch/sceneforge-remix-source-understanding/`  
- **Issue 总索引**：`.scratch/sceneforge-remix-source-understanding/ISSUE_INDEX.md`
- 留档索引：`.scratch/sceneforge-remix-source-understanding/DESIGN_ARCHIVE.md`（含 M1.5 台词双路径）

---


## 1. 背景与问题

当前 Remix 资产入库流程中已经存在以下阶段：

1. 导入原片
2. 真实镜头切片
3. 关键帧提取
4. 原片理解
5. 人工标注
6. 保存入库

从当前测试现象看，前端已经有“原片理解”阶段入口和状态展示，但该阶段实际表现更像是“状态推进 + 切片统计汇总”。点击「生成原片理解」后，页面只是把阶段状态改成完成，并没有生成真正的片段级原片理解内容。

当前页面展示内容主要包括：

- 素材时长
- 画面规格
- 镜头分段数量
- 关键帧数量
- 音频情况
- 标签状态
- 每个片段的边界类型、关键帧位置、泛化说明

这些内容属于“素材检测结果”或“切片/关键帧摘要”，并不是可用于二创复原的视频语义资产。

本模块需要补齐真正的“原片理解”能力：对每个切片片段进行画面、动作、镜头、人物、环境、情绪、台词、音频、剧情功能、二创复用点、视频模型提示词等维度的结构化分析。

---

## 2. 产品目标

### 2.1 核心目标

「原片理解」模块的核心目标不是简单总结原片，而是将原片拆分后的每一个镜头/片段转换为可复用的结构化片段资产。

每个片段都应具备：

- 实际画面内容记录
- 人物与动作描述
- 场景、道具、构图、光线、色调描述
- 镜头语言与剪辑功能分析
- 台词/对白/旁白识别
- 环境声、音乐、语气、停顿等音频线索
- 剧情功能和情绪变化
- 二创时应该保留、替换、改写的元素
- 可直接用于视频模型生成/复原的 prompt-ready 描述词

### 2.2 用户价值

用户在完成原片理解后，可以：

1. 快速知道原片每个片段具体发生了什么。
2. 基于 AI 生成的片段理解进行人工修正。
3. 将每个片段保存为可复用的二创素材。
4. 后续在二创工作台中按“动作、情绪、镜头、场景、台词、复用价值”检索素材。
5. 直接使用片段级视频提示词在视频模型中复原或改写片段。
6. 将原片镜头结构、表演节奏、台词节奏、情绪变化迁移到新场景中。

### 2.3 设计原则

1. **产物优先**：每个阶段必须落盘真实产物，不能只更新状态。
2. **片段优先**：原片理解的最小分析单元是 segment，不是整片摘要。
3. **多模态上下文优先**：每段理解需要组合视频片段、关键帧、音频、ASR 文本、上下文信息。
4. **可复用优先**：产物需要能被人工标注、资产库检索、二创生成复用。
5. **可重跑优先**：ASR、关键帧、单段理解都要支持独立重跑。
6. **校验优先**：状态完成必须依赖产物校验，不能点击即完成。

---

## 3. 非目标与边界

本阶段不是：

- 仅仅把阶段状态改成完成；
- 仅仅展示镜头切片数量和关键帧数量；
- 仅仅给全片生成一句摘要；
- 仅仅做标签分类；
- 仅仅做剪辑建议；
- 只靠首帧判断片段内容；
- 只靠视频时间段，不保存中间产物。

本阶段也不应承担最终视频生成职责。它只负责生成可被视频生成模块使用的结构化理解结果和 prompt-ready 描述。

---

## 4. 总体流程设计

完整链路如下：

```txt
原片导入
  ↓
基础元数据提取
  - 时长
  - 分辨率
  - 帧率
  - 音轨信息
  - 编码信息
  ↓
真实镜头切片
  - 生成 segment 时间范围
  - 切出每段 clip.mp4
  - 生成 segments/index.json
  - 生成每段 segment.json
  ↓
关键帧提取
  - 每段提取 start / middle / end 帧
  - 可选提取 representative frames
  - 保存 frames/*.jpg
  - 更新 segment.json
  ↓
音频抽取与分段缓存
  - 抽取全片 source_audio.wav
  - 切出每段 seg_xxx_audio.wav
  - 更新 segment.json
  ↓
ASR 识别与对齐
  - 全片 ASR
  - 按 segment 时间范围切分台词
  - 保存 source_transcript.json
  - 保存 seg_xxx_transcript.json
  ↓
原片理解
  - 读取 segment clip / frames / transcript / metadata
  - 调用多模态 LLM 或图片组 + 文本 LLM
  - 生成每段 segment_understanding.json
  - 生成全片 original_understanding.json
  ↓
人工标注
  - 在 AI 理解结果基础上修正、补充、确认
  ↓
保存入库
  - 将片段理解、标注、媒体文件、提示词保存为可检索资产
```

---

## 5. 数据产物与目录结构设计

### 5.1 资产根目录

建议每个 source asset 形成独立目录，所有中间产物都在该目录下组织。

```txt
remix/
  source-assets/
    source_001/
      original/
        source.mp4
        source_metadata.json
        source_audio.wav
        source_transcript.json

      segments/
        index.json

        seg_001/
          segment.json
          clip.mp4

          frames/
            seg_001_t0000.00_start.jpg
            seg_001_t0005.20_mid.jpg
            seg_001_t0010.40_end.jpg
            seg_001_t0003.20_rep_01.jpg
            seg_001_t0007.80_rep_02.jpg

          audio/
            seg_001_audio.wav
            seg_001_transcript.json
            seg_001_audio_features.json

          understanding/
            seg_001_understanding.json

        seg_002/
          segment.json
          clip.mp4
          frames/
          audio/
          understanding/

      understanding/
        original_understanding.json
        original_understanding_summary.md

      annotations/
        seg_001.annotation.json
        seg_002.annotation.json

      export/
        asset_bundle.json
```

### 5.2 命名规范

必须保证中间产物可以直观看出来源和用途。

#### segment ID

```txt
seg_001
seg_002
seg_003
...
```

统一使用 3 位或 4 位补零。建议 MVP 使用 3 位，若长视频可能超过 999 段，则使用 4 位。

#### 视频片段

```txt
segments/seg_001/clip.mp4
```

如果需要更明确，也可以命名为：

```txt
segments/seg_001/seg_001_clip.mp4
```

建议目录已经包含 segmentId 时，文件名可简洁为 `clip.mp4`，但在需要批量导出时可生成带 segmentId 的副本。

#### 关键帧

```txt
seg_001_t0000.00_start.jpg
seg_001_t0005.20_mid.jpg
seg_001_t0010.40_end.jpg
seg_001_t0003.20_rep_01.jpg
```

字段含义：

```txt
seg_001      第 1 个分段
t0005.20     原片时间点或片段内时间点，需要在 manifest 中明确
mid          中间帧
rep_01       代表帧 1
```

建议时间戳使用原片绝对时间 `sourceTimeSec`，同时在 manifest 里记录 `relativeTimeSec`。

#### 音频

```txt
original/source_audio.wav
segments/seg_001/audio/seg_001_audio.wav
segments/seg_001/audio/seg_001_transcript.json
segments/seg_001/audio/seg_001_audio_features.json
```

#### 理解结果

```txt
segments/seg_001/understanding/seg_001_understanding.json
understanding/original_understanding.json
```

---

## 6. Manifest 设计

### 6.1 source_metadata.json

```json
{
  "sourceAssetId": "source_001",
  "originalFileName": "input.mp4",
  "sourcePath": "original/source.mp4",
  "durationSec": 124.32,
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "videoCodec": "h264",
  "audioCodec": "aac",
  "hasAudio": true,
  "createdAt": "2026-06-26T00:00:00.000Z",
  "updatedAt": "2026-06-26T00:00:00.000Z"
}
```

### 6.2 segments/index.json

```json
{
  "sourceAssetId": "source_001",
  "version": 1,
  "segmentationMethod": "shot-detection-v1",
  "segmentCount": 26,
  "segments": [
    {
      "segmentId": "seg_001",
      "index": 1,
      "path": "segments/seg_001/segment.json",
      "startSec": 0,
      "endSec": 10.4,
      "durationSec": 10.4,
      "status": {
        "clipGenerated": true,
        "framesExtracted": true,
        "audioExtracted": true,
        "asrAligned": true,
        "understandingGenerated": false
      }
    }
  ]
}
```

### 6.3 segment.json

每个片段的统一索引文件。

```json
{
  "segmentId": "seg_001",
  "index": 1,
  "sourceAssetId": "source_001",
  "timeRange": {
    "sourceStartSec": 0,
    "sourceEndSec": 10.4,
    "durationSec": 10.4
  },
  "clip": {
    "path": "segments/seg_001/clip.mp4",
    "exists": true
  },
  "frames": {
    "start": {
      "path": "segments/seg_001/frames/seg_001_t0000.00_start.jpg",
      "sourceTimeSec": 0,
      "relativeTimeSec": 0
    },
    "middle": [
      {
        "path": "segments/seg_001/frames/seg_001_t0005.20_mid.jpg",
        "sourceTimeSec": 5.2,
        "relativeTimeSec": 5.2
      }
    ],
    "end": {
      "path": "segments/seg_001/frames/seg_001_t0010.40_end.jpg",
      "sourceTimeSec": 10.4,
      "relativeTimeSec": 10.4
    },
    "representative": [
      {
        "path": "segments/seg_001/frames/seg_001_t0003.20_rep_01.jpg",
        "sourceTimeSec": 3.2,
        "relativeTimeSec": 3.2,
        "reason": "clear_character_expression"
      }
    ]
  },
  "audio": {
    "path": "segments/seg_001/audio/seg_001_audio.wav",
    "exists": true,
    "sourceStartSec": 0,
    "sourceEndSec": 10.4,
    "durationSec": 10.4,
    "hasSpeech": true,
    "transcriptPath": "segments/seg_001/audio/seg_001_transcript.json",
    "featuresPath": "segments/seg_001/audio/seg_001_audio_features.json"
  },
  "processing": {
    "segmentation": {
      "status": "completed",
      "completedAt": "2026-06-26T00:00:00.000Z"
    },
    "keyframes": {
      "status": "completed",
      "completedAt": "2026-06-26T00:00:00.000Z"
    },
    "audio": {
      "status": "completed",
      "completedAt": "2026-06-26T00:00:00.000Z"
    },
    "asr": {
      "status": "completed",
      "completedAt": "2026-06-26T00:00:00.000Z"
    },
    "understanding": {
      "status": "pending",
      "completedAt": null,
      "outputPath": "segments/seg_001/understanding/seg_001_understanding.json"
    }
  }
}
```

---

## 7. 音频与 ASR 设计

### 7.1 是否需要分段音频

需要。分段音频是原片理解的重要输入，也是后续人工标注和片段复原的重要中间产物。

即使默认 ASR 采用“全片 ASR + 分段对齐”，仍建议保存每段音频，原因如下：

1. 可以单独重跑某段 ASR。
2. 可以用于语气、音量、停顿、节奏分析。
3. 可以在人工标注阶段直接回听该片段。
4. 可以为后续视频模型/音频模型提供原始节奏参考。
5. 可以作为独立片段资产的一部分入库。

### 7.2 ASR 推荐流程

默认流程：

```txt
1. 从原片抽取 source_audio.wav
2. 对 source_audio.wav 做一次全片 ASR
3. 得到 source_transcript.json
4. 根据 segment 的 sourceStartSec / sourceEndSec 对齐拆分
5. 为每段生成 seg_xxx_transcript.json
```

补救流程：

```txt
当某段 transcript 为空、置信度低、切分不准、多人对话混乱时：
  对 seg_xxx_audio.wav 单独重跑 ASR
```

### 7.3 source_transcript.json

```json
{
  "sourceAssetId": "source_001",
  "language": "zh",
  "provider": "asr-provider-name",
  "mode": "full_source_asr",
  "items": [
    {
      "id": "utt_001",
      "speaker": "speaker_1",
      "startSec": 0.42,
      "endSec": 2.9,
      "text": "这里是台词内容",
      "confidence": 0.91
    }
  ],
  "plainText": "完整台词文本"
}
```

### 7.4 seg_xxx_transcript.json

```json
{
  "segmentId": "seg_001",
  "sourceAssetId": "source_001",
  "language": "zh",
  "source": "aligned_from_full_asr",
  "items": [
    {
      "sourceUtteranceId": "utt_001",
      "speaker": "speaker_1",
      "text": "这里是本段台词",
      "sourceStartSec": 1.2,
      "sourceEndSec": 3.8,
      "relativeStartSec": 1.2,
      "relativeEndSec": 3.8,
      "confidence": 0.91
    }
  ],
  "plainText": "这里是本段台词",
  "quality": {
    "hasSpeech": true,
    "avgConfidence": 0.91,
    "needsReview": false
  }
}
```

### 7.5 audio_features.json

MVP 可先做轻量音频特征：

```json
{
  "segmentId": "seg_001",
  "durationSec": 10.4,
  "hasSpeech": true,
  "speechRatio": 0.62,
  "avgVolumeDb": -18.3,
  "peakVolumeDb": -4.2,
  "silenceRanges": [
    {
      "relativeStartSec": 0,
      "relativeEndSec": 0.8
    }
  ],
  "musicDetected": false,
  "ambientDetected": true
}
```

---

## 8. 原片理解产物设计

### 8.1 全片理解 original_understanding.json

```json
{
  "sourceAssetId": "source_001",
  "version": 1,
  "generatedAt": "2026-06-26T00:00:00.000Z",
  "inputRefs": {
    "metadataPath": "original/source_metadata.json",
    "segmentsIndexPath": "segments/index.json",
    "sourceTranscriptPath": "original/source_transcript.json"
  },
  "overall": {
    "summary": "原片整体内容理解",
    "storyArc": "剧情推进结构",
    "visualStyle": "视觉风格、色调、影像质感",
    "mainCharacters": [
      {
        "characterId": "char_001",
        "name": "人物A",
        "appearance": "外貌与服装描述",
        "role": "剧情角色"
      }
    ],
    "mainConflict": "核心冲突",
    "emotionCurve": "情绪变化曲线",
    "remixPotential": [
      "适合改写成职场谈判",
      "适合保留人物反应镜头"
    ]
  },
  "segmentRefs": [
    {
      "segmentId": "seg_001",
      "understandingPath": "segments/seg_001/understanding/seg_001_understanding.json"
    }
  ],
  "quality": {
    "segmentCount": 26,
    "understoodSegmentCount": 26,
    "failedSegmentCount": 0,
    "needsHumanReview": true
  }
}
```

### 8.2 片段理解 seg_xxx_understanding.json

```json
{
  "segmentId": "seg_001",
  "sourceAssetId": "source_001",
  "version": 1,
  "generatedAt": "2026-06-26T00:00:00.000Z",
  "inputRefs": {
    "segmentPath": "segments/seg_001/segment.json",
    "clipPath": "segments/seg_001/clip.mp4",
    "framePaths": [
      "segments/seg_001/frames/seg_001_t0000.00_start.jpg",
      "segments/seg_001/frames/seg_001_t0005.20_mid.jpg",
      "segments/seg_001/frames/seg_001_t0010.40_end.jpg"
    ],
    "audioPath": "segments/seg_001/audio/seg_001_audio.wav",
    "transcriptPath": "segments/seg_001/audio/seg_001_transcript.json"
  },
  "timeRange": {
    "sourceStartSec": 0,
    "sourceEndSec": 10.4,
    "durationSec": 10.4
  },
  "visual": {
    "setting": "室内餐厅",
    "environmentDetails": "复古装潢、桌椅、背景人物",
    "characters": [
      {
        "characterId": "char_001",
        "appearance": "穿深色西装，坐在桌边",
        "position": "画面中央偏左",
        "expression": "紧张、犹豫"
      }
    ],
    "mainAction": "人物低头沉默，然后缓慢抬头回应对方",
    "props": ["餐桌", "杯子", "纸张"],
    "lighting": "暖色室内光，高对比阴影",
    "colorTone": "复古暖调",
    "visualContinuity": "承接上一段的对话压力"
  },
  "camera": {
    "shotSize": "中近景",
    "angle": "平视",
    "movement": "固定镜头",
    "composition": "人物居中，背景可见但不抢主体",
    "focus": "人物表情",
    "editingRole": "情绪铺垫"
  },
  "audio": {
    "dialogue": [
      {
        "speaker": "speaker_1",
        "text": "台词内容",
        "tone": "迟疑",
        "relativeStartSec": 1.2,
        "relativeEndSec": 3.8
      }
    ],
    "speechSummary": "人物语气迟疑地解释或回应",
    "ambient": "室内环境声",
    "music": "无明显音乐",
    "silenceOrPause": "开头有短暂停顿"
  },
  "story": {
    "plotFunction": "建立人物处境",
    "emotion": "紧张、犹豫、被审视",
    "conflict": "人物处于被质疑或被压迫状态",
    "beforeAfterRelation": "承接前一段的压力，并为后一段回应做铺垫"
  },
  "remix": {
    "keepElements": [
      "人物迟疑表情",
      "稳定中近景",
      "压迫感停顿"
    ],
    "replaceableElements": [
      "台词内容",
      "人物身份",
      "场景背景"
    ],
    "rewriteIdeas": [
      "改写成职场面试中的紧张回答",
      "改写成谈判桌上的试探回应"
    ],
    "reuseScenarios": [
      "职场谈判",
      "审问场景",
      "尴尬社交",
      "反转短剧铺垫"
    ],
    "riskNotes": [
      "长镜头节奏较慢，短视频改写时可压缩"
    ]
  },
  "videoPrompt": {
    "positivePrompt": "复古室内餐厅，一名穿深色西装的男性坐在桌边，神情紧张犹豫，缓慢抬头回应对方，稳定中近景，暖色电影光影，写实表演。",
    "negativePrompt": "避免夸张动作，避免卡通风格，避免快速剪辑，避免镜头剧烈晃动。",
    "motionPrompt": "人物先低头停顿，再缓慢抬头，眼神从回避转为注视。",
    "cameraPrompt": "固定中近景，平视角度，人物居中构图。",
    "dialoguePrompt": "语气迟疑，节奏缓慢，中间有明显停顿。"
  },
  "quality": {
    "confidence": 0.82,
    "missingInputs": [],
    "needsHumanReview": true,
    "warnings": []
  }
}
```

---

## 9. 多模态分析策略

### 9.1 输入组合

每个 segment 的原片理解输入应包括：

```txt
- segment.json
- clip.mp4
- start frame
- middle frame(s)
- end frame
- representative frames
- seg_xxx_transcript.json
- seg_xxx_audio_features.json
- 前一个 segment 的摘要
- 后一个 segment 的摘要
- 全片 metadata
```

### 9.2 模式分级

#### Fast 模式

输入：

```txt
start frame + middle frame + end frame + transcript
```

适合：

- 快速预览
- 成本敏感
- 大批量素材粗理解

#### Balanced 模式

输入：

```txt
start frame + middle frame(s) + end frame + representative frames + transcript + audio features
```

适合默认生产模式。

#### Accurate 模式

输入：

```txt
clip.mp4 + 多关键帧 + transcript + audio features + 前后片段上下文
```

适合：

- 重点片段
- 用户手动重跑
- 需要高质量复原提示词的片段

### 9.3 失败重试

应支持：

- 单段重跑原片理解
- 单段重跑 ASR
- 单段重提关键帧
- 全片重跑理解
- 只重跑失败片段
- 只重跑低置信度片段

---

## 10. Prompt 设计

### 10.1 片段级理解 Prompt

系统目标：

```txt
你是影视分镜与 AI 视频生成提示词专家。
请基于输入的片段关键帧、片段台词、音频特征、时间范围和上下文，
生成可用于二创复用和视频模型复原的结构化片段理解 JSON。
```

要求：

```txt
必须客观描述画面中实际可见内容；
不要编造不可见的人物身份；
如果台词为空，要标记为无明确台词或待转写；
需要区分画面事实、剧情推断、二创建议；
每个片段必须生成 videoPrompt；
输出必须是合法 JSON；
字段缺失时用 null 或空数组，不要省略关键字段。
```

### 10.2 全片汇总 Prompt

输入所有 segment 的摘要后生成：

```txt
- 全片故事线
- 情绪曲线
- 主要人物
- 视觉风格
- 可复用镜头类型
- 适合二创方向
- 高价值片段列表
```

---

## 11. 阶段完成条件与校验

不能只靠点击按钮把阶段置为 completed。每个阶段都必须依赖真实产物校验。

### 11.1 真实镜头切片完成条件

```txt
segments/index.json 存在
segments.length > 0
每个 segment 有 startSec / endSec / durationSec
每个 segment 有 clip.mp4 或明确标记 clipSkippedReason
```

### 11.2 关键帧提取完成条件

```txt
每个 segment 至少有 start frame
每个 segment 应尽量有 middle frame 和 end frame
图片路径存在且可读
segment.json 已记录 frame refs
```

### 11.3 音频与 ASR 完成条件

```txt
source_audio.wav 存在，或标记 hasAudio=false
如果 hasAudio=true，则 source_transcript.json 存在或明确 ASR failed reason
每个 segment 有 audio.wav 或明确 audioSkippedReason
每个 segment 有 transcript.json 或明确 noSpeech / asrSkippedReason
```

### 11.4 原片理解完成条件

```txt
original_understanding.json 存在
每个 segment 有 seg_xxx_understanding.json
每个 segment understanding 至少包含：
  visual
  camera
  audio
  story
  remix
  videoPrompt
understoodSegmentCount === segmentCount
failedSegmentCount === 0，或允许 partial_completed 状态
```

### 11.5 阶段状态

建议状态枚举：

```txt
pending
running
completed
partial_completed
failed
needs_review
stale
```

其中 `stale` 表示前置产物更新后，当前阶段产物已过期，需要重跑。

---

## 12. 前端 UI 设计

### 12.1 原片理解阶段页面结构

当前“原片理解”页面应从统计面板升级为理解工作台。

建议结构：

```txt
顶部：
  - 当前阶段状态
  - 生成原片理解按钮
  - 重跑失败片段
  - 重新生成全部
  - 模式选择：Fast / Balanced / Accurate

全片理解区：
  - 原片总览
  - 剧情线
  - 情绪曲线
  - 视觉风格
  - 二创潜力

片段列表区：
  - segment card
  - 时间范围
  - 缩略帧
  - 台词摘要
  - 画面描述
  - 镜头语言
  - 情绪/剧情功能
  - 视频模型提示词
  - 复用/替换建议
  - 状态与置信度
  - 单段重跑按钮
```

### 12.2 Segment Card 展示字段

每个片段卡片至少展示：

```txt
片段编号
时间范围
start / mid / end 缩略图
片段视频预览
音频播放
台词文本
画面描述
人物动作
镜头语言
剧情功能
情绪
二创复用点
视频模型 prompt
人工修正入口
```

### 12.3 人工标注联动

进入“人工标注”阶段时，应预填充：

```txt
AI 识别的标签
保留元素
替换元素
推荐二创方向
视频 prompt
台词摘要
镜头价值判断
```

人工标注不是从空白开始，而是在原片理解结果上进行修正。

---

## 13. 后端模块设计

### 13.1 核心服务

建议新增或补齐以下服务：

```txt
RemixSegmentAssetService
  - 管理 segment.json
  - 管理 clip / frames / audio refs

RemixAudioExtractionService
  - 抽取 source_audio.wav
  - 切分 seg_xxx_audio.wav
  - 计算 audio_features.json

RemixAsrService
  - 全片 ASR
  - 分段 transcript 对齐
  - 单段 ASR 重跑

RemixUnderstandingService
  - 生成 segment understanding
  - 生成 full source understanding
  - 管理重跑与失败恢复

RemixStageValidator
  - 校验每个阶段产物完整性
  - 控制状态推进
```

### 13.2 IPC 接口建议

```ts
sceneForgeRemix.prepareSourceAssetSegments(input)
sceneForgeRemix.extractSourceAssetAudio(input)
sceneForgeRemix.runSourceAssetAsr(input)
sceneForgeRemix.runSourceAssetUnderstanding(input)
sceneForgeRemix.rerunSegmentUnderstanding(input)
sceneForgeRemix.getSegmentUnderstanding(input)
sceneForgeRemix.updateSegmentUnderstanding(input)
sceneForgeRemix.validateSourceAssetStage(input)
```

### 13.3 Job 设计

原片理解可能耗时较长，应走任务队列：

```ts
interface RemixProcessingJob {
  jobId: string;
  sourceAssetId: string;
  stage: 'segmentation' | 'keyframes' | 'audio' | 'asr' | 'understanding';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    currentSegmentId?: string;
    message?: string;
  };
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
```

---

## 14. 数据版本与兼容

### 14.1 Schema 版本

所有核心 JSON 加 `version`：

```json
{
  "version": 1
}
```

后续升级时可迁移：

```txt
v1: 基础片段理解
v2: 加入角色跨片段追踪
v3: 加入镜头节奏曲线
v4: 加入生成模型适配 prompt pack
```

### 14.2 旧数据处理

对于当前已有资产：

- 如果只有切片统计，没有 clip/frames/audio 文件，则阶段状态应回退到 `pending` 或 `stale`；
- 如果有 frames 但没有 audio/transcript，则 ASR 阶段显示待执行；
- 如果原片理解 JSON 不存在，则原片理解阶段显示待生成；
- 不允许仅凭旧的 completed 状态继续显示为完成。

---

## 15. 安全与成本控制

### 15.1 成本控制

- 默认使用 Balanced 模式；
- 大量片段时支持批量分组；
- 长片段可只传关键帧，不直接传视频；
- 高价值片段再用 Accurate 模式重跑；
- 支持只重跑失败片段；
- 缓存 LLM 结果，输入 hash 未变化时不重复调用。

### 15.2 输入 Hash

每个 understanding 产物记录输入 hash：

```json
{
  "inputHash": {
    "segmentJson": "sha256",
    "frames": "sha256",
    "transcript": "sha256",
    "promptVersion": "v1"
  }
}
```

如果 hash 不变，直接复用结果。

---

## 16. 实施计划

### Phase 0：问题收敛与状态修正

目标：避免当前“点击即完成”的假完成。

任务：

1. 找到原片理解按钮 handler。
2. 找到阶段状态更新逻辑。
3. 加入完成校验：无 understanding 产物则不能 completed。
4. UI 显示“待生成 / 结果缺失 / 需要重跑”。

验收：

```txt
点击原片理解不再直接完成；
没有 understanding.json 时显示待生成；
旧的假完成状态能被识别为 stale。
```

### Phase 1：中间产物规范落地

目标：镜头切片和关键帧提取必须落盘为可复用资产。

任务：

1. 定义 source asset 目录结构。
2. 生成 segments/index.json。
3. 每段生成 segment.json。
4. 每段保存 clip.mp4。
5. 每段保存 start/mid/end frames。
6. 前端可查看每段 clip 和 frames。

验收：

```txt
完成切片后，每段都有 clip.mp4 和 segment.json；
完成关键帧后，每段至少有 start/mid/end frame；
文件命名可读且 manifest 可追踪。
```

### Phase 2：音频抽取与 ASR

目标：补齐台词和音频线索。

任务：

1. 抽取 source_audio.wav。
2. 每段切分 seg_xxx_audio.wav。
3. 接入 ASR provider。
4. 生成 source_transcript.json。
5. 按时间范围生成 seg_xxx_transcript.json。
6. 支持单段 ASR 重跑。

验收：

```txt
有音轨视频能生成全片 transcript；
每段能看到对齐台词；
无语音段明确标记 noSpeech；
ASR 失败时不阻塞其他片段理解。
```

### Phase 3：片段级原片理解

目标：生成 segment understanding。

任务：

1. 设计 prompt。
2. 组装每段输入上下文。
3. 实现 Fast/Balanced 模式。
4. 生成 seg_xxx_understanding.json。
5. 校验 JSON schema。
6. 支持失败重试。

验收：

```txt
每段都有画面、动作、镜头、台词、剧情、二创、videoPrompt；
结果可持久化；
刷新页面后仍可查看；
失败片段可单独重跑。
```

### Phase 4：全片理解汇总

目标：从所有 segment 汇总成全片级理解。

任务：

1. 读取所有 segment understanding。
2. 生成 overall summary。
3. 识别主要人物、情绪曲线、视觉风格。
4. 生成高价值片段推荐。
5. 写入 original_understanding.json。

验收：

```txt
全片理解区显示完整总结；
能看到推荐二创方向；
能跳转到高价值片段。
```

### Phase 5：前端理解工作台

目标：让原片理解结果可查看、可重跑、可编辑。

任务：

1. 重构原片理解阶段 UI。
2. 增加 segment card。
3. 增加缩略图、视频预览、音频播放。
4. 增加 prompt 展示与复制。
5. 增加单段重跑。
6. 增加人工修正入口。

验收：

```txt
用户可以看到每个片段的实际内容记录；
可以复制视频模型 prompt；
可以重跑单段；
可以进入人工标注继续修正。
```

### Phase 6：人工标注与保存入库联动

目标：让理解结果进入二创资产库。

任务：

1. 人工标注阶段读取 understanding 作为初始值。
2. 用户修正后写 annotation。
3. 保存入库时合并 segment、understanding、annotation。
4. 后续二创工作台可检索和调用。

验收：

```txt
人工标注不是空白开始；
保存入库后可按画面/动作/情绪/台词/复用点检索；
二创生成可直接使用 segment videoPrompt。
```

---

## 17. 测试计划

### 17.1 单元测试

覆盖：

- segment ID 生成
- 文件命名生成
- transcript 按时间对齐
- understanding schema 校验
- 阶段状态校验
- stale 状态识别

### 17.2 集成测试

准备一个 2 分钟测试视频，验证：

```txt
导入原片
真实镜头切片
关键帧提取
音频分段
ASR
原片理解
人工标注预填充
保存入库
```

### 17.3 回归测试

重点防止：

- 没有产物也显示 completed；
- 所有片段生成相同理解文本；
- 台词对齐错段；
- 关键帧路径丢失；
- segment 重新切片后旧 understanding 未标记 stale；
- 刷新页面后理解结果丢失。

---

## 18. 风险与应对

### 18.1 成本过高

应对：

- 默认图片组 + transcript；
- 视频输入只用于 Accurate 模式；
- 支持只重跑高价值片段；
- 加 input hash 缓存。

### 18.2 ASR 质量不稳定

应对：

- 允许人工修正 transcript；
- 允许单段重跑 ASR；
- transcript 加 confidence；
- 低置信度片段标记 needsReview。

### 18.3 多模态模型幻觉

应对：

- Prompt 强制区分“可见事实”和“推断”；
- 输出 quality.warnings；
- 人工标注阶段保留修正能力；
- 不把低置信度理解直接入库为最终资产。

### 18.4 分段过碎或过长

应对：

- 支持合并短段；
- 支持长段内部 representative frames；
- 原片理解时传前后上下文；
- 后续加入人工调整切片边界。

---

## 19. MVP 范围建议

第一版不要追求完整多模态视频理解，可以先做可闭环 MVP：

```txt
必须做：
- segment clip 落盘
- start/mid/end frames 落盘
- segment.json
- source_audio.wav
- seg_xxx_audio.wav
- 全片 ASR
- 分段 transcript 对齐
- 每段图片组 + transcript 生成 understanding
- 前端展示 segment understanding
- completed 状态依赖产物校验

暂缓做：
- speaker diarization
- 精细音频情绪识别
- 直接视频输入大模型
- 复杂角色跨片段追踪
- 自动镜头边界人工编辑器
```

---

## 20. 建议开发顺序

建议按照以下顺序实施，避免一开始就陷入完整多模态分析复杂度。

```txt
第一批：修假完成
  1. 禁止无产物 completed
  2. 显示 stale / pending / failed
  3. 补 validator

第二批：补中间产物
  1. clip.mp4 落盘
  2. start/mid/end frames 落盘
  3. segment.json / index.json 落盘

第三批：补音频和 ASR
  1. source_audio.wav
  2. seg_xxx_audio.wav
  3. source_transcript.json
  4. seg_xxx_transcript.json

第四批：补理解生成
  1. segment prompt
  2. understanding schema
  3. JSON 校验
  4. 单段重跑

第五批：补 UI
  1. segment card
  2. 图片 / 视频 / 音频预览
  3. prompt 展示与复制
  4. 人工修正入口

第六批：联动人工标注和保存入库
  1. annotation 预填充
  2. 入库 bundle
  3. 检索字段
```

---

## 21. 最终结论

「原片理解」是 Remix 资产入库的核心中枢，不是一个可有可无的摘要按钮。

它必须建立在：

```txt
分段视频
关键帧
分段音频
ASR 台词
音频特征
片段 manifest
```

这些可复用中间产物之上。

最终产物应该是：

```txt
每个片段一份结构化理解
每个片段一份可用于视频模型的提示词
全片一份整体理解
人工标注可基于理解结果继续修正
保存入库后可被二创工作台检索和调用
```

只有做到这一点，Remix 才真正从“上传视频并切片”升级为“把原片转化为可二创复用的语义资产库”。
