Status: ready-for-agent

# 高精度切片 Accurate 模式接入

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

在 fast 模式稳定后，引入可选的高精度 segmentation 模式，用更强的模型边界预测提升复杂素材的镜头切分质量。

端到端行为：

- 用户或系统可以选择 accurate 模式。
- accurate 模式通过独立检测器或 worker 产出更高精度的边界候选。
- 结果仍走统一 segment / confidence / diagnostics 契约。

## 实施约束

- 实现必须严格遵循 `docs/sceneforge2.0/technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`。
- accurate 模式必须建立在 issue 12 的统一检测器接口之上。
- 本票要把环境依赖、失败降级和性能影响写清楚，不能默认破坏 fast 模式体验。

## 验收标准

- [ ] 系统支持切换到 accurate 模式
- [ ] accurate 模式结果与 fast 模式共用统一输出结构
- [ ] 高精度模式失败时有明确降级或错误反馈
- [ ] 复杂素材的边界质量优于 fast 模式，或至少能被清晰评估

## Review Checklist

- [ ] 模型 / worker 接入与 Electron 主进程边界清晰
- [ ] 环境缺失时的降级策略已定义
- [ ] 不把 accurate 模式硬编码成唯一默认路径
- [ ] diagnostics 能区分 fast 与 accurate 检测来源

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 补高精度模式服务测试或契约测试
- [ ] 如具备 fixture，做 fast vs accurate 对比样本
- [ ] 手动验证：复杂素材可切换 accurate，结果与 UI 提示一致

## 涉及范围

- segmentation service / worker 接口
- 模式选择与 diagnostics 展示
- 相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/12-shot-segmentation-fast-mode-and-confidence.md`
