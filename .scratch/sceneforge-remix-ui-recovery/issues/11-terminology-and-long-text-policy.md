Status: ready-for-agent

# 术语统一与长文本展示策略收口

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

统一 Remix 前端的中文术语、状态文案和长文本展示策略，减少中英混排、工程术语外露和长路径直接占主视觉的问题。

端到端行为：

- Source Asset / Variant / Segment / Processing 等术语按统一中文呈现。
- 标题、文件名、路径、ID 各自有稳定的截断或展开规则。
- 资产库、处理页、Inspector 的文案策略一致。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`。
- 术语替换必须基于产品语义，不做危险的全局字符串替换。
- 这是收口票，不应顺手带入新的布局重构。

## 验收标准

- [ ] 页面默认使用统一中文术语，明显减少中英混排
- [ ] 长标题、路径、ID 均有统一展示策略
- [ ] tooltip / 折叠 / 复制入口能补足被截断的信息
- [ ] 文案读起来像产品，而不是内部状态页

## Review Checklist

- [ ] 避免危险的全局替换，尤其是代码标识符与测试用例名称
- [ ] 统一词汇表在资产库、处理页、Creation 相关区块中保持一致
- [ ] 长文本策略没有破坏可访问性和复制能力

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新文案 / 组件测试，覆盖关键标签和长文本场景
- [ ] 手动验收：页面标题、按钮、状态词、tooltip 行为一致

## 涉及范围

- Remix 资产库、处理页、阶段导航、Inspector 相关前端组件
- 相关 view model / 文案映射代码

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/08-processing-workbench-hero-and-layout-hardening.md`
- `.scratch/sceneforge-remix-ui-recovery/issues/09-inspector-overflow-and-technical-info.md`
- `.scratch/sceneforge-remix-ui-recovery/issues/10-published-vs-processing-card-split.md`
