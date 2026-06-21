Status: ready-for-agent

# PRD：SceneForge Regenerate / Request Revision

## 问题陈述

当前 Studio 已经支持 Run、审阅草案、提交、Validate 和 Continue，但用户在“草案不满意想重来”或“已提交产物需要局部修订”这两种高频场景下，还缺少明确入口。没有这两个动作，维护者只能重跑全阶段、手工覆盖，或依赖口头约定，容易破坏阶段状态和产物可追溯性。

## 解决方案

补齐两个受控动作：

1. Regenerate：重新生成当前阶段草案，不直接覆盖已提交产物。
2. Request Revision：对已提交产物发起修订请求，保留审批链和历史语义。

同时定义它们与现有 service、artifact store、validator、approval 的关系。

## 用户故事

1. 作为创作者，我想对当前阶段草案重新生成，以便在不满意时快速再试一次。
2. 作为创作者，我想知道重新生成是否会覆盖当前未提交草案，以便避免误操作。
3. 作为创作者，我想对已提交内容请求修订，而不是推倒整个阶段重做。
4. 作为创作者，我想保留当前项目的上游上下文和审批链，以便修订不丢失历史。
5. 作为维护者，我想把 regenerate 和 revision 绑定到已有 service seam，以便状态机保持单一真相。
6. 作为维护者，我想让 UI 明确区分草案态动作和已提交态动作，以便减少误解。

## 实现决策

- regenerate 与 revision 是不同动作，不共用同一按钮语义。
- regenerate 面向草案态；revision 面向已提交态。
- revision 继续经过草案、提交、校验、审批链。
- 首版不做复杂 diff 或富文本逐段修订，只定义状态与入口。

## 测试决策

- 草案态重新生成不直接改动已提交产物。
- revision 请求保留阶段上下文与历史状态。
- UI 测试验证按钮可见性与文案边界。

## 超出范围

- 富文本内联编辑。
- 自动合并多次 revision。
- 多阶段批量重新生成。
- 基于当前草案 + 用户补充意见继续优化的新草案能力（见 `.scratch/sceneforge-draft-refinement/`）。

## 进一步说明

- 本包优先补产品与 service 边界，不在当前任务中实现代码。
- “补充反馈后继续优化草案”已拆分为独立后续包：`.scratch/sceneforge-draft-refinement/`。
