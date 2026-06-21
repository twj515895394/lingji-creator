# SceneForge Topic Gate LLM Analysis — 详细设计

> 日期：2026-06-19  
> 状态：草案已定向  
> PRD：`.scratch/sceneforge-topic-gate-llm-analysis/PRD.md`

## 1. 目标

让 `topic_gate` 从“手工填表 + 假评分展示”升级为“手工输入 + Direct LLM 分析 + 人工最终确认”的真实闸门，同时保持当前 Studio 的专用工作区模式，不引入 ACP 语义，不破坏后续 `Validate / Continue`。

## 2. 推荐方案

推荐保留 `topic_gate` 专用工作区，新增一个轻量分析子步骤，而不是复用整个 `StageRunPanel`。

原因：

1. `topic_gate` 已有专用表单和专用 HITL 卡片，直接挂载通用 Runner 会造成双主动作与双心智中心。
2. 当前用户测试重点是 LLM 主链，不是运行器功能演示；UI 应优先表达“先分析，再确认”。
3. 我们可以复用底层 Direct LLM 执行与 session 恢复逻辑，但不必复用整个通用工作区外壳。

## 3. 数据边界

### 3.1 现有产物继续保留

- `topic_gate.topic_brief`
  - 来源：用户手填
  - 用途：选题输入与最小结构化参数
- `topic_gate.gate_confirmations`
  - 来源：人工最终确认
  - 用途：最终决策与风格确认，作为下游阻塞/放行依据

### 3.2 新增产物

- `topic_gate.topic_analysis`
  - 来源：Direct LLM
  - 用途：模型建议，不直接作为下游放行依据

建议结构：

```yaml
# 选题分析

summary:
total_score:
decision_suggestion:
production_level_suggestion:

## 维度评分
- 传播潜力: 82
- 制作可行性: 高
- 风格转译适配度: 强

## 决策建议
decision: go
reason: ...

## 风格家族候选
- id: animation
  label: 动画·皮克斯感
  confidence: high
  reason: ...

## 导演 / 画面风格候选
- id: pixar_like
  label: 动画·皮克斯感
  family: animation
  confidence: high
  reason: ...
```

这里不追求和旧 `scene_forge` 的完整 `outputs/topic.md` 一比一对齐，而是保留本阶段实现所需的最小信息集。

## 4. 运行模型

### 4.1 执行方式

- `topic_gate` 仅支持 `direct_llm`
- 不提供 runner 下拉
- 专用按钮：`分析选题`

### 4.2 输入来源

必读：

- `topic_gate.topic_brief`

可选读：

- `source_intake.source_material`
- `source_intake.adaptation_selection`

### 4.3 输出要求

Direct LLM 返回结构化 JSON，再由 renderer / service 转成 `topic_analysis` Markdown。

必须包含：

- `summary`
- `dimensionScores`
- `decisionSuggestion`
- `productionLevelSuggestion`
- `styleCandidates`

缺任一关键字段即视为失败，不生成半截 UI。

## 5. UI 结构

### 5.1 工作区顺序

```text
选题简报
  ↓
分析入口 / 分析结果
  ↓
风格与决策最终确认
  ↓
Validate / Continue
```

### 5.2 交互态

#### 未分析

- 显示简短引导
- 显示单一按钮 `分析选题`
- 不显示“选题评分”标题

#### 分析中

- 显示运行态与恢复提示
- 允许切走再回来继续看到状态

#### 分析完成

- 展示评分摘要卡
- 展示建议决策卡
- 展示推荐风格候选卡
- 展示“重新分析”入口

#### 已人工确认

- 保留分析结果只读摘要
- 保留最终确认摘要
- 允许重新编辑

## 6. UI 合理性约束

这部分按 `gpt-taste` 的设计要求做“现有产品内的保守适配”，不做脱离 Studio 的夸张视觉重构。

### 6.1 适配原则

- 不引入 Landing Page Hero、AIDA 大章节，不适合当前 in-product workspace。
- 继承现有 Studio 的卡片与 section 结构。
- 只吸收以下设计原则：
  - 单一主动作
  - 去掉重复文案
  - 不显示廉价 meta label
  - 信息块宽度充足，不把文字挤成窄长列
  - 卡片密度控制在 3-5 个核心块，避免空洞网格

### 6.2 预飞检查

<design_plan>
1. Python RNG Execution
   seed = len("topic-gate-llm-analysis") = 23
   hero/layout override = existing-product-exception -> retain Studio workspace shell
   components = ["dense score cards", "recommendation cards", "final confirmation cards"]
   motion = ["subtle state fade", "card hover scale only"], font = inherit existing system
2. AIDA Check
   current task is an in-product workspace, so no landing AIDA conversion; preserve existing app shell by exception.
3. Hero Math Verification
   no hero introduced; section headers stay full-width inside existing workspace, no stamp icons, no spam tags.
4. Bento Density Verification
   score/recommendation area targets 2-column compact cards with no empty placeholder section; no empty score block rendered when analysis absent.
5. Label Sweep & Button Check
   remove Agent/ACP/MCP wording from topic_gate; keep one primary button before analysis and one primary confirm button after analysis.
</design_plan>

## 7. 状态恢复

建议复用现有 `scene-stage-run-session` 的思想，但按 `topic_gate` 专用字段扩展或新建轻量 store：

- `status: idle | running | ready | error`
- `analysisDraft`
- `lastHint`
- `error`
- `updatedAt`

恢复规则：

- `running` 恢复后如果已有草案，则降级成 `ready`
- `running` 恢复后如果没有草案，则提示“上次分析未完成，请重新运行”

## 8. Validator 与流转

建议把 `topic_gate` 的 Validate 约束调整为：

必需：

- `topic_brief`
- `gate_confirmations`

推荐但不强绑旧项目兼容：

- `topic_analysis`

执行策略：

- 新项目路径：若用户点击过“分析选题”主流程，则 Validate 应要求 `topic_analysis`
- 旧项目兼容路径：若不存在 `topic_analysis` 但已有 `gate_confirmations`，允许以 legacy 方式通过

这样既不把旧项目全部打死，也能让新主链测试明确覆盖真实分析步骤。

## 9. 错误语义

`topic_gate` 页面不再出现：

- Agent 未配置
- ACP 不可用
- MCP 推进

只保留：

- Direct LLM 未配置
- 模型返回结构不完整
- 解析失败
- 上下文缺失

## 10. 测试矩阵

| 场景 | 预期 |
| --- | --- |
| 保存简报后未分析 | 只显示分析引导，不显示评分区块 |
| 分析成功 | 出现评分、建议决策、风格候选 |
| 分析失败 | 错误明确，不写入半成品 |
| 切走再回来 | 保留运行态或已生成结果 |
| 已确认后再回来 | 最终确认与分析摘要都可见 |
| 旧项目无 `topic_analysis` | 不崩溃，按 legacy 路径展示 |
| 页面文案检查 | `topic_gate` 无 Agent / ACP / MCP 话术 |

## 11. 风险

- 若直接把 `topic_analysis` 做成 Validate 强必需，旧项目兼容会被打断。
- 若复用整块 `StageRunPanel`，UI 会重新变重且重复。
- 若 `styleCandidates` 与当前三张风格卡抽象不一致，容易把“家族建议”和“最终选项”混淆，因此首版需保持候选集收敛。

## 12. 推荐拆包顺序

1. 先补 `topic_analysis` 契约与 runner/service
2. 再补 `topic_gate` 专用分析面板与恢复
3. 再收口 validator、空态与文案
4. 最后做真机 E2E 验收
