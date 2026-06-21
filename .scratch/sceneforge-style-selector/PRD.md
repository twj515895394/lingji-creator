Status: ready-for-agent

# PRD：SceneForge Style Selector 与 selectedAssetIds

## 问题陈述

Scene Asset Library 已经迁移完成，Stage Context 也支持按 `selectedAssetIds` 注入资产片段，但维护者在 Studio 中还没有完整的选择、保存和回显路径。结果是：资产库存在、上下文能力存在，但项目层面的 style / asset 选择仍停留在半成品状态，后续阶段无法稳定复用这些选择。

## 解决方案

建立一个独立的 Style Selector 文档包，定义：

1. 项目级 style profile 与 selected asset ids 的状态模型。
2. Studio 中的选择器、回显与保存行为。
3. service / IPC / context builder 的透传边界。
4. 与历史 issue 10 的关联和新的验收口径。

## 用户故事

1. 作为创作者，我想在 Studio 里看到可用 style profile，以便为项目选定统一视觉风格。
2. 作为创作者，我想附加选择若干 scene assets，以便特定阶段注入方法库或风格片段。
3. 作为创作者，我想重新打开旧项目时看到之前的选择，以便保持连续性。
4. 作为创作者，我想让 design、storyboard、video_prompts 自动消费这些选择，以便减少手工复制。
5. 作为创作者，我想知道哪些资产会进入上下文，哪些不会，以便避免噪音。
6. 作为维护者，我想让 registry 成为唯一资产源，以便不引入目录扫描漂移。
7. 作为维护者，我想排除 source materials，以便防止把不该进运行时的资料暴露给模型。
8. 作为维护者，我想把 style / asset 选择定义成项目级状态，以便后续真机验收稳定复现。

## 实现决策

- 复用现有 asset registry 与 style profile loader。
- 选择结果是项目持久状态，不是每次运行单独输入。
- 首版支持单个 style profile 与多个 selected asset ids。
- UI 只展示 registry 中声明且允许运行时消费的条目。
- 若未选择 style，系统保持可运行，但对关键阶段给出提示。

## 测试决策

- 状态模型测试：保存、读取、回显。
- context builder 测试：按选择结果注入 asset snippets。
- UI 测试：选择器列表、保存、重新打开项目回显。
- 真机验收：至少观察 design 阶段上下文消费结果。

## 超出范围

- 新增 style library 内容。
- source materials 导入。
- 自动推荐或评分 style profile。
- 阶段级临时覆盖项目级选择。

## 进一步说明

- 历史来源：`.scratch/sceneforge-studio/issues/10-scene-asset-library-and-style-profiles.md`
- 本包用于把旧 issue 升级为完整的后续实现包。
