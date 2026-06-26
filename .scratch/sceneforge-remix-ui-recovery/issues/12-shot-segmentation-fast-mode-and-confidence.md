Status: ready-for-agent

# 智能切片 Fast 模式与边界置信度闭环

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

把当前“傻切”升级为可解释的 fast segmentation 流程，先交付一个以候选边界检测、规则约束和边界置信度为核心的可用版本。

端到端行为：

- 切片结果优先基于真实视觉边界，而不是固定时长。
- UI 能看到边界置信度、来源和低置信提示。
- 产物可被关键帧、理解和后续二创链路消费。

## 实施约束

- 实现必须严格遵循 `docs/sceneforge2.0/technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`。
- 第一阶段聚焦 fast 模式，不在本票里引入高精度模型 worker。
- LLM / VLM 不得直接决定切点，只能做后续语义增强。

## 验收标准

- [ ] 默认切片使用候选边界检测与规则约束，而非固定时长切分
- [ ] 输出 segment 时包含边界置信度、来源和 review 状态
- [ ] UI 能提示低置信度边界
- [ ] 结果可供关键帧提取和原片理解消费
- [ ] 对快速运动素材不过度碎切

## Review Checklist

- [ ] 检测器接口可替换，为后续 accurate 模式留出扩展点
- [ ] 置信度与来源字段在存储结构中真实存在，不只在 UI 里临时拼装
- [ ] 规则约束和最小时长逻辑集中实现
- [ ] 不把 LLM 当作切片真值来源

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 补或更新 segmentation 测试，覆盖 hard cut、短镜头合并、低置信边界
- [ ] 建立最小 fixture / expected segments 回归样本
- [ ] 手动验证：普通素材切片结果更贴近真实镜头边界

## 涉及范围

- `electron/sceneforge/remix/remix-segmentation-service.ts`
- segmentation diagnostics / storage
- 处理页切片展示与测试

## 被阻塞于

- 无 - 可以立即开始
