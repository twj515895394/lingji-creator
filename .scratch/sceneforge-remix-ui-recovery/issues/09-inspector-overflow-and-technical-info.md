Status: ready-for-agent

# 右侧 Inspector 无横向滚动与技术信息折叠

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

收口右侧 Inspector，只保留当前决策需要的信息，并为长文件名、路径、ID 提供稳定的截断与折叠策略。

端到端行为：

- 右栏不再横向滚动。
- 技术字段默认折叠或弱化展示。
- 右栏主要回答“当前状态 / 下一步 / 关键操作”，而不是复读整个素材档案。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`。
- 右栏结构要服务当前任务，不能继续堆字段。
- 完整路径、ID 等技术信息必须从主视觉区移出。

## 验收标准

- [ ] 右侧 Inspector 不出现横向滚动条
- [ ] 字段和值在长文本场景下仍可读，不裁切到面板外
- [ ] 路径、ID、长文件名默认采用折叠、tooltip 或复制入口
- [ ] 右栏主内容变成状态、阻塞原因、下一步和操作

## Review Checklist

- [ ] detail row 使用统一 grid / flex 规则，且所有 value 容器允许收缩
- [ ] 技术信息折叠策略在资产库和处理页之间尽量一致
- [ ] 没有把完整绝对路径重新塞回常驻文案

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新资产库 / 处理页右栏测试
- [ ] 手动验收：长 ID、长路径、多个 Variant 条目场景下无横滚

## 涉及范围

- `src/sceneforge/remix/components/AssetDetailSidebar.tsx`
- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- 对应样式文件与测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/08-processing-workbench-hero-and-layout-hardening.md`
