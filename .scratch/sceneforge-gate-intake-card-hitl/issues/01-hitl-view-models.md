Status: ready-for-agent

## 父问题

`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`

## 要构建什么

扩展 HITL Markdown 解析层，为改编方向、选题评分、决策和风格提供稳定 View Model，同时保持已有 artifact 文本兼容。

## 验收标准

- [ ] 评分支持中英文冒号列表项
- [ ] 评分 value 保留原始字符串
- [ ] 缺失评分、方向或 family 时返回诚实空值
- [ ] 既有 builder 输出格式保持兼容
- [ ] parser 单元测试覆盖正常、边界和旧格式

## 被阻塞于

无 - 可以立即开始

## 类型

AFK

