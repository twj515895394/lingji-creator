# SceneForge Gate / Intake 卡片式 HITL — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`  
> 前置：ADR-0001

## 1. 架构原则

卡片 UI 是现有 Markdown artifacts 的结构化投影，不引入新的持久化来源：

```text
Artifact Markdown
  → parser
  → HITL View Model
  → Card UI
  → user selection
  → builder
  → sceneSubmitStageDraft
  → existing validator/state machine
```

## 2. View Model

### 2.1 Intake

```ts
interface SceneAdaptationDirection {
  id: string;
  title: string;
  summary: string;
}

interface SceneAdaptationSelectionState {
  status: 'pending' | 'selected';
  selectedId?: string;
  directions: SceneAdaptationDirection[];
}
```

沿用现有结构，只补充 UI 所需的派生字段，不写入 artifact：

- `isSelected`
- `canConfirm`
- `selectedDirection`

### 2.2 Topic Gate 评分

```ts
interface SceneGateScoreItem {
  label: string;
  value: string;
}

interface SceneGateScoreState {
  items: SceneGateScoreItem[];
  rawSection: string | null;
}
```

解析规则：

1. 查找 `## 评分` 段。
2. 读取以 `-` 开头的列表项。
3. 使用首个中文或英文冒号拆分 label/value。
4. 不把 value 强制转换成数字，不假设固定评分维度。
5. 无有效项时返回空数组，UI 显示“当前简报没有评分数据”。

### 2.3 Topic Gate 决策与风格

继续使用 `SceneGateHITLState`：

- `decision`
- `styleOptions`
- `selectedStyleId`
- `styleConfirmed`

## 3. 组件边界

### 3.1 `SceneAdaptationDirectionCards`

- 只负责方向卡片选择与确认。
- props 使用结构化 directions，不自行解析 Markdown。
- 确认后调用回调，由容器执行 IPC。
- 方向为空时展示空态和高级 Markdown 指引。

### 3.2 `SceneGateScoreCards`

- 只读展示评分项。
- 不产生提交行为。
- value 按原文展示，避免错误解释量纲。

### 3.3 `SceneGateDecisionCards`

- 展示 go/observe/drop 三个决策。
- 每个决策卡明确后果。
- `drop` 状态继续阻止 Validate/Continue。

### 3.4 `SceneGateStyleCards`

- 展示 label、family 和选中态。
- 没有候选时使用现有默认风格列表。
- 确认写回仍由 Gate 容器一次提交 decision + style。

### 3.5 已确认摘要

- intake：方向标题、摘要、重新选择。
- gate：决策、风格、时长、重新选择。
- 修改已确认项前显示“会改变后续阶段上下文”的轻量提示。

## 4. 交互状态

```text
empty → editable → submitting → confirmed
                   ↘ error → editable
confirmed → editing → submitting → confirmed
```

- submitting 时禁用卡片切换和确认按钮。
- error 不清空当前选择。
- confirmed 默认折叠编辑卡片。
- 重新编辑不会自动撤销已确认 artifact；新确认成功后覆盖同 artifactKey 的最新版本。

## 5. Validator 与导航

- intake 有 directions 且 `adaptation_selection.status !== selected` 时不能完成改编闸门。
- topic_gate 未 `style_confirmed: true` 时 reference 及后续保持阻塞。
- decision 为 `drop` 时不允许继续推进。
- 评分是否存在不影响 Validate，它只作为决策信息。

## 6. 兼容性

- 旧项目没有 `## 评分`：显示评分空态。
- 旧方向列表没有显式 id：继续使用稳定 slug 规则。
- 旧风格没有 family：只显示 label。
- 原始 Markdown 始终可在高级编辑入口查看和修改。

## 7. 测试矩阵

| 场景 | 预期 |
| --- | --- |
| 3 个改编方向 | 显示 3 张卡并可确认一项 |
| 无方向 | 空态，不伪造候选 |
| 已确认方向 | 显示摘要，可重新选择 |
| 中英文冒号评分 | 均解析成只读评分项 |
| 无评分 | 空态，不阻塞 Validate |
| 无风格候选 | 使用现有默认列表 |
| decision=drop | Validate/Continue 禁止 |
| IPC 失败 | 保留选择并显示错误 |

## 8. 风险

- Markdown 格式自由度高：parser 保持宽松、builder 保持稳定输出。
- 风格卡可能发展为大图库：本包只做文本卡，不引入缩略图资产协议。
- 评分含义可能随上游变化：保留原始 label/value，不固定领域枚举。

