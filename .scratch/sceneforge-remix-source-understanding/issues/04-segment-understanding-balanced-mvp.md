Status: ready-for-agent

# 片段级结构化理解生成（Balanced MVP）

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/02-segment-understanding-generation.md`（M2）

## 要构建什么

基于关键帧图组与分段台词，为每个 segment 生成结构化 understanding JSON 与 videoPrompt，支持批量生成与单段重跑。

端到端行为：
- 生成完成后每段有独立 understanding 文件且通过 schema 校验。
- 失败段不导致整阶段假完成；可重跑单段。

## 验收标准

- [ ] 每段 JSON 含 visual/camera/audio/story/remix/videoPrompt/quality
- [ ] Balanced 输入含关键帧路径与 transcript
- [ ] 单段重跑后仅该段产物更新且 inputHash 变化

## 被阻塞于

- 01-stage-truth-gate-and-validator.md；03-asr-full-source-and-segment-alignment.md（强烈建议）

## Review Checklist

- [ ] 行为与 `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` MVP 范围一致
- [ ] 不重复 sceneforge-remix-ui-recovery 的切片/UI 大票职责
- [ ] 阶段完成仍遵循产物优先原则

## 测试与验证

- `npx tsc --noEmit`
- 相关 vitest：validators / understanding / artifact-paths / asset-processing（按票增量）
