Status: ready-for-human

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

完成六个支撑阶段的自动化回归，并在 Electron 中使用真实 Provider 验证 reference、script、performance、audio 的生成、审阅、提交、校验和手工降级路径。

## 验收标准

- [ ] 六阶段均有 Pack/能力/Context/submit 自动化测试
- [ ] reference、script、performance、audio 至少各真实运行一次
- [ ] 每次运行结果均需手动提交
- [ ] 手工 Markdown 路径在所有阶段仍可用
- [ ] SceneForge 全量测试和 TypeScript 通过
- [ ] handoff 记录模型、耗时、失败与恢复，不包含密钥

## 被阻塞于

- `02-audio-direct-llm.md`
- `03-reference-stage-pack.md`
- `04-story-stage-pack.md`
- `05-assets-stage-pack.md`
- `06-script-stage-pack.md`

## 类型

HITL

