Status: ready-for-agent

# M1：分段音频与 ASR 对齐基座

## 问题陈述

片段级理解需要台词与时间对齐；当前 Remix 仅可能在导入时附带全片 transcript 路径，没有分段音频与 `seg` 级 transcript 产物。

## 解决方案

为每个 source asset 抽取全片音频、切分分段音频，执行全片 ASR（或消费已有 SRT），并按 segment 时间范围对齐生成分段 transcript 与质量元数据。

## 用户故事

1. 作为资产处理用户，我想在有音轨时看到每段台词摘要，以便核对理解输入。
2. 作为资产处理用户，我想对单段重跑 ASR，以便修正对齐错误。
3. 作为理解生成服务，我想读取分段 transcript JSON，以便 prompt 不编造台词。
4. 作为资产处理用户，我想在无语音段看到明确 `noSpeech`，以便区分 ASR 失败与静音。

## 实现决策

- 新服务层：音频抽取 + 分段切分 + ASR 编排（可适配现有 bcut/video-import runner）。
- 产物：全片 `source_audio`、每段 `segment_audio`、全片 transcript 索引、每段 transcript（含 confidence / hasSpeech）。
- segment manifest 或 store 内记录 audio/asr 处理状态与路径引用。
- ASR 失败：单段可失败，不阻塞其他段理解（标记 needsReview）。
- MVP 不做说话人分离。

## 测试决策

- 对齐：给定 utterance 时间轴 + segment 边界 → 分段 plainText 正确。
- 集成：短样例音频 mock ASR → 每段 transcript 文件存在。
- 先例：`video-import-service.test.ts`（bcut 解析）、`sceneforge-remix-artifact-paths.test.ts`。

## 超出范围

- audio_features 深度分析（可轻量字段占位）
- Remix 外其它产品的 ASR 设置 UI

## 进一步说明

依赖 M0 可选；理解生成（M2）强依赖本模块或 **M1.5 导入字幕快路径** 产出的等价全片 transcript + 分段对齐。

姊妹模块：`prd/01b-imported-srt-transcript-fast-path.md`。


## STT 接入详设

见 `docs/sceneforge-remix/remix-stt-asr-integration-and-transcript-formats.md`（Provider、JSON/SRT/MD、对齐、local_whisper 迁移）。
