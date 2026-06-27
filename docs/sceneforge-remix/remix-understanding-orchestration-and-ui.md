# Remix 原片理解：ASR 与片段分析编排 + 前端展示 + 并发策略

> 版本：v1.0 | 2026-06-26  
> 关联：`remix-stt-asr-integration-and-transcript-formats.md`、`prd/02-segment-understanding-generation.md`、`prd/04-understanding-workbench-and-annotation.md`

---

## 1. 先回答三个问题（结论）

| 问题 | 结论 |
|------|------|
| 每个片段的 ASR 和片段解析分析 **一起做还是分开**？ | **逻辑分开、体验可一键串联**。ASR 是 **全片一次**；片段分析（理解）是 **按 segment 多次**。不要做成「每个片段各跑一遍 whisper + 各跑一遍 LLM」的默认路径。 |
| 前端怎么展示？ | **两阶段进度 + 片段卡片状态矩阵**：先「全片台词」再「片段理解」；列表里每段独立显示 transcript / understanding 状态。 |
| 多片段排队还是多线程？ | **Whisper：单任务单进程**（片内多线程由 whisper `-t` 负责）。**片段理解：有限并发队列**（建议默认 2，上限 4–6），不是 N 段开 N 个 whisper。 |

---

## 2. 为什么要分开（而不是 per-segment 绑死）

```text
┌─────────────────────────────────────────────────────────────┐
│ 阶段 A：全片台词（ASR / 对齐）  — 1 次 whisper + 对齐 N 段   │
│   输入：source_audio.wav                                     │
│   输出：source_transcript.json + 每段 segment_transcript.*   │
│   耗时：O(音频时长)，与段数弱相关                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ 强依赖（理解需要段内台词）
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 阶段 B：片段理解（LLM）        — 每段 1 次（可并发）          │
│   输入：段内 transcript + 关键帧路径 + 前后文摘要            │
│   输出：segment_understanding.json × N                       │
│   耗时：O(段数 × LLM 延迟)                                   │
└─────────────────────────────────────────────────────────────┘
```

**不采用**（默认）：

```text
for segment in segments:
    asr(segment_audio)      # N 次 whisper — 慢、贵、无必要
    understand(segment)     # N 次 LLM
```

**例外（补救）**：

- 某段 `segment_transcript` 对齐失败 / `needsReview` → 仅对该段 `segment_audio.wav` **重跑 ASR**（仍不默认与 LLM 绑在同一原子任务里）。
- 某段理解失败 → **仅重跑该段 LLM**（复用已有 segment_transcript）。

---

## 3. 后端编排（Orchestrator）

### 3.1 阶段 ID 建议

在现有 `remix_keyframes` 与 `remix_understanding` 之间，**显式增加**（或作为 understanding 子阶段写入 job.progress）：

| stepId | 名称 | 粒度 |
|--------|------|------|
| `remix_transcript` | 全片转写 + 分段对齐 | 整素材 1 job |
| `remix_understanding` | 片段理解 + 全片 rollup | 1 总 job，内部分 segment 计数 |

MVP 若暂不增 stage 枚举，至少在 `RemixProcessingJob` 上：

```ts
progress: {
  phase: 'transcript' | 'understanding' | 'rollup';
  total: number;       // transcript 阶段 total=1；understanding total=segmentCount
  completed: number;
  currentSegmentId?: string;
  message?: string;
}
```

### 3.2 「生成原片理解」按钮行为（推荐）

用户 **一次点击**，编排器 **顺序执行**（对用户是一个 job，对内两 phase）：

1. 若 `source_transcript` 缺失或 `stale` → 跑 **02 抽音频**（若缺）+ **03c whisper** + **对齐器**。
2. 若 transcript 已有效且 hash 未变 → **跳过** 阶段 A（日志写明「复用已有台词」）。
3. 对每段跑片段理解（并发池）→ 写 `segment_understanding.json`。
4. Rollup → `source_overview` / 阶段门禁。

**不要**在 UI 上强制用户先点「ASR」再点「理解」两个按钮（可保留高级「仅重跑台词 / 仅重跑理解」）。

### 3.3 并发与进程模型（Electron 主进程）

| 工作负载 | 并发策略 | 说明 |
|----------|----------|------|
| ffmpeg 抽音频 | 串行 1 | 短，避免磁盘争用 |
| whisper.cpp | **同时 1 路/素材** | CPU 密集；`main -t 4` 已用多线程。多素材才多任务并行（不同 sourceAssetId）。 |
| 分段对齐 | CPU 轻量 | transcript 完成后 **同步** 扫一遍 segments，毫秒级 |
| 片段 LLM | **队列 + workerPoolSize** | 默认 **2**，设置可调到 4–6（对齐 `cardGenerationConcurrency` 思路） |
| Rollup 全片 | 串行 1 | 等所有段 understanding 成功或进入 partial 策略 |

**不是**「26 个片段起 26 个线程跑 whisper」。  
**是**「1 次 whisper + 最多 2–4 个 segment 同时在调 LLM」。

失败策略：

- transcript 失败 → 整个 job failed，理解不启动。
- 单段理解失败 → `completed` 不递增，段状态 `failed`，job 可 `partial_completed` 或 failed（M0 门禁定稿）；允许「重试失败段」。

---

## 4. 前端展示（Remix 处理页 · 原片理解步骤）

### 4.1 布局（三块）

```text
┌─ 顶栏 ─────────────────────────────────────────────────────┐
│ 原片理解   [生成原片理解]  [重跑失败段]   状态 chip          │
│ 进度条：阶段 A 全片转写 ✓  |  阶段 B 片段理解 12/26        │
│ 当前：正在理解 seg-012 …                                   │
└────────────────────────────────────────────────────────────┘
┌─ 全片摘要区（rollup 后）──────────────────────────────────┐
│ 剧情线 / 风格 / 二创方向（M3 后才有内容）                    │
└────────────────────────────────────────────────────────────┘
┌─ 片段列表（主工作区）──────────────────────────────────────┐
│ [卡片] 01  00:00-00:10  缩略图  台词摘要  理解摘要  状态  ⋮  │
│ [卡片] 02  ...                                              │
└────────────────────────────────────────────────────────────┘
```

### 4.2 每个片段卡片上展示什么

| 字段 | 来源 | 何时可见 |
|------|------|----------|
| 时间范围、缩略帧 | segment + keyframes | 始终 |
| **台词摘要** | `segment_transcript.plainText` | 阶段 A 完成后 |
| **画面/动作/镜头摘要** | `segment_understanding.visual` 等 | 阶段 B 该段完成后 |
| **video prompt 复制** | `segment_understanding.videoPrompt` | 该段完成后 |
| **状态角标** | 见下表 | 始终 |

**片段状态角标（推荐）**

| 状态 | 含义 |
|------|------|
| `waiting_transcript` | 尚无台词 |
| `transcript_ready` | 台词已对齐，等待理解 |
| `understanding_running` | 当前并发池正在处理该段 |
| `understanding_ready` | 理解 JSON 已落盘 |
| `failed` | 该段失败（悬停看 error） |
| `stale` | 关键帧/台词变更，需重跑 |

列表 **按 segment.index 排序**；`understanding_running` 的卡片可高亮。

### 4.3 与现有 `activeProcessingJob` 的关系

- 整页 **同时只展示 1 个活动 job**（与现 `RemixAssetProcessing.runAction` 一致），避免多按钮互抢。
- Job 进行中：**禁用**「生成原片理解」，展示 `progress.message`。
- 完成后：刷新 snapshot，卡片批量从 mock 统计变为真实 JSON 驱动（M4）。

### 4.4 不建议的 UI

- 不要 N 个进度条每个片段一条 whisper（用户会以为有 N 次语音识别）。
- 不要在理解完成前把阶段 chip 标成「已完成」（M0 门禁）。

---

## 5. 和 issue 的映射

| 能力 | Issue |
|------|-------|
| 抽音频 | 02 |
| 全片 whisper + 对齐 | 03c + aligner（可合在 03c 验收） |
| 片段理解并发池 | 04 |
| 工作台卡片/进度 | 06 |
| 一键编排 | 建议在 04 或单独 **07-orchestrator**（实现时把「生成原片理解」接到 A→B） |

---

## 6. 默认参数（产品可调）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `remix.understanding.concurrency` | 2 | 片段 LLM 并发 |
| `remix.stt.whisperThreads` | 4 | 传给 whisper `-t` |
| `remix.understanding.skipTranscriptIfFresh` | true | inputHash 未变则跳过 whisper |

---

## 7. 变更日志

| 日期 | 说明 |
|------|------|
| 2026-06-26 | 初版：ASR/理解分离、一键编排、前端三块、whisper 单路 + LLM 队列 |


---

## 8. Job progress 字段细化（实现参考）

```ts
interface RemixUnderstandingJobProgress {
  phase: 'transcript' | 'understanding' | 'rollup' | 'done';
  total: number;
  completed: number;
  currentSegmentId?: string;
  message?: string;
  details?: {
    transcriptSkipped?: boolean;
    transcriptEngine?: 'local_whisper_cpp';
    understandingConcurrency?: number;
    failedSegmentIds?: string[];
  };
}
```

| phase | total | completed 含义 |
|-------|-------|----------------|
| transcript | 1 | 0=进行中，1=对齐完成 |
| understanding | segmentCount | 已成功 LLM 的段数 |
| rollup | 1 | 全片索引写入 |

前端顶栏文案映射：

- transcript + completed=0 → 「正在转写全片台词…」
- understanding + completed=k → 「正在理解片段 k/N」
- rollup → 「正在汇总全片…」

---

## 9. IPC / 服务边界（建议）

| 用户动作 | 调用链 |
|----------|--------|
| 生成原片理解 | `runSourceUnderstanding` → **Orchestrator.run** |
| 重跑失败段 | `rerunSegmentUnderstanding(segmentId)` → 仅 phase understanding 单段 |
| 强制重跑台词 | `runSourceTranscript({ force: true })` → 仅 02+03c+align |

Orchestrator 内部子步骤**不**各建独立顶层按钮（MVP）；高级入口可收到「…」菜单。

---

## 10. 并发默认值与资源保护

| 参数 | 默认 | 上限建议 | 备注 |
|------|------|----------|------|
| `remix.understanding.concurrency` | 2 | 6 | 受 LLM 限速与内存约束 |
| `remix.stt.whisperThreads` | 4 | CPU 核数 | 传给 `main -t` |
| 同素材并行 whisper | 1 | 1 | 硬约束 |

Electron 主进程用 **p-queue** 或自研 worker 池均可；须持久化 job 进度供刷新恢复（对齐 ui-recovery #16）。

---

## 11. 变更日志

| 日期 | 说明 |
|------|------|
| 2026-06-26 | §8–§10 细化 progress、IPC、并发；issue 07 |
