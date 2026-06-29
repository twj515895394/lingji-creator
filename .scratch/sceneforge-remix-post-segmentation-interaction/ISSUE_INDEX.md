Status: ready-for-agent

# SceneForge Remix 切片后交互与 ASR 收口 — Issue 总索引

> 本文档聚焦 `真实镜头切片` 之后的体验收口，不覆盖新的原片理解主干能力设计。  
> 相关背景：[`docs/sceneforge-remix/sensevoice-asr-integration-design.md`](../../docs/sceneforge-remix/sensevoice-asr-integration-design.md) · [`.handoff/handoff-20260629-sensevoice-asr-integration.md`](../../.handoff/handoff-20260629-sensevoice-asr-integration.md) · [`.handoff/handoff-20260629-170233.md`](../../.handoff/handoff-20260629-170233.md)（原片理解语义与 stale 分层）

---

## 1. 分叉树

```text
01 控制栏与 ASR 选择统一
 └─ 02 切片后阶段的片段点击 → 预览联动
      ├─ 03a 全量片段 ASR 重跑
      ├─ 03b 单片段 ASR 重跑
      └─ 04 台词确认收口与 stale 清理
           └─ 05 回归与验收（批次 A）

06 ASR 下拉双箭头修复 ─┬─ 07 重跑本段理解弹窗 + hint
08 stale 分层设计(HITL) ─→ 09 stale 分层实现
06 + 07 + 09 ───────────→ 10 动作分组 + 组合回归(HITL)
```

说明：

- `01` 负责把 ASR 选择入口做成统一样式与统一状态源。
- `02` 负责从 `真实镜头切片` 开始，所有后续阶段点击片段卡片都联动预览区。
- `03a / 03b` 共享 `01` 的 ASR 选择值，不再各自维护引擎状态。
- `04` 负责把“一键确认所有片段台词”后的假 stale / 假脏状态收口。
- `05` 是验收与回归门，避免 UI、交互、状态、ASR 调用各自修完却组合出新问题。

---

## 2. Issue 一览

| ID | 文件 | 标题 | 类型 | 阻塞于 | 关键词 |
|----|------|------|------|--------|--------|
| **01** | [`issues/01-asr-control-bar-unification.md`](issues/01-asr-control-bar-unification.md) | ASR 控制栏统一样式与单一状态源 | AFK | 无 | ASR select, control bar, shared state |
| **02** | [`issues/02-post-segmentation-segment-preview-linking.md`](issues/02-post-segmentation-segment-preview-linking.md) | 切片后阶段的片段点击预览联动 | AFK | 01（建议） | preview, seek, autoplay, segment card |
| **03a** | [`issues/03a-bulk-segment-asr-rerun.md`](issues/03a-bulk-segment-asr-rerun.md) | 全部片段音频 ASR 重跑 | AFK | 01 | full rerun, transcript, preferred engine |
| **03b** | [`issues/03b-single-segment-asr-rerun.md`](issues/03b-single-segment-asr-rerun.md) | 单片段音频 ASR 重跑 | AFK | 01,03a（建议） | single rerun, transcript, segment |
| **04** | [`issues/04-transcript-confirmation-stale-closure.md`](issues/04-transcript-confirmation-stale-closure.md) | 台词确认后的 stale 收口 | AFK | 03a,03b（建议） | confirm all, stale, ready_for_review |
| **05** | [`issues/05-regression-and-acceptance.md`](issues/05-regression-and-acceptance.md) | 回归与验收收口 | HITL | 01,02,03a,03b,04 | regression, electron acceptance |
| **06** | [`issues/06-asr-select-double-chevron-fix.md`](issues/06-asr-select-double-chevron-fix.md) | ASR 引擎下拉去除双箭头 | AFK | 无 | Select, customSelect, chevron |
| **07** | [`issues/07-rerun-segment-understanding-hint-dialog.md`](issues/07-rerun-segment-understanding-hint-dialog.md) | 重跑本段理解弹窗与一次性 hint | AFK | 无 | rerun understanding, dialog, prompt |
| **08** | [`issues/08-transcript-stale-layering-design.md`](issues/08-transcript-stale-layering-design.md) | 台词纠偏后失效策略分层（设计） | HITL | 无 | stale, transcript correction, design |
| **09** | [`issues/09-transcript-stale-layering-implementation.md`](issues/09-transcript-stale-layering-implementation.md) | 失效分层落地（workbench + UI） | AFK | 08 | inputHash, workbench, layered stale |
| **10** | [`issues/10-understanding-actions-grouping-and-regression.md`](issues/10-understanding-actions-grouping-and-regression.md) | 理解区动作分组与组合回归 | HITL | 06,07,09 | action grouping, acceptance |

---

## 3. 推荐执行顺序

**批次 A（切片后 ASR/预览）**：`01` → `02` → `03a` → `03b` → `04` → `05`

**批次 B（原片理解语义与 stale）**：`06` ∥ `07` → `08` → `09` → `10`（`06`/`07` 可并行；`09` 依赖 `08` 确认；`10` 收口 UI 与真机回归）

原因（批次 A）：

- 先把 ASR 选择值收口为单一来源，后续全量重跑和单段重跑才能不重复接线。
- 预览联动是跨多个阶段的通用交互，先收掉更利于后续在同一片段卡片上叠加操作。
- stale 收口必须建立在“全量 / 单段 ASR 重跑”完成后的真实状态流上，否则容易把应该提示的脏状态误清掉。

原因（批次 B）：

- `06` 为明确 UI bug，与功能链解耦，可先合入。
- `07` 与 `06` 无硬依赖，但 `10` 的分组命名需对齐 `07` 文案。
- `08`→`09` 避免未设计就改 freshness gate。
- `10` 合并 Issue 05 类验收并覆盖 06–09，避免只跑单测不验组合链路。

---

## 4. 范围边界

本轮要做：

- 统一 ASR 控制区样式与状态源
- `真实镜头切片` 之后阶段的片段点击预览联动
- 全量片段 ASR 重跑
- 单片段 ASR 重跑
- 一键确认后的 stale 状态真正清理

批次 B 追加：

- ASR 选择器双箭头样式修复
- 「重跑本段理解」弹窗与一次性用户补充 hint
- 台词纠偏 vs 语义改写的分层 stale（设计 + 实现）
- 原片理解区台词/理解动作分组与组合回归

本轮不做：

- 新增第二处 ASR 选择器
- 改写全片理解主编排为“每次只跑 transcript”
- 变更 SenseVoice / Whisper provider 的底层识别算法
- 对 `真实镜头切片` 之前阶段增加片段预览联动
- 批次 B 首版将用户补充建议持久化为 segment note（除非后续单独立项）
- 批次 B 首版自动 NLP 严重度检测（除非 Issue 08 明确纳入）

---

## 5. 当前代码现状（供执行前快速定位）

- 主页面：[`src/sceneforge/remix/pages/RemixAssetProcessing.tsx`](../../src/sceneforge/remix/pages/RemixAssetProcessing.tsx)
- 理解工作台：[`src/sceneforge/remix/components/UnderstandingWorkbenchPanel.tsx`](../../src/sceneforge/remix/components/UnderstandingWorkbenchPanel.tsx)
- 资产视图模型：[`src/sceneforge/remix/lib/remix-workspace-view-model.ts`](../../src/sceneforge/remix/lib/remix-workspace-view-model.ts)
- Remix IPC 契约：[`electron/sceneforge/remix/remix-ipc-types.ts`](../../electron/sceneforge/remix/remix-ipc-types.ts)
- Transcript 服务：[`electron/sceneforge/remix/remix-transcript-service.ts`](../../electron/sceneforge/remix/remix-transcript-service.ts)
- Understanding 编排：[`electron/sceneforge/remix/remix-understanding-orchestrator.ts`](../../electron/sceneforge/remix/remix-understanding-orchestrator.ts)
- 页面测试：[`tests/sceneforge-remix-asset-processing.test.tsx`](../../tests/sceneforge-remix-asset-processing.test.tsx)
- SenseVoice 测试：[`tests/sceneforge-remix-sensevoice-provider.test.ts`](../../tests/sceneforge-remix-sensevoice-provider.test.ts)

