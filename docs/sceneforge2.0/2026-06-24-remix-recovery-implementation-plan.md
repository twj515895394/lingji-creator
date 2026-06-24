# SceneForge Remix 恢复实施计划

日期：2026-06-24  
文档类型：实施计划 / 执行拆解 / 恢复波次计划  
适用范围：Remix Asset Library、Source Asset Processing Workspace、相关入口与页面跳转  
前置文档：

- 问题审计：[audits/2026-06-24-remix-ui-ux-issue-audit.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/sceneforge2.0/audits/2026-06-24-remix-ui-ux-issue-audit.md)
- P0 恢复方案：[2026-06-24-remix-p0-workflow-recovery-plan.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/sceneforge2.0/2026-06-24-remix-p0-workflow-recovery-plan.md)
- UI 重设计 Brief：[2026-06-24-remix-workbench-ui-redesign-brief.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/sceneforge2.0/2026-06-24-remix-workbench-ui-redesign-brief.md)
- 原开发计划：[2026-06-22-sceneforge-remix-mode-development-plan.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md)

---

## 1. 文档目的

本计划负责把“问题审计”和“恢复方案”转成可执行任务，避免继续停留在抽象讨论层。

本计划只回答四件事：

1. 先改什么，后改什么
2. 每一波要改哪些文件
3. 每一波如何验证
4. 什么时候算这一波完成

这不是长期大重构路线图，而是 **Remix 恢复波次计划**。

---

## 2. 总体策略

恢复顺序固定为：

```text
Wave 0：路径与状态稳定
Wave 1：真实预览与切片验证闭环
Wave 2：资产库可信度恢复
Wave 3：处理页信息架构收口
Wave 4：Workbench UI 视觉秩序重建
Wave 5：文案 / 术语 / 细节收口
```

原则：

1. 先救可用性，再做美化
2. 先恢复中间主工作区，再清理左右侧栏
3. 先用真实能力替换假能力，再重做风格
4. 每一波都必须能单独验收

---

## 3. 范围边界

### 3.1 本计划包含

- Remix 入口与页面落点
- Asset Library
- Source Asset Processing Workspace
- 预览区、切片验证区、关键帧展示区、原片理解区
- 右侧 Inspector / 摘要区
- 文案与状态标签基础统一

### 3.2 本计划暂不包含

- Remix Creation Workspace 深度重做
- Variant 高级管理能力
- Seedance 2.0 Prompt 工作区大改
- 大范围数据结构重构
- 后端算法优化本身

---

## 4. 执行前约束

### 4.1 成功标准

成功不是“看上去更精致”，而是：

1. 用户能稳定进入正确页面
2. 资产卡能认素材
3. 处理页能看真实视频
4. 切片结果能被验证
5. 页面身份和主动作清晰

### 4.2 失败信号

只要出现以下任一情况，就说明当前波次不完整：

1. 页面里还存在大面积“像播放器但不是播放器”的区域
2. 用户点击动作后仍然需要猜系统有没有在工作
3. 中间工作区仍然被左右栏压制
4. 资产识别仍然主要依赖长文件名和长 ID
5. 审计文档列出的 P0 问题没有被实机验证关闭

---

## 5. Wave 0：路径与状态稳定

### 5.1 目标

先把用户从首页进入 Remix 的链路和页面落点稳定下来，避免“进去了但不知道在哪”“回去了但不知道为什么”的混乱感。

### 5.2 任务

1. 固定首页进入 Remix 的统一落点逻辑
2. 固定目录选择成功后的页面跳转
3. 固定 recent project 再打开时的工作区识别
4. 固定关闭 / 返回行为的页面语义
5. 明确每个页面顶部的身份标题与当前上下文

### 5.3 重点文件

- [src/pages/Setup.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/pages/Setup.tsx)
- [src/App.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/App.tsx)
- [src/lib/recent-project-identity.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/lib/recent-project-identity.ts)
- [src/lib/project-navigation.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/lib/project-navigation.ts)
- [electron/recent-projects.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/recent-projects.ts)
- [electron/window-close.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/electron/window-close.ts)
- [src/sceneforge/remix/components/RemixModeEntryDialog.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixModeEntryDialog.tsx)

### 5.4 验证方式

命令：

```bash
npx tsc --noEmit
npx vitest run tests/recent-project-identity.test.ts tests/recent-projects.test.ts tests/setup.test.tsx tests/sceneforge-remix-routing.test.tsx
```

实机路径：

1. 首页点击 Remix
2. 选择资产入库
3. 选目录
4. 确认进入资产库或处理页的落点符合预期
5. 关闭窗口或返回首页
6. 从 recent project 重新打开

### 5.5 完成标准

用户不会再遇到：

- 选完目录后停留在首页
- recent project 打开到错误工作区
- 关闭行为直接退出而不是返回正确页面

---

## 6. Wave 1：真实预览与切片验证闭环

### 6.1 目标

把处理页中间区域从“占位面板”升级成真实媒体工作区。

### 6.2 任务

1. 接入真实视频预览组件
2. 让中间区展示当前素材真实画面
3. 给切片结果绑定视频时间位置
4. 允许点击 segment 跳转视频位置
5. 播放视频时同步高亮当前 segment
6. 将当前表格从主结果区降级为辅助验证区

### 6.3 重点文件

- [src/sceneforge/remix/pages/RemixAssetProcessing.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx)
- [src/sceneforge/remix/components/SegmentTimeline.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTimeline.tsx)
- [src/sceneforge/remix/components/SegmentTable.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTable.tsx)
- [src/sceneforge/remix/components/SourceOverviewPanel.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SourceOverviewPanel.tsx)
- [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css)
- [src/lib/video-import-preview.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/lib/video-import-preview.ts)
- [src/components/PreviewPanel.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/components/PreviewPanel.tsx)

### 6.4 技术策略

优先复用现有预览与媒体能力，不另造一套新的预览播放器。

允许的恢复策略：

- 先用已有播放器能力把素材预览接上
- 再在其下方挂切片验证轨道

不建议：

- 再写一个看起来像播放器的自定义壳子
- 先做漂亮样式，再补真实媒体

### 6.5 验证方式

命令：

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-remix-stage-nav.test.tsx
```

实机路径：

1. 打开某份素材
2. 在处理中页看到真实视频
3. 点击运行切片
4. 完成后逐段点击验证
5. 播放视频时观察 segment 联动

### 6.6 完成标准

满足以下条件才算结束：

1. 中间区有真实视频
2. 切片结果和视频可双向联动
3. 用户不再需要靠文字猜切片结果

---

## 7. Wave 2：资产库可信度恢复

### 7.1 目标

让 Asset Library 从“概念卡片列表”恢复成“素材识别与分发页”。

### 7.2 任务

1. 资产卡接入真实缩略图或代表帧
2. 收紧卡片说明文与指标数量
3. 强化卡片标题、时长、状态、主动作的优先级
4. 重写右侧详情栏，减少重复说明文
5. 让“继续处理 / 创建二创”行为更明确

### 7.3 重点文件

- [src/sceneforge/remix/pages/RemixAssetLibrary.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetLibrary.tsx)
- [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx)
- [src/sceneforge/remix/components/AssetGrid.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetGrid.tsx)
- [src/sceneforge/remix/components/AssetDetailSidebar.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetDetailSidebar.tsx)
- [src/sceneforge/remix/components/AssetLibrary.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetLibrary.module.css)
- [src/components/AssetThumbnail.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/components/AssetThumbnail.tsx)

### 7.4 验证方式

实机路径：

1. 导入多份不同素材
2. 返回资产库
3. 不看长 ID，只靠卡片判断素材
4. 选中资产并核对右栏信息

### 7.5 完成标准

1. 资产卡第一眼可识别
2. 右栏主要做确认，不再复读卡片文案
3. 页面主动作清楚

---

## 8. Wave 3：处理页信息架构收口

### 8.1 目标

在真实工作区成立后，收紧处理页的信息结构，减少噪音和重复。

### 8.2 任务

1. 重新定义左栏、主区、右栏各自职责
2. 精简顶部大段说明文
3. 将原片理解区拆成结构化摘要 + 明细
4. 将人工标注区与理解区形成顺手的操作顺序
5. 将状态展示从“处处都是状态”收敛成“当前步骤状态”

### 8.3 重点文件

- [src/sceneforge/remix/pages/RemixAssetProcessing.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx)
- [src/sceneforge/remix/components/SourceOverviewPanel.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SourceOverviewPanel.tsx)
- [src/sceneforge/remix/components/AnnotationEditor.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AnnotationEditor.tsx)
- [src/sceneforge/remix/components/RemixStageNav.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixStageNav.tsx)
- [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css)

### 8.4 验证方式

人工检查：

1. 用户不需要读长说明文也能理解当前任务
2. 右栏不再成为长文本堆积区
3. 原片理解区可快速扫读

### 8.5 完成标准

处理页不再像“多个说明卡 + 一个空预览区”的组合，而是明确的一体化工作区。

---

## 9. Wave 4：Workbench UI 视觉秩序重建

### 9.1 目标

在主流程可信后，统一工作台的布局、排版、组件与视觉系统。

### 9.2 任务

1. 建立统一的标题 / 正文 / 辅助说明 / 标签 / 数字层级
2. 收紧圆角、边框、背景、渐变使用
3. 重新定义按钮体系
4. 重新分配三栏权重
5. 减少卡片化，强化工作区骨架

### 9.3 重点文件

- [src/sceneforge/remix/pages/RemixWorkspaceShell.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixWorkspaceShell.module.css)
- [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css)
- [src/sceneforge/remix/components/AssetLibrary.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetLibrary.module.css)
- [src/ui/styles/tokens.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/ui/styles/tokens.css)
- [src/ui/components/button.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/ui/components/button.tsx)

### 9.4 验证方式

人工审查：

1. 第一眼能找到中间主工作区
2. 页面不再像深色营销页
3. 字体、字号、标签、间距节奏统一

### 9.5 完成标准

用户第一反应应从“乱七八糟”变成“这是个工具工作台”。

---

## 10. Wave 5：文案 / 术语 / 细节收口

### 10.1 目标

清掉大量中英混排和工程术语外露，统一状态词与页面文案。

### 10.2 任务

1. 统一 Asset / Variant / Segment / Pending 等术语表达
2. 清理英文指标标签
3. 缩短说明文
4. 为长标题、长路径、长 ID 设计截断与展开规则
5. 统一状态颜色与命名

### 10.3 重点文件

- [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx)
- [src/sceneforge/remix/components/AssetDetailSidebar.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetDetailSidebar.tsx)
- [src/sceneforge/remix/components/SegmentTable.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTable.tsx)
- [src/sceneforge/remix/components/SegmentTimeline.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTimeline.tsx)
- [src/sceneforge/remix/lib/remix-workspace-view-model.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/lib/remix-workspace-view-model.ts)
- [src/sceneforge/remix/lib/remix-stage-nav.ts](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/lib/remix-stage-nav.ts)

### 10.4 验证方式

人工审查：

1. 不再出现大面积英文指标标签
2. 页面文案读起来像产品，而不是像内部状态页

### 10.5 完成标准

术语体系对普通创作者可理解，对已有设计概念仍保留必要一致性。

---

## 11. 每波公共验证项

每个波次完成后，至少做以下检查：

```bash
npx tsc --noEmit
```

如涉及路由或 recent project：

```bash
npx vitest run tests/recent-project-identity.test.ts tests/recent-projects.test.ts tests/setup.test.tsx tests/sceneforge-remix-routing.test.tsx
```

如涉及阶段页面：

```bash
npx vitest run tests/sceneforge-remix-stage-nav.test.tsx
```

如影响面较大，补一次：

```bash
npm test
```

说明：

- 只有定向测试不代表真实恢复成功
- 每一波都需要实机走一遍主路径

---

## 12. 风险与应对

### 风险 1：为了赶进度，继续堆样式而不接真实能力

应对：

- Wave 1 未完成前，不进入 Wave 4

### 风险 2：过度新造组件，绕开现有成熟能力

应对：

- 优先复用已有预览、时间线、Inspector、状态模型

### 风险 3：把处理页做成更复杂的“信息看板”

应对：

- 中间工作区必须始终优先
- 任何新信息块都要回答“是否服务当前主任务”

### 风险 4：旧计划与新方案并存后，团队执行时选错基线

应对：

- 后续所有恢复相关实施，以本计划和 2026-06-24 的三份纠偏文档为准

---

## 13. 建议执行顺序

如果只允许一次连续开发窗口，建议顺序是：

1. Wave 0
2. Wave 1
3. Wave 2
4. Wave 3
5. Wave 4
6. Wave 5

如果时间非常有限，最低保命线是：

1. Wave 0
2. Wave 1
3. Wave 2

这三波做完，至少 Remix 能从“假工作台”拉回“有基础可信度的工作台”。

---

## 14. 一句话结论

这份实施计划的核心，不是“把现有页面打磨一下”，而是 **按波次把 Remix 从错误的工作台方向上拉回来，先救真实性，再救秩序，最后救观感。**
