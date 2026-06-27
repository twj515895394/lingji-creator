Status: ready-for-agent

# M2：片段级结构化理解生成（Balanced MVP）

## 问题陈述

缺少每段多模态（关键帧 + 台词）驱动的结构化理解 JSON 与 videoPrompt，无法复用于二创与生成。

## 解决方案

对每个 `SourceSegment` 组装输入上下文，调用结构化 LLM，生成并校验 `segment_understanding` JSON（含 visual/camera/audio/story/remix/videoPrompt/quality），支持单段重跑与失败恢复。

## 用户故事

1. 作为资产处理用户，我想每段都有画面与动作客观描述，以便人工校对。
2. 作为资产处理用户，我想每段都有可复制的 positive/negative/motion/camera prompt，以便喂给视频模型。
3. 作为资产处理用户，我想重跑单段理解，以便节省成本。
4. 作为开发者，我想 JSON schema 校验失败时阶段失败而非静默 approved。

## 实现决策

- 默认 Balanced：start/middle/end 关键帧路径 + 分段 transcript + 前后段摘要（可选）。
- 输出版本字段 `version`、`inputHash`、`promptVersion`。
- 批量生成：可顺序或有限并发；进度写入 processing job（与 ui-recovery #16 契约兼容）。
- 替换当前占位 `RemixUnderstandingService` 写汇总逻辑为真实生成 + 落盘 per-segment 文件。
- 保留 `segment_analysis.md` 作为人类可读导出（可由 JSON 渲染）。

## 测试决策

- schema 校验器单测（必填字段、空台词、无关键帧警告）。
- 集成：mock LLM 返回固定 JSON → 文件落盘 + 阶段门禁通过。
- 先例：`generateStructuredData` 相关 LLM 测试模式、`sceneforge-remix-understanding.test.ts` 升级。

## 超出范围

- Accurate 模式（视频直传）
- 全片 rollup（M3）

## 进一步说明

阻塞：M0；强依赖 M1 或已验证的全片 SRT 对齐。


## 编排

全片 ASR/对齐与片段 LLM **分开**；见 `docs/sceneforge-remix/remix-understanding-orchestration-and-ui.md`。
