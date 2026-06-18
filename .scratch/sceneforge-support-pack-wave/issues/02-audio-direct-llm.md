Status: ready-for-agent

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

复用已存在的 audio Pack 和通用支撑 Runner 路径，让 audio 基于 storyboard、performance 和 design 上下文生成 `audio_design`，经审阅后提交和校验。

## 验收标准

- [ ] audio output contract 与阶段定义一致
- [ ] audio context policy 包含 storyboard 和 performance
- [ ] mock run 返回非空 `audio_design`
- [ ] submit 后 audio validator passed
- [ ] 手工 audio 提交保持可用

## 被阻塞于

- `01-performance-direct-llm.md`

## 类型

AFK

