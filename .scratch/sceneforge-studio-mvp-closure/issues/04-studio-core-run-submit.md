Status: completed

## 父问题

`.scratch/sceneforge-studio-mvp-closure/PRD.md`

## 要构建什么

闭合 Runner 设计中的 **draft → submitStageDraft** 环节：在 `StageRunPanel` 于 `sceneRunStage` 成功且返回非空 artifacts 时，提供 **「提交草案到产物库」**，一次提交多 artifactKey（design/storyboard/video_prompts）。提交成功后触发项目状态刷新。可选：design 专用 **MVP 占位** 按钮（最短非空 Markdown 填满 5 个 design 核心 key），便于无 LLM Provider 时测试 Validate/Continue；须二次确认或仅开发/测试可见。

## 验收标准

- [ ] direct_llm 或 manual_submit 返回多 key 草案后，用户可点击提交且 manifest 出现对应 final 产物
- [ ] 提交后 design Validate 可对齐 5 核心产物规则（占位内容非空即可）
- [ ] 未配置 LLM 时，可选占位路径仍可测通 design Validate（若实现占位按钮）
- [ ] 不改变 runner 层「运行不写盘」语义；写盘仅经 submit API
- [ ] 相关测试或 smoke 通过；`npx tsc --noEmit`

## 被阻塞于

- `.scratch/sceneforge-studio-mvp-closure/issues/02-backend-prep-support-submit-validate.md`（submit 契约稳定；core design submit 已存在，本 issue 主要为 UI 衔接）

## 类型说明

AFK

## 覆盖的用户故事

PRD：无 LLM 下测通 design Validate/Continue；Runner 设计统一出口