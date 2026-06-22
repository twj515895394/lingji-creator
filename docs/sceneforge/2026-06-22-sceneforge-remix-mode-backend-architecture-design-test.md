# SceneForge Remix Mode 后端流程、架构与功能模块设计文档 v1.0

本文件说明 Remix Mode 后端实现方案。

## 1. 目标

新增 `remix_reference` pipeline，并新增 `remix_*` 专属阶段。后端复用现有 video-import、PipelineService、Artifact Store、Stage State、Validator 和项目文件管理能力。

## 2. Stage

```text
remix_source_import
remix_segmentation
remix_keyframes
remix_understanding
remix_strategy
remix_design
remix_keyframe_edit_prompts
edited_keyframes_review
remix_video_prompts
remix_publish
```
