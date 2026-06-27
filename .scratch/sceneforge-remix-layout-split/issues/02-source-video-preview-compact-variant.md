Status: ready-for-agent

# 播放器组件 SourceVideoPreview 精简版变体适配

Type: AFK

## 父问题

`.scratch/sceneforge-remix-layout-split/PRD.md`

## 要构建什么

在视频预览组件中新增变体参数，控制其是否只渲染核心播放控制。在精简模式下，屏蔽底部自带的当前片段卡片展示，将台词和时长信息的渲染权力交还给主页面，以便拼装进置顶右侧大卡片。

端到端行为：
- `SourceVideoPreviewProps` 增加可选属性 `variant`。
- 当 `variant === 'compact'` 时，仅保留视频画面与播放时间条（0:37 / 2:04 状态栏），不显示 `activeSegmentCard` 卡片。
- 原有的视频事件监听与 seek 控制逻辑完整保留，确保与 Timeline 联动无误。

## 实施约束

- 必须且仅修改 [SourceVideoPreview.tsx](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/SourceVideoPreview.tsx)。
- 不得修改或重构已有的 `videoRef` 处理与播放时间更新回调，防止播放状态失效。

## 验收标准

- [ ] `SourceVideoPreviewProps` 的编译类型签名正确，符合可选变体契约
- [ ] 在 `variant === "compact"` 下，页面不渲染底部的片段台词/起止时间栏
- [ ] 播放暂停控制与 timeupdate 依然完全可靠

## 被阻塞于

- 无 - 可以立即开始
