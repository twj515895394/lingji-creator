Status: completed

## 父问题

`.scratch/sceneforge-studio-p0/PRD.md`

## 要构建什么

在创建 SceneForge 项目流程增加 **entryPath** 单选：`source_intake`（从视频/链接解析开始）或 `topic_gate`（从选题与想法开始）。写入 `project.json.sceneforge.entryPath`，默认 `topic_gate`。说明选 intake 后仍经过完整 topic_gate。

## 验收标准

- [ ] 新建项目可二选一入口并持久化
- [ ] 类型与 project-persistence 含 entryPath，旧项目兼容默认值
- [ ] Vitest 或持久化测试覆盖默认与写入

## 被阻塞于

无 - 可以立即开始