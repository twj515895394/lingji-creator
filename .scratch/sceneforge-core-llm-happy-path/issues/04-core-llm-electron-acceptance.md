Status: ready-for-human

## 父问题

`.scratch/sceneforge-core-llm-happy-path/PRD.md`

## 要构建什么

完成三个 Core 阶段的 mock 端到端回归，并在 Electron 中使用真实应用 LLM 设置至少走通 design 的生成、审阅、提交、校验和 Continue，记录可复现的验收证据。

## 验收标准

- [ ] design、storyboard、video_prompts 均有 mock run → submit → validate 测试
- [ ] SceneForge 全量测试和 TypeScript 通过
- [ ] Electron 中至少真实运行 design 并生成五项草案
- [ ] 草案提交前项目产物库不变化，提交后出现对应产物
- [ ] 验收记录不包含 API Key、完整 Prompt 或敏感项目内容

## 被阻塞于

- `03-review-and-submit-generated-drafts.md`

## 类型

HITL

