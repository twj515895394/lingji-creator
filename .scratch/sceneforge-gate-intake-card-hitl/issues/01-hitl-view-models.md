Status: completed

## 父问题

`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`

## 要构建什么

扩展 HITL Markdown 解析层，为改编方向、选题评分、决策和风格提供稳定 View Model，同时保持已有 artifact 文本兼容。

## 验收标准

- [x] 评分支持中英文冒号列表项
- [x] 评分 value 保留原始字符串
- [x] 缺失评分、方向或 family 时返回诚实空值
- [x] 既有 builder 输出格式保持兼容
- [x] parser 单元测试覆盖正常、边界和旧格式

## 完成证据

- 新增 `parseGateScoresFromMarkdown` 与评分 View Model。
- `tests/sceneforge-hitl-markdown.test.ts`：7 tests passed。

## 被阻塞于

无 - 可以立即开始

## 类型

AFK
