Status: ready-for-agent

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

创建 script 标准 Stage Pack，让剧本草案基于 story、design handoff 和时长约束生成 `script_draft`，为 performance 和 storyboard 提供真实上游输入。

## 验收标准

- [ ] script Pack 标准文件齐全
- [ ] context policy 包含 story、design 和时长设置
- [ ] output contract 只要求 `script_draft`
- [ ] mock run → submit → validate 通过
- [ ] performance context 可读取提交后的 script
- [ ] 手工 script 提交保持可用

## 被阻塞于

- `01-performance-direct-llm.md`
- `.scratch/sceneforge-core-llm-happy-path/issues/01-lock-core-output-contracts.md`

## 类型

AFK
