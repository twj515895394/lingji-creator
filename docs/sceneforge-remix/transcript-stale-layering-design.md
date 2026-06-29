# 台词纠偏后 Segment Understanding 失效策略分层

> 状态：**待维护者确认**（确认后 Issue 09 可开工）  
> 关联：Issue 08 / 09 · handoff 20260629-170233

## 1. 问题

当前 `inputHash` 将 `effectiveTranscript`（plainText）纳入指纹；任意台词纠偏导致 `transcript_correction_changed`，整段理解被标为过期。轻微错字修正时，视觉/镜头层理解往往仍有效，产品体感「过重」。

## 2. 变更档位（首版）

| 档位 | 判定（首版） | 应失效的理解依赖层 | 建议仍视为有效 |
|------|----------------|-------------------|----------------|
| **轻微纠偏** | 编辑后与 ASR 原文的归一化文本相似度 ≥ 阈值（建议 0.92，基于字符级 ratio 或 token 编辑距离，实现时选一） | `audio`、`story`、`remix`、`videoPrompt` | `visual`、`camera`、`frameVision` 相关展示与 hash 子域 |
| **语义改写** | 低于阈值，或用户勾选「语义已改」、或手动改写超过 N 字且相似度低 | 整段理解（与现行为一致） | 无 |

首版 **不做** 自动 NLP 语义分类；仅相似度 + 可选 UI「本次为语义改写」勾选（Issue 09 可选做勾选）。

## 3. 理解子层映射

- **视觉稳定层**：`visual`、`camera`、frame vision 衍生字段（展示与 gate 的 `frame_vision` / `keyframes` 变更仍按现有逻辑）。
- **Transcript 依赖层**：`audio`、`story`、`remix`、`videoPrompt`（及 rollup 对全片的间接影响：仅当存在语义改写档时标记 rollup stale）。

## 4. 与现有 gate 的关系

- 保留现有 `transcript_correction_changed` 原因码，新增细分：
  - `transcript_correction_minor` → 仅 transcript 依赖层 stale
  - `transcript_correction_semantic` → 整段 stale（等同今日 `transcript_correction_changed`）
- `inputHash`：首版可不拆 hash，而在 workbench **展示层** 根据纠偏档位计算 `layerStale`；若 09 实现时发现必须拆 hash，再增加 `transcriptTier` 字段写入 correction 文档。

## 5. UI 文案

- 轻微纠偏：`台词已微调；画面/镜头理解仍可用，剧情与视频提示词建议重跑本段理解。`
- 语义改写：保持现有 `台词已被修改，本段大模型分析已过期，建议重跑本段理解。`
- 避免无差别使用「整段全失效」。

## 6. 不做（首版）

- 用户补充建议持久化为 segment note（Issue 07 已做一次性 hint）
- 自动 NLP 严重度检测
- 修改 ASR 重跑语义

## 7. 验收（Issue 09）

- 单元测试：轻微 vs 语义两档的 workbench `layerStale` / 提示文案
- 回归：一键确认台词、ASR 重跑、重跑本段理解弹窗

---

**确认记录**：（维护者确认后在此填写日期与签名）