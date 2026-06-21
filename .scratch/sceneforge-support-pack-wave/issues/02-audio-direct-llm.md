Status: completed

## 父问题

`.scratch/sceneforge-support-pack-wave/PRD.md`

## 要构建什么

复用已存在的 audio Pack 和通用支撑 Runner 路径，让 audio 基于 storyboard、performance 和 design 上下文生成 `audio_design`，经审阅后提交和校验。

## 验收标准

- [x] audio output contract 与阶段定义一致
- [x] audio context policy 包含 storyboard 和 performance
- [x] mock run 返回非空 `audio_design`
- [x] submit 后 audio validator passed
- [x] 手工 audio 提交保持可用

## 完成证据

- Audio Pack 的 output contract 为 `audio_design`。
- context policy 必选 storyboard 与 performance，可选 design master。
- mock run 不写盘，显式 submit 后 validator passed。
- 手工 audio submit 回归通过。
- 目标回归：6 files / 55 tests passed；`npx tsc --noEmit` passed。
- 严格 Review：Blocking 0；修复 context policy 注册表导出命名误导，并保留兼容别名。

## 被阻塞于

- `01-performance-direct-llm.md`

## 类型

AFK
