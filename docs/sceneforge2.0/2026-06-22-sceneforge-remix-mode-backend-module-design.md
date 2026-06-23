# SceneForge Remix Mode 后端功能模块设计 v1.0

> 日期：2026-06-22  
> 文档类型：后端功能模块详细设计  
> 依赖文档：`2026-06-22-sceneforge-remix-mode-product-design.md`

## 1. 模块总览

建议在 `electron/sceneforge/remix/` 下新增 Remix Mode 后端模块。模块应遵循现有 SceneForge 的服务分层，不让前端直接读写项目目录。

建议模块如下：

- `remix-types.ts`
- `remix-stage-definitions.ts`
- `remix-service.ts`
- `remix-source-asset-service.ts`
- `remix-segmentation-service.ts`
- `remix-keyframe-service.ts`
- `remix-understanding-service.ts`
- `remix-variant-service.ts`
- `remix-strategy-service.ts`
- `remix-design-service.ts`
- `remix-keyframe-prompt-service.ts`
- `remix-edited-keyframe-service.ts`
- `remix-seedance-prompt-service.ts`
- `remix-validators.ts`
- `remix-artifact-paths.ts`

## 2. remix-service

`remix-service` 是统一入口。

职责：

- 接收前端 Remix API 请求。
- 调用各子服务。
- 创建 Pipeline task。
- 更新 Stage State。
- 登记 Artifact。
- 统一处理错误。
- 返回 Remix Project Snapshot。

它不应该直接塞入复杂业务逻辑，而是作为编排层。

## 3. remix-source-asset-service

职责：

- 复用现有 video-import 结果。
- 创建 Source Asset。
- 写入 `source_manifest.json`。
- 关联 transcript、srt、metadata。
- 登记 source asset artifact。

输入：

- projectId
- video import input
- optional title

输出：

- sourceAssetId
- source manifest
- artifact refs

## 4. remix-segmentation-service

职责：

- 读取 Source Asset 的原视频。
- 识别真实镜头候选边界。
- 按产品规则合并短镜头。
- 对长镜头寻找安全切点。
- 允许保留 long_segment。
- 为每个 segment 导出独立 source clip。
- 写入 segment manifest 和 index。

关键规则：

- 不为了固定时长强行破坏表演完整性。
- 真实镜头边界优先。
- 片段过长才做二次安全切分。
- 找不到安全切点时允许 long_segment。

## 5. remix-keyframe-service

职责：

- 遍历 source segment。
- 提取 first frame。
- 提取 last frame。
- 当 durationMs 大于 8000 时提取 middle frame。
- 写入 keyframe refs。
- 更新 segment manifest。

关键规则：

- first 和 last 是所有片段必需关键帧。
- middle 仅在片段大于 8 秒时必需。
- 大于 8 秒的 middle 需要进入改图批处理。

## 6. remix-understanding-service

职责：

- 读取 source metadata、transcript、segment manifest 和关键帧。
- 生成 source overview。
- 生成 segment analysis。
- 同时输出 Markdown 和 JSON。
- 将分析结果登记为可被下游读取的 artifact。

source overview 关注：

- 剧情结构
- 人物关系
- 冲突机制
- 台词风格
- 表演风格
- 镜头风格
- 梗点机制
- 可二创方向

segment analysis 关注：

- 片段功能
- 台词含义
- 对白节奏
- 动作表演
- 表情状态
- 镜头构图
- 关键帧分析
- 可替换元素
- 必须保留元素
- 二创 hook

## 7. remix-variant-service

职责：

- 创建 Variant。
- 读取 Variant。
- 更新 Variant 配置。
- 校验 referenceStrength。
- 校验 retentionMatrix。
- 管理 generation mode 默认值与 segment 覆盖值。

referenceStrength 固定为：light、medium、strong。

retentionMatrix 固定九个维度，不开放自定义维度。

## 8. remix-strategy-service

职责：

- 根据 source overview、segment analysis、variant concept 和 retentionMatrix 生成改编策略。
- 产出全局策略。
- 产出逐片段策略。

全局策略回答：

- 整体二创概念是什么。
- 原片哪些关系需要保留。
- 角色如何映射。
- 场景如何替换。
- 视觉风格如何替换。
- 台词含义和节奏如何处理。
- 梗点如何增强。

逐片段策略回答：

- 当前片段保留什么。
- 当前片段替换什么。
- 当前片段的风险点是什么。
- 当前片段如何服务整体二创。

## 9. remix-design-service

职责：

- 根据 remix strategy 生成稳定设定资产。
- 生成 global design。
- 生成 segment design overrides。

global design 包含：

- 角色设定
- 服装和外观规则
- 场景设定
- 视觉风格设定
- 表演规则
- 连续性规则
- 声音角色摘要

segment override 用于局部差异化，例如某段需要更强表演、更贴原片镜头或更强梗点。

## 10. remix-keyframe-prompt-service

职责：

- 生成 global keyframe edit rules。
- 生成每个 segment 的逐帧改图提示词。
- 绑定 source frame、frame role、segment analysis 和 design。

Prompt 必须明确：

- 输入图
- 改图目标
- 保留元素
- 替换元素
- 角色一致性
- 风格一致性
- 构图保留
- 负面约束

## 11. remix-edited-keyframe-service

职责：

- 登记用户上传或选择的 edited keyframes。
- 绑定 source frame 和 prompt。
- 管理状态流转。
- 提供 video prompt 前置条件检查。

状态：

- pending
- generated
- needs_revision
- approved
- rejected

只有 approved 状态的必需关键帧可以进入视频提示词阶段。

## 12. remix-seedance-prompt-service

职责：

- 读取 approved edited keyframes。
- 读取 generation mode。
- 读取 source clip pointer。
- 读取 remix design 和 segment adaptation。
- 生成 audio plan。
- 生成 global Seedance rules。
- 生成 segment Seedance prompts。

第一版只服务 Seedance 2.0，不做多平台提示词适配。

输出应包含结构化 JSON 和可复制 Markdown。

## 13. remix-validators

职责：

- 校验每个 Stage 的前置条件。
- 校验每个 Stage 的输出完整性。
- 给前端返回可读的缺失项。
- 防止后续阶段读取未确认或缺失的资产。

典型校验包括：

- segment 是否有 source clip。
- 关键帧是否齐全。
- retentionMatrix 是否完整。
- edited keyframes 是否 approved。
- Seedance prompt 是否包含必要字段。

## 14. remix-artifact-paths

职责：

- 统一生成 source asset 路径。
- 统一生成 segment 路径。
- 统一生成 variant 路径。
- 统一生成 keyframe、prompt、analysis、manifest 路径。

路径生成逻辑必须集中，避免不同服务手写路径导致产物混乱。

## 15. 服务调用关系

推荐调用关系：

1. 前端调用 remix-service。
2. remix-service 创建任务并调用具体子服务。
3. 子服务只处理自己的业务产物。
4. 子服务通过 artifact store 登记输出。
5. remix-service 更新 stage state。
6. 前端通过 snapshot 和 artifact read 接口读取结果。

## 16. 边界约束

后端模块需要遵守：

- Renderer 不直接读写项目目录。
- LLM runner 不直接写 state。
- 阶段输出必须通过统一 artifact 写入。
- 二进制媒体文件以路径和 manifest 登记，不塞进文本产物。
- 下游阶段通过 Stage Context、Handoff 或 Manifest 读取需要的输入，不默认扫描全目录。

## 17. MVP 模块优先级

第一优先级：

- remix-types
- remix-stage-definitions
- remix-service
- remix-source-asset-service
- remix-segmentation-service
- remix-keyframe-service

第二优先级：

- remix-understanding-service
- remix-variant-service
- remix-strategy-service
- remix-design-service

第三优先级：

- remix-keyframe-prompt-service
- remix-edited-keyframe-service
- remix-seedance-prompt-service
- remix-validators
