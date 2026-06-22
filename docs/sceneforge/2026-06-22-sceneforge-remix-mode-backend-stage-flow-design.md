# SceneForge Remix Mode 后端 Stage 与流程设计 v1.0

> 日期：2026-06-22  
> 文档类型：后端 Stage / 流程详细设计  
> 依赖文档：`2026-06-22-sceneforge-remix-mode-product-design.md`

## 1. Pipeline 定义

Remix Mode 需要新增独立 pipeline：`remix_reference`。

它不能复用 `reference_remake`，因为 Remix Mode 的核心不是从参考资料生成原创故事板，而是从原片中提取片段、关键帧和表演结构，再生成二创版本。

## 2. Stage 链路

Remix Mode 后端 Stage 顺序如下：

1. `remix_source_import`：导入原片并登记 Source Asset。
2. `remix_segmentation`：真实镜头优先切片。
3. `remix_keyframes`：提取首帧、尾帧和必要的中间帧。
4. `remix_understanding`：生成全局原片分析和逐片段分析。
5. `remix_strategy`：生成全局改编策略和逐片段改编策略。
6. `remix_design`：生成全局设定和逐片段 override。
7. `remix_keyframe_edit_prompts`：生成关键帧改图提示词。
8. `edited_keyframes_review`：登记和验收改后关键帧。
9. `remix_video_prompts`：生成 Seedance 2.0 视频提示词。
10. `remix_publish`：输出提示词包和资产清单。

## 3. 原片导入流程

该阶段复用现有 video-import。Remix 后端只负责把导入结果登记为 Source Asset。

处理步骤：

1. 前端传入本地视频或已有导入结果。
2. 后端调用现有视频导入能力。
3. 读取导入后的媒体路径、时长、分辨率、音频信息、转录文本和字幕文件。
4. 创建 `sourceAssetId`。
5. 写入 `source_manifest.json`。
6. 登记 Source Asset 到 Artifact Store。
7. 更新 `remix_source_import` 阶段状态。

## 4. 真实镜头优先切片流程

切片阶段的目标不是简单切成固定 5 秒、10 秒、15 秒，而是先保护真实镜头和表演完整性。

处理步骤：

1. 读取 Source Asset 的原视频。
2. 识别真实镜头边界。
3. 将真实镜头作为候选 segment。
4. 对过短镜头，结合场景、台词、动作节奏进行合并。
5. 对超过 15 秒的长镜头，寻找安全切点。
6. 找不到安全切点时，保留为 `long_segment`。
7. 为每个 segment 实际导出独立 `source_clip.mp4`。
8. 写入每段的 `segment_manifest.json`。
9. 写入 `segment_manifest_index.json`。

MVP 的安全切点先使用较稳定的工程信号，例如字幕句间停顿、音频低能量区间、最小时长保护和最大建议时长。后续再增强视觉层面的安全切点识别。

## 5. 关键帧提取流程

关键帧提取规则固定：

1. 每个 segment 必须提取 `first_frame.png`。
2. 每个 segment 必须提取 `last_frame.png`。
3. 当片段时长大于 8 秒时，必须提取 `middle_frame.png`。
4. 大于 8 秒的 middle frame 也要进入后续改图批处理。

提取完成后，后端需要更新 segment manifest，并生成关键帧索引，供原片理解、改图提示词和视频提示词阶段读取。

## 6. 原片理解流程

原片理解阶段分为全局分析和逐片段分析。

全局分析输出：

- `source_overview.md`
- `source_overview.json`

逐片段分析输出：

- `segment_analysis.md`
- `segment_analysis.json`

`segment_analysis.json` 必须包含关键帧级分析。系统需要知道每个 first、middle、last 里的人物、动作、表情、构图、可替换元素和必须保留元素。

## 7. Variant 创建流程

Variant 创建不是普通文件夹复制，而是一个正式二创版本对象。

创建时必须写入：

- variant name
- variant concept
- referenceStrength
- retentionMatrix
- defaultGenerationMode

其中 referenceStrength 固定为 light、medium、strong 三档。retentionMatrix 固定九个维度，每个维度使用专属固定选项。

## 8. 改编策略与 Remix Design 流程

`remix_strategy` 负责回答“这个二创版本怎么改”。

输出包括：

- 全局改编策略
- 逐片段改编策略

`remix_design` 负责回答“这个二创版本如何保持一致”。

输出包括：

- 全局角色设定
- 全局风格设定
- 全局场景设定
- 全局表演规则
- 连续性规则
- 逐片段 override

## 9. 关键帧改图提示词流程

该阶段采用双层结构。

第一层是全局改图规则，用于锁定角色、服装、风格、场景、构图和禁止漂移项。

第二层是逐 segment、逐 frame 的改图提示词。每个 first、last，以及大于 8 秒片段的 middle，都要有独立提示词。

## 10. 改后关键帧登记流程

用户在外部图像工具生成改后关键帧后，需要回到 Remix Mode 登记。

每张改后关键帧需要记录：

- segmentId
- frameRole
- sourceFramePath
- promptPath
- editedFramePath
- status
- qualityChecks

状态包括 pending、generated、needs_revision、approved、rejected。

只有 approved 的必需关键帧可以进入视频提示词生成。

## 11. Seedance 2.0 视频提示词流程

视频提示词阶段只面向 Seedance 2.0。

支持两种模式：

- keyframes_only：只使用改后关键帧。
- keyframes_plus_source_clip：使用改后关键帧和原始片段作为运动、表演和节奏参考。

该阶段需要生成：

- global_seedance_rules
- segment_seedance_prompt
- audio_plan

最终用户看到的是可复制的 Seedance 2.0 提示词。内部仍保留结构化字段，方便系统校验和后续重新拼接。

## 12. Publish 流程

发布阶段不负责自动合成最终视频。第一版输出资产清单和提示词包。

发布清单应包含：

- Source Asset 信息
- Variant 信息
- Segment 顺序
- 每段输入关键帧
- 每段 source clip 路径
- 每段 Seedance 2.0 提示词
- 缺失项和风险提示
