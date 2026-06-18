Status: ready-for-agent

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

以 performance 为首条端到端追踪子弹，建立显式 Runner 能力、支撑阶段草案审阅与提交，使现有 performance Pack 可通过 Direct LLM 生成并通过校验，同时保留手工编辑。

## 验收标准

- [ ] performance 在能力表中支持 direct_llm
- [ ] mock Provider 返回 `performance_direction`
- [ ] run 不写盘，用户提交后才写入产物库
- [ ] 提交后 performance validator passed
- [ ] Studio 同时保留 Direct LLM 和手工 Markdown
- [ ] 其他未开放支撑阶段仍被拒绝

## 被阻塞于

- `.scratch/sceneforge-core-llm-happy-path/issues/03-review-and-submit-generated-drafts.md`

## 类型

AFK

