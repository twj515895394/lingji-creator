# SceneForge 后续文档包索引

> 日期：2026-06-18  
> 目的：把 handoff `20260618-212256` 中新增的后续 backlog，映射到可执行的 PRD / 设计 / 计划 / issues 文档包。

## 1. 已存在且完整的 Phase 3 主包

- Core LLM Happy Path：`.scratch/sceneforge-core-llm-happy-path/`
- Gate / Intake Card HITL：`.scratch/sceneforge-gate-intake-card-hitl/`
- Continue & Run：`.scratch/sceneforge-continue-and-run/`
- Support Pack Wave：`.scratch/sceneforge-support-pack-wave/`

## 2. 本轮补齐的后续包

| backlog | 文档包 | 说明 |
| --- | --- | --- |
| LLM 主链收敛总包 | `.scratch/sceneforge-llm-mainline-closure/` | 重新编排现有子包优先级，作为后续实现总入口 |
| Flow Hardening 后续收口 | `.scratch/sceneforge-flow-hardening/` | 为既有 PRD 补齐详细设计与实施计划 |
| P0-1 Direct LLM 真机 E2E | `.scratch/sceneforge-direct-llm-e2e/` | 独立验收清单与记录规则 |
| P1-1 Style / selectedAssetIds | `.scratch/sceneforge-style-selector/` | 将旧 issue 10 升级为完整包 |
| P1-2 Regenerate / Request Revision | `.scratch/sceneforge-regenerate-revision/` | 补齐草案重跑与修订请求边界 |
| P1-2b Draft Refinement | `.scratch/sceneforge-draft-refinement/` | 补齐“基于当前草案 + 一次性补充意见”的整阶段优化能力 |
| P1-2c Topic Gate LLM Analysis | `.scratch/sceneforge-topic-gate-llm-analysis/` | 把 topic_gate 评分/建议改成真实 Direct LLM 闸门，并清理 ACP 话术 |
| P1-3 Publish Stage 工作区 | `.scratch/sceneforge-publish-workspace/` | 定义 publish 边界与首版工作区 |
| P0-3 / P0-4 / P1-4 Studio UX 澄清 | `.scratch/sceneforge-studio-ux-clarity/` | 补齐占位、Continue 与 Runner 文案 |
| P2 ACP 对齐（待做） | `.scratch/sceneforge-acp-studio-alignment/` | factory、文案与验收口径对齐；用户已明确当前先不推进 |

## 3. 来源映射

- handoff：`.handoff/handoff-20260618-212256.md`
- 路线图：`docs/sceneforge/2026-06-18-sceneforge-phase3-roadmap.md`
- 历史 issue：
  - Style / Asset：`.scratch/sceneforge-studio/issues/10-scene-asset-library-and-style-profiles.md`
  - Stage Run UX：`.scratch/sceneforge-studio/issues/20-studio-stage-run-ux-hitl.md`
  - UI 债：`.scratch/sceneforge-next-batch/issues/10-ui-debt-backlog.md`

## 4. 使用顺序建议

1. 先看 `LLM Mainline Closure`，以它作为当前实现主入口。
2. 把 `Flow Hardening`、`Direct LLM E2E` 视作验收基线，而不是新的主攻包。
3. 当前实现优先级先落到 `Draft Refinement` 和主链剩余缺口补齐。
4. `Publish Workspace` 在主链稳定后再推进。
5. `ACP Studio Alignment` 最后处理。
