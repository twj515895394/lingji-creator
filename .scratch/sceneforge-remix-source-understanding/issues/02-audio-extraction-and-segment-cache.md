Status: ready-for-agent

# 全片与分段音频抽取缓存

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
模块 PRD：`prd/01-audio-asr-foundation.md`（M1）

## 要构建什么

为 source asset 抽取全片音频并切分每段音频，写入 manifest/store 引用，供 ASR 与理解使用。

端到端行为：
- 有音轨素材完成后可在磁盘查到全片与分段音频产物。
- 无音轨素材明确标记跳过原因，不阻塞后续（理解侧标记无台词）。

## 验收标准

- [ ] 全片音频抽取成功或 hasAudio=false 时语义明确
- [ ] 每个 segment 有分段音频或跳过原因
- [ ] segment 索引/manifest 记录 audio 状态

## 被阻塞于

- 01-stage-truth-gate-and-validator.md（可并行，但理解票依赖音频）

## Review Checklist

- [ ] 行为与 `docs/sceneforge-remix/source-understanding-design-and-implementation-plan.md` MVP 范围一致
- [ ] 不重复 sceneforge-remix-ui-recovery 的切片/UI 大票职责
- [ ] 阶段完成仍遵循产物优先原则

## 测试与验证

- `npx tsc --noEmit`
- 相关 vitest：validators / understanding / artifact-paths / asset-processing（按票增量）
