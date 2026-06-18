Status: completed

## 父问题

`.scratch/sceneforge-studio-p0/PRD.md`

## 要构建什么

重构 Studio 为贴边三栏 Shell：去掉全页 24px 卡片式布局；列用 separator；列头 40px。接入 04/05 侧栏数据。功能行为可与现版等价（仍可用旧中右内容）。

## 验收标准

- [ ] 三栏 grid 与 DESIGN.md / Editor 结构一致
- [ ] 侧栏渲染全阶段列表
- [ ] 无新增硬编码字阶（改用 tokens）

## 被阻塞于

- 04
- 05