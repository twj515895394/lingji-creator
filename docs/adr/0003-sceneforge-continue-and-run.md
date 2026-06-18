# ADR-0003：保留 Continue，并新增显式 Continue & Run

> 状态：已接受（accepted）  
> 日期：2026-06-18  
> 决策者：维护者确认 Phase 3 规划  
> 关联：ADR-0001、ADR-0002、`.scratch/sceneforge-continue-and-run/PRD.md`

## 背景

SceneForge 当前 Continue 的含义是：阶段已通过校验后，执行必要审批并将 Studio 切换到下一阶段。它不调用下一阶段 Runner。真实 LLM 路径打通后，用户希望减少重复点击，但直接改变 Continue 会引入隐式 API 消耗，并混淆“审批完成”与“下一阶段运行成功”两个事实。

## 决策

1. 保留 Continue 的现有语义和按钮。
2. 新增显式 Continue & Run，且只在下一阶段可运行时显示。
3. Continue & Run 的顺序固定为：

```text
validate passed
→ approve current stage when required
→ switch to next stage
→ run next stage once
→ show pending draft or error
```

4. 下一阶段运行失败不回滚当前阶段已经完成的审批。
5. Runner 结果不自动提交，继续遵循 ADR-0002。
6. 首版不持久化自动运行设置，不递归运行后续阶段。

## 后果

### 正面

- 用户可选择效率或控制，不产生隐藏模型调用。
- 状态机中的审批结果始终真实，不受 Provider 故障影响。
- 复用 `sceneRunStage`，不增加第二套执行引擎。

### 负面

- UI 增加第二个继续动作，需要清楚说明差异。
- 运行失败后用户处于下一阶段，需要错误态和重试入口。

## 否决方案

| 方案 | 原因 |
| --- | --- |
| Continue 默认自动运行 | 隐式成本，改变既有产品语义 |
| 项目级默认自动运行开关 | 首版增加持久化和迁移复杂度 |
| 自动运行后自动提交 | 绕过草案审阅和 HITL |
| 一次递归跑完整链 | 错误恢复、成本与审批边界不可控 |

## 验证

- 普通 Continue 不调用 `sceneRunStage`。
- Continue & Run 在审批成功后只调用下一阶段一次。
- 运行失败后当前阶段仍保持 approved/completed，Studio 停在下一阶段。

