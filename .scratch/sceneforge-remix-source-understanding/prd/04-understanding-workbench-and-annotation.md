Status: ready-for-agent

# M4：原片理解工作台与人工标注预填

## 问题陈述

处理页仅展示边界/关键帧统计，无法预览理解结果、复制 prompt 或进入标注预填。

## 解决方案

升级原片理解步骤 UI：全片摘要区 + segment 卡片（缩略帧、台词、理解摘要、prompt 复制、单段重跑）；人工标注读取理解中的 keep/replace/tags 建议作为初值。

## 用户故事

1. 作为资产处理用户，我想在理解页看到每段缩略图与台词，以便快速扫读。
2. 作为资产处理用户，我想一键复制 video prompt，以便外部生成。
3. 作为资产处理用户，我想点单段重跑，以便只修一段。
4. 作为资产处理用户，我想标注页预填 AI 建议的保留/替换点，以便只做人机修正。

## 实现决策

- 消费 M3 契约 JSON，而非 view-model 拼装的边界备注。
- IPC：单段重跑理解、查询理解详情（若尚未有）。
- 复制反馈与现有 SceneForge copy-ready 模式对齐（chip/按钮）。
- 标注预填不自动覆盖用户已保存标注。

## 测试决策

- 组件测试：给定 fixture JSON → 卡片渲染字段、复制回调。
- 处理页测试：理解未完成不显示假完成文案。
- 先例：`sceneforge-remix-asset-library.test.tsx`（SourceOverviewPanel）、asset-processing 测试。

## 超出范围

- 片段内视频播放器大改（可复用 Wave1 预览能力）
- Creation Workspace

## 进一步说明

阻塞：M3（可读 JSON）；可与 M2 末尾并行打磨 UI 骨架。


## 前端进度与卡片状态

见 `docs/sceneforge-remix/remix-understanding-orchestration-and-ui.md` §4。
