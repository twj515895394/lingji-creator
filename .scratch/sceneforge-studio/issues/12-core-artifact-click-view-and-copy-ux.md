Status: completed-local

# 核心产物点击查看与复制交互

Type: HITL

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

在 SceneForge Studio 中补齐三个核心阶段最终产物的 UI 细节：阶段行和产物列表都可以点击打开最终产物；中间工作区展示该阶段的核心产物摘要和可复制内容块；右侧 Artifact Inspector 提供 Preview、Structure、Copy、Trace、Raw 视图。用户可以复制完整产物、复制当前 section、复制单条 prompt，点击后立刻显示复制成功反馈。

这张票聚焦“用户能不能舒服地看到并拿走最终内容”，不做复杂富文本编辑器，也不做 storyboard grid。

## 验收标准

- [ ] 左侧 Pipeline Flow 中 Design、Storyboard、Video Prompts 阶段完成后显示核心 final artifact 入口。
- [ ] 点击阶段行时，中间工作区默认打开该阶段最终产物概览。
- [ ] 点击具体 artifact 时，右侧 Artifact Inspector 打开该 artifact，并高亮当前选中项。
- [ ] Artifact Inspector 增加 Copy 视图或复制区域，展示来自 Display Model 的 copy blocks。
- [ ] 每个 copy block 有复制按钮；复制成功后显示短反馈，并且不会改变当前选中状态。
- [ ] 支持 Copy Full、Copy Section、Copy Prompt 三种粒度；缺少某粒度时不显示空按钮。
- [ ] Raw 视图保留整份 Markdown 的复制能力。
- [ ] UI smoke test 覆盖点击打开核心产物、复制按钮调用 clipboard、成功反馈展示。

## Review Checklist

- [ ] 核心产物在第一屏或一级交互内可见，不需要用户去文件树深处找。
- [ ] 按钮使用明确短文本或现有图标模式，复制反馈清晰但不打断工作流。
- [ ] 长 prompt 内容可滚动、可选择、可复制，不撑破三栏布局。
- [ ] 空状态、解析 warning、clipboard 失败都有可理解提示。
- [ ] 不把 raw Markdown 当成唯一 UI；优先使用 Display Model 展示结构化内容。
- [ ] 复制出的文本和界面展示一致，没有混入隐藏字段、trace、validator 信息。
- [ ] 最小桌面窗口下按钮和内容不重叠、不溢出。

## 被阻塞于

- Issue 07：需要 Studio UI、Artifact Inspector 与审批控件基础。
- Issue 11：需要核心产物 Display Model 与可复制内容块。

