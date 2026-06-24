# SceneForge Remix UI / UX 问题审计

日期：2026-06-24  
范围：Remix 资产库、资产处理工作台、从首页进入 Remix 的核心路径  
审计依据：

- 交接文档：[.handoff/handoff-20260624-163210.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.handoff/handoff-20260624-163210.md)
- 用户提供截图 4 张
- 用户提供录屏：`20260624165834.mp4`，时长约 111 秒
- 当前实现代码：
  - [src/sceneforge/remix/pages/RemixAssetLibrary.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetLibrary.tsx)
  - [src/sceneforge/remix/pages/RemixAssetProcessing.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx)
  - [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx)
  - [src/sceneforge/remix/components/AssetDetailSidebar.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetDetailSidebar.tsx)
  - [src/sceneforge/remix/components/SegmentTimeline.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTimeline.tsx)
  - [src/sceneforge/remix/components/SegmentTable.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTable.tsx)
  - [src/sceneforge/remix/components/SourceOverviewPanel.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SourceOverviewPanel.tsx)
  - [src/sceneforge/remix/pages/RemixWorkspaceShell.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixWorkspaceShell.module.css)
  - [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css)
  - [src/sceneforge/remix/components/AssetLibrary.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetLibrary.module.css)

---

## 1. 结论

当前 Remix 的问题不是单点瑕疵，而是五层同时失控：

1. 功能真实性不足：界面大量区域看起来像能工作，实际只是在展示静态占位或弱交互结果。
2. 工作流断裂：导入、查看、切片、验证、入库、发起二创之间没有形成一条稳定、可理解、可验证的主线。
3. 信息架构混乱：资产库、资产处理、Inspector、二创入口之间边界不清，用户不知道自己当前处在什么层。
4. 视觉系统错误：整体气质偏深色营销页，不像专业桌面剪辑器，也不像剪映这类高频创作工具。
5. 文案与术语失衡：中英混排、工程术语外露、状态标签不统一，进一步拉低完成度。

用户感受到的“屎感”，不是来自单个按钮、单个颜色或单个字体，而是来自：

- 看起来像播放器，其实不是播放器
- 看起来像时间线，其实不是时间线
- 看起来像资产卡片，其实没有可信媒体预览
- 看起来像处理流程，其实点完之后缺少可验证反馈
- 看起来像工作台，但中间最重要的工作区长期空洞

这意味着：**当前 Remix 还不具备“直接交付给用户做真实素材处理”的基本条件。**

---

## 2. 审计方法与证据范围

本次问题清单基于三类证据：

1. 静态截图
2. 111 秒录屏中的实际操作过程
3. 当前前端实现与样式实现

说明：

- 本文优先记录“用户可感知问题”，其次才落到代码实现。
- 本文不展开最终解决方案，只给出讨论方向。
- 对于无法仅凭截图和录屏完全确认的问题，文中会明确标注“需实机补验”。

---

## 3. 问题分级总览

### P0：阻断可用性 / 直接破坏主流程

1. 没有可信的视频预览与播放验证区，切片功能在体验上接近不可用
2. 切片动作与切片结果没有形成强反馈闭环
3. 资产卡片和详情页缺少真实素材预览，资产库不可信
4. 原片理解区不可读，不支持后续加工决策
5. 资产库、处理页、二创入口的页面身份混乱

### P1：严重影响效率与专业感

1. 整体视觉语言像营销页，不像桌面剪辑器
2. 三栏结构比例失衡，中间主工作区空洞
3. 排版节奏混乱，字号、标签、对齐、间距没有系统
4. 按钮优先级混乱，关键动作没有被清晰突出
5. 信息重复堆叠，用户扫不出重点

### P2：加重混乱、降低完成度

1. 中英混排和术语外露持续制造理解成本
2. 很多区域有“假可操作感”
3. 长文件名、长 ID、长说明文与窄侧栏组合后观感很差
4. 状态标签、阶段命名、指标命名没有统一规则

---

## 4. 详细问题清单

### P0-01：没有可信的视频预览与播放验证区

现象：

- 录屏中用户进入“真实镜头切片”页面后，中间的 `Source Preview` 区域没有提供可信的视频播放体验。
- 这个区域看起来像播放器，但看不到明确的视频画面、播放控件、播放头、时间轴、当前片段定位、当前帧反馈。
- 用户无法回答最关键的问题：`这是不是我导入的这条视频？`、`切片到底切到了哪里？`

影响：

- 切片功能失去可验证性。
- 用户即使点击“运行切片”，也无法通过视频画面核对算法输出。
- 整个“资产处理工作台”的可信度直接崩掉。

录屏证据：

- 约 `00:24-00:54`，用户进入处理页后，中间大区长期处于“像播放器但没有真实播放反馈”的状态。
- 约 `00:54-01:18`，切片结果出现后，用户看到的是块状列表和表格，不是与视频联动的切片验证体验。

代码证据：

- [src/sceneforge/remix/components/SegmentTimeline.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTimeline.tsx:13)
  当前“时间线”只是根据时长比例生成的静态 flex 区块，不是播放器时间轴，也不是可 scrub 的切片验证组件。
- [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css:198)
  `previewSurface` 和 `previewCanvas` 只是视觉容器样式，没有体现真实媒体能力。

判断：

- 这是当前 Remix 最严重的问题之一。
- 不先补上“真实素材预览 + 当前切片验证”的核心能力，后面所有切片、关键帧、理解、入库都只是纸面流程。

讨论方向：

- 需要把“预览区”从装饰面板升级成真实媒体工作区。
- 必须支持：视频显示、播放暂停、当前时间、当前 segment 高亮、点击 segment 跳转、播放头验证。

---

### P0-02：切片动作与结果没有形成强反馈闭环

现象：

- 用户点击“运行切片”之后，界面主要靠按钮文案变化和部分表格内容变化来表示“处理过了”。
- 没有清晰的处理中态、分阶段进度、完成提示、失败原因、结果定位。
- 结果区看起来更像“系统生成了一份摘要表”，而不是“你已经看到了切片结果”。

影响：

- 用户无法建立“我刚才那次点击到底产生了什么”的心理模型。
- 当切片结果不满意时，没有自然的检查与复核路径。
- 主流程会给人强烈的“像假功能”感。

录屏证据：

- 约 `00:36-01:00`，用户操作切片相关动作时，页面反馈非常弱。
- 录屏中“完成/待确认/入库”等状态切换，更多是文字变化，不是可验证状态迁移。

代码证据：

- [src/sceneforge/remix/pages/RemixAssetProcessing.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx:220)
  `runAction` 只做了运行态切换和快照替换。
- [src/sceneforge/remix/pages/RemixAssetProcessing.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx:308)
  切片阶段核心内容是按钮 + `SegmentTimeline` + `SegmentTable`。

判断：

- 这不是“缺少一个 loading 图标”，而是整条反馈链太弱。
- 用户无法从界面中感知系统正在分析什么、产出了什么、为什么值得信任。

讨论方向：

- 处理动作需要有明确的“前-中-后”结构。
- 结果区必须绑定媒体验证，而不是只展示摘要表。

---

### P0-03：资产卡片和详情侧栏缺少真实素材预览，资产库不可信

现象：

- 资产卡片顶部看起来像视频封面，实际是纯渐变背景。
- 右侧详情栏看起来像可浏览素材信息，实际上也缺少真实媒体上下文。
- 用户在资产库里无法快速确认：这是不是我要处理的那条素材。

影响：

- 资产库的第一职责本应是“识别素材、确认素材、选中素材”，现在这一点没有成立。
- 素材识别只能依赖长文件名和长 ID，体验非常差。

录屏证据：

- 约 `01:18-01:51`，用户回到资产库后，主区和右侧都没有给出足够真实的素材识别信息。
- 资产卡片更多像设计稿卡片，而不是创作工具里的媒体资产块。

代码证据：

- [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx:50)
  卡片封面区域只是 `button` 包裹的视觉块。
- [src/sceneforge/remix/components/AssetLibrary.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetLibrary.module.css:48)
  `cover` 是纯渐变背景，不是真实素材缩略图。

判断：

- 这是资产库可信度不足的关键原因。
- 如果资产库都无法一眼认素材，后面的处理链会始终带着怀疑。

讨论方向：

- 资产卡片至少应展示真实视频缩略图/关键帧代表图。
- 详情侧栏应提供更可靠的素材识别锚点，而不是主要依赖 ID 和说明文。

---

### P0-04：原片理解区不可读，像调试输出，不像创作工作台

现象：

- 原片理解区是一大坨预格式文本。
- 信息没有视觉分组、没有阅读层级、没有“先看什么后看什么”。
- 用户虽然看见了很多字，但很难把这些字转成后续操作决策。

影响：

- “原片理解”本来应该帮助二创判断，现在反而增加阅读负担。
- 用户无法迅速提炼剧情、动作、梗点和可保留素材。

录屏证据：

- 约 `00:57-01:06`，原片理解区域显示出密集文本块，阅读负担极高。

代码证据：

- [src/sceneforge/remix/components/SourceOverviewPanel.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SourceOverviewPanel.tsx:12)
  当前实现直接把 Markdown 文本塞进 `pre`。

判断：

- 该区域当前更接近开发调试视图或中间产物浏览页，而不是创作者消费界面。

讨论方向：

- 需要把文本内容拆成结构化阅读单元，而不是裸 `pre`。
- 需要明确“摘要”、“分段分析”、“重点可复用点”等层次。

---

### P0-05：资产库、处理页、二创入口的页面身份混乱

现象：

- 用户在录屏中经历了：首页进入 Remix、选择目录、进入资产库、进入资产处理、回到资产库、再次发起动作。
- 但在多个关键时刻，界面没有清楚告诉用户：你现在是在“资产治理层”还是“具体处理层”还是“准备发起二创层”。
- 左栏、主区、右栏都在表达状态，但缺少一个清晰的页面主叙事。

影响：

- 用户需要靠试错来理解系统结构。
- 一旦路径稍微变长，就会出现“为什么我又回来了”“为什么现在是这个壳子”的困惑。

交接文档证据：

- [handoff-20260624-163210.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/.handoff/handoff-20260624-163210.md) 已明确指出：首页进入 Remix、目录选择、再次打开草稿、界面落点都存在不稳定与误导。

录屏证据：

- 约 `00:00-00:21` 首页进入与目录选择阶段
- 约 `00:21-00:54` 进入处理页阶段
- 约 `01:15-01:51` 回到资产库阶段

判断：

- 这是工作流级问题，不是某一栏文案改一下就能解决。

讨论方向：

- 必须重新定义：Remix 首页、资产库、处理工作台、二创工作区之间的边界和跳转语义。

---

### P1-01：整体视觉语言像营销页，不像桌面剪辑器

现象：

- 深色大背景 + 金色渐变 + 大圆角卡片 + 英文全大写眉题 + 柔光边框，整体很像 landing page。
- 和剪映那种“工具优先、信息整洁、结构清楚”的专业桌面产品气质差异很大。

影响：

- 用户会本能地觉得“不专业”“不稳”“像概念稿”。
- 即使功能没坏，视觉语言也会先把可信度拉低。

代码证据：

- [src/sceneforge/remix/pages/RemixWorkspaceShell.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixWorkspaceShell.module.css:1)
- [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css:6)

判断：

- 当前风格选型本身就不适合“高频操作型桌面剪辑工作台”。

讨论方向：

- 视觉语言应向“专业创作工具”回归，而不是继续叠加设计感装饰。

---

### P1-02：三栏结构比例失衡，中间主工作区空洞

现象：

- 左栏 250-290px，右栏 320px，中间主区被挤成“看起来挺大，实际上可用内容很少”的中空区域。
- 录屏和截图都能看到：左右栏信息很多，中间反而经常是一大片深色空白。

影响：

- 工作台视觉重心错误。
- 最应该承载媒体预览、处理结果和主交互的区域，反而信息密度最低。

代码证据：

- [src/sceneforge/remix/pages/RemixWorkspaceShell.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixWorkspaceShell.module.css:4)
- [src/sceneforge/remix/pages/RemixWorkspaceShell.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixWorkspaceShell.module.css:15)

判断：

- 当前布局不是“信息太少”，而是“信息放错了位置”。

讨论方向：

- 中间工作区必须回到第一优先级。
- 侧栏应服务主工作区，而不是与主工作区争抢视觉重量。

---

### P1-03：排版节奏混乱，用户会直接感知为“字没排整齐”

现象：

- 全页充斥 10px、11px、12px、13px、14px、16px、17px、18px、24px、28px 等多套尺度。
- 英文大写眉题和中文正文节奏不协调。
- 很多标签的字重、字距、行高都像各写各的。
- 同一屏内的卡片标题、描述、状态、指标标签、侧栏说明没有统一节奏。

影响：

- 用户会直接觉得“乱”“碎”“廉价”“像拼出来的”。
- 即便元素 technically 对齐，视觉上依然会感到不齐。

代码证据：

- [src/sceneforge/remix/pages/RemixWorkspaceShell.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixWorkspaceShell.module.css:53)
- [src/sceneforge/remix/components/RemixWorkspacePanels.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css:25)
- [src/sceneforge/remix/components/AssetLibrary.module.css](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetLibrary.module.css:12)

判断：

- 这是典型的缺少 typographic system，而不是单纯缺少某个字体。

讨论方向：

- 必须先定义标题层级、正文层级、辅助说明层级、标签层级、数字层级。

---

### P1-04：按钮优先级混乱，关键动作不突出

现象：

- 页面里同时存在返回、查看详情、继续处理、创建二创、运行切片、提取关键帧、生成理解、保存入库等动作。
- 这些动作虽然颜色有差异，但没有建立足够清晰的“唯一主动作”。
- 用户需要多读文字才能判断该点哪个。

影响：

- 操作效率低。
- 主路径被次要动作干扰。
- 用户会更容易试错、回退和犹豫。

代码证据：

- [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx:93)
- [src/sceneforge/remix/pages/RemixAssetProcessing.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx:319)

判断：

- 这是工作流优先级没有在 UI 中被诚实表达的问题。

讨论方向：

- 每个页面层级都需要明确：一个主动作，最多一个次动作，其余收拢。

---

### P1-05：信息重复堆叠，用户扫不出重点

现象：

- 资产标题、状态、说明、时长、segment 数、keyframe 数、variant 数，在卡片、Hero、右侧详情、处理摘要中反复出现。
- 多处说明文都在重复“这份原片已经沉淀为可管理资产”“下一步可以继续处理或发起二创”一类内容。

影响：

- 页面读起来啰嗦，但真正关键的信息并没有更清楚。
- 用户会很快跳过说明文，导致这些文案几乎失效。

代码证据：

- [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx:60)
- [src/sceneforge/remix/components/AssetDetailSidebar.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetDetailSidebar.tsx:53)

判断：

- 这不是信息不足，而是信息冗余。

讨论方向：

- 需要把“识别素材”“理解状态”“下一步动作”分别放到它们最该出现的位置，不要多处重复喊话。

---

### P2-01：中英混排与工程术语外露持续增加理解成本

现象：

- 页面中仍然反复出现 `Source Asset`、`Variant`、`Segment`、`Pending` 等术语。
- 即使已经有部分中文，也仍然经常是中文标题 + 英文括注 + 英文指标标签混用。

影响：

- 对非工程背景创作者不友好。
- 会继续制造“这是内部系统 / 半成品界面”的感受。

代码证据：

- [src/sceneforge/remix/components/AssetCard.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetCard.tsx:69)
- [src/sceneforge/remix/components/AssetDetailSidebar.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/AssetDetailSidebar.tsx:42)
- [src/sceneforge/remix/components/SegmentTimeline.tsx](/Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SegmentTimeline.tsx:39)

讨论方向：

- 中文应成为默认语义层，英文只保留在必要的专业术语或辅助说明里。

---

### P2-02：很多区域有“假可操作感”

现象：

- 预览框像能播放
- 时间块像能点和拖
- 资产卡封面像真缩略图
- 右侧摘要像会联动
- 某些状态 chip 像有更深入的状态说明

影响：

- 用户会不断产生错误期待。
- 每一次期待落空，都会进一步强化“不靠谱”的印象。

判断：

- 这是当前 Remix 体验中的一个高频负反馈源。

讨论方向：

- 真实能力与视觉暗示必须一致。
- 不能再让“静态看板”伪装成交互控件。

---

### P2-03：长文件名、长 ID、窄面板叠加后让界面持续显脏

现象：

- 录屏与截图中的资产名很长、ID 很长、路径也长。
- 右栏和部分卡片没有给出足够优雅的处理方式。
- 结果是信息拥挤、断行难看、阅读路径被拉碎。

影响：

- 明显拉低桌面产品的完成度。
- 更容易造成“字没排整齐”的感受。

讨论方向：

- 长标题、长路径、长 ID 需要明确的展示优先级与截断策略。

---

## 5. 与参考界面的差距

### 相对剪映的差距

不是“少几个控件”，而是缺少专业编辑器的三个基础：

1. 真实媒体画布
2. 明确时间轴语义
3. 参数面板与主工作区的稳定分工

剪映的界面即使不算顶级美观，也具备明显优势：

- 主视觉重心明确
- 素材区、播放区、参数区、时间轴区职责清晰
- 用户知道自己该看哪里
- 用户点下去能立即知道系统在做什么

当前 Remix 与其差距，主要不在“设计风格”，而在“专业工作台的基本秩序”。

### 相对 SceneForge / 灵机剪影现有编辑能力的差距

当前 Remix 没有充分复用现有产品里更成熟的媒体编辑认知：

- 现有编辑器已有预览、时间线、Inspector 等基本语言
- Remix 却另起了一套更装饰化、但更弱功能化的工作台外观

结果是：

- 新工作区没有继承老能力的可信感
- 用户反而觉得比现有编辑能力更退步

---

## 6. 优先讨论顺序

建议后续讨论不要从“换什么颜色”“改什么字体”开始，而按下面顺序推进：

1. 先重建主流程
   - 首页进入 Remix
   - 选择目录
   - 进入资产库
   - 打开处理页
   - 真正查看视频
   - 运行切片并验证结果
   - 保存入库
   - 发起二创

2. 再重建主工作区
   - 中间区域必须先成为真实媒体工作区
   - 左右两栏退回服务角色

3. 再收口信息架构
   - 明确资产库、处理页、二创页的职责边界

4. 最后再统一视觉系统
   - 字体、字号、标签、间距、边框、圆角、配色

如果顺序反过来，先做“视觉美化”，大概率只会把一个不可用工作台装饰得更像成品，但不会变得更能用。

---

## 7. 本文结论对应的风险说明

### 已确认

- 当前 Remix 的核心问题具有系统性，不是单个 bug 或单个样式问题
- 切片功能在用户体验层面缺乏可信验证路径
- 资产库缺少真实媒体识别能力
- 视觉语言与专业桌面创作工具严重错位

### 需实机补验

- 不同素材导入后，预览区是否在某些分支条件下会显示真实视频
- 返回首页、重新打开 recent project、关闭窗口等路径的真实稳定性
- 长时间处理任务下的状态与错误反馈是否还会进一步暴露问题

---

## 8. 下一步文档建议

建议在本文之后继续拆两份文档：

1. `remix-p0-workflow-recovery-plan.md`
   - 只处理主流程可用性
   - 不讨论视觉美化

2. `remix-workbench-ui-redesign-brief.md`
   - 在主流程可信后，再做桌面工作台 UI 重设计
   - 重点参考剪映与现有灵机剪影编辑器的“专业工作台秩序”

---

## 9. 一句话总结

当前 Remix 最大的问题不是“不够好看”，而是 **用了工作台的皮，但没有给出工作台最关键的真实能力和秩序**。  
在这种前提下，用户自然会同时觉得：功能像假的、交互像断的、排版像乱的、整个东西像没做完。
