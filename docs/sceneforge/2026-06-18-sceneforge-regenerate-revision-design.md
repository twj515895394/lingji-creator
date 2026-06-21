# SceneForge Regenerate / Request Revision — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-regenerate-revision/PRD.md`

## 1. 目标

让 Studio 对“重新生成当前草案”和“请求修订已提交产物”这两种常见动作提供清晰、受控的产品入口，而不是要求维护者手工回退或重跑整个阶段。

## 2. 行为边界

- Regenerate：针对当前未提交草案或当前阶段重新运行一次。
- Request Revision：针对已提交 / 已审批产物发起修订请求，保留上游上下文与历史版本。
- 两者都不绕过现有 Artifact Store、Validator、Approval。

## 3. 设计重点

- 明确草案态与已提交态的动作区别。
- 明确修订请求如何进入现有 service seam，而不是新增旁路写盘。
- 明确重跑时哪些内容会被覆盖，哪些内容会保留。

## 4. 风险

- 若把 regenerate 和 revision 混成一个按钮，用户会不清楚是否影响已提交内容。
- 若修订请求绕过既有状态机，会破坏审批链的可追溯性。
