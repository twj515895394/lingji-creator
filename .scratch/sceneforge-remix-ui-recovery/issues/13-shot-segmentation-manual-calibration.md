Status: ready-for-agent

# 切片校准 UI 与 manual overrides 持久化

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

为智能切片补齐人工校准闭环，让用户能对低置信度或错误边界进行确认、合并、拆分和微调，并把人工修正持久化。

端到端行为：

- 用户可点击边界跳转视频位置。
- 用户可合并相邻段、在当前点拆分、微调边界。
- 手工覆盖项会保存，并在重进 / 重跑后按规则保留。

## 实施约束

- 实现必须严格遵循 `docs/sceneforge2.0/technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`。
- 本票以“可校准”闭环为核心，不顺手扩成完整剪辑器。
- manual overrides 必须进入持久化，而不是只保留在前端会话内。

## 验收标准

- [ ] 切片时间轴可显示边界并支持跳转预览
- [ ] 用户可合并、拆分、微调边界
- [ ] 手工校准结果会保存并在重进后恢复
- [ ] 重新运行切片时可保留人工覆盖项，或清晰提示覆盖策略
- [ ] 低置信度边界有明确的人工确认路径

## Review Checklist

- [ ] 手工覆盖结构与自动检测结果分层存储
- [ ] 校准操作不会破坏后续关键帧 / 理解链路
- [ ] UI 交互是“校准边界”，而不是隐式编辑底层文件
- [ ] 覆盖策略清晰，避免 rerun 悄悄吞掉人工调整

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新切片时间轴 / 处理页交互测试
- [ ] 如有服务层更新，补 manual overrides 读写测试
- [ ] 手动验证：调整边界后刷新页面仍生效

## 涉及范围

- 处理页时间轴与 segment 编辑交互
- segmentation override 存储与测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/12-shot-segmentation-fast-mode-and-confidence.md`
