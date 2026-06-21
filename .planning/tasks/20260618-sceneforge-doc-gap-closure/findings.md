# Findings

## 2026-06-18

- 现有完整包：`sceneforge-core-llm-happy-path`、`sceneforge-gate-intake-card-hitl`、`sceneforge-continue-and-run`、`sceneforge-support-pack-wave`。
- `Flow Hardening` 当前只有 `PRD.md`、`PROBLEM-ANALYSIS.md`、issues、`progress.md`，明确缺少详细设计和 `IMPLEMENTATION-PLAN.md`。
- handoff `20260618-212256` 中新增 backlog 包含：
  - P0-1 Direct LLM 真机 E2E 清单
  - P1-1 Style / `selectedAssetIds` 选择器
  - P1-2 Regenerate / Request Revision
  - P1-3 Publish Stage 工作区
  - P1-4 Continue 产品文案
  - P2-1 ACP factory 接线
  - P2-2 Studio ACP 文案
- 其中部分需求可并入同一文档包：
  - ACP factory 接线 + Studio ACP 文案可归入一个 ACP Studio 包
  - Continue 产品文案可作为 Studio UX refinement 的 issue，而不必单独成包
- 旧 issue 可作为“历史来源”，但不足以替代当前阶段需要的 PRD / 设计 / 计划。
