Status: ready-for-agent

# 原片理解一键编排（Transcript → Segment LLM → Rollup）

Type: AFK

## 父问题

`.scratch/sceneforge-remix-source-understanding/PRD.md`  
索引：[`ISSUE_INDEX.md`](../ISSUE_INDEX.md)  
详设：`docs/sceneforge-remix/remix-understanding-orchestration-and-ui.md`

## 要构建什么

实现「生成原片理解」单按钮编排：在单个 `RemixProcessingJob` 内顺序执行（可跳过已 fresh 的 transcript）：

1. 必要时：音频抽取（依赖 02 能力）
2. 全片 whisper + 分段对齐（03c + aligner）
3. 片段理解并发池（04）
4. 全片 rollup（05）

对外一个 job；`progress.phase` 区分 `transcript` / `understanding` / `rollup`；失败时 transcript 失败不启动 LLM。

## 验收标准

- [ ] 一次 IPC/按钮触发完整 A→B→rollup，非三次手动点
- [ ] `source_transcript` inputHash 未变时跳过 whisper（可配置）
- [ ] understanding 阶段 `progress.completed/total` 按 segment 递增
- [ ] whisper 同素材仅 1 路；LLM 并发默认 2、可配置
- [ ] 与 01 门禁一致：无产物不得 approved

## 被阻塞于

- 01-stage-truth-gate-and-validator.md
- 02-audio-extraction-and-segment-cache.md
- 03c-local-whisper-stt-provider.md（主线 STT）
- 04-segment-understanding-balanced-mvp.md
- 05-source-understanding-rollup-and-artifacts.md

## 测试与验证

- 集成：mock whisper + mock LLM，26 段进度从 0→26
- `npx vitest run` orchestrator 单测

## 关键词

orchestrator, runSourceUnderstanding, processingJob, progress, transcript, concurrency
