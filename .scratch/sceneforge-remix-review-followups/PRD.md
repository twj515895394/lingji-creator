# SceneForge Remix Review Follow-ups

## 背景

2026-06-24 对 Remix 主链当前工作区改动做全面 review 后，确认 `Issue #11 / #12 / #13 / #14` 相关实现已经打通了第一版真实闭环，但仍有 3 个问题不能视为“已完全收口”：

1. Variant 复制后，`editedKeyframes.promptPath` 仍指向原 Variant，存在数据串链风险。
2. Prompt Bundle 导出在后端支持目录输出，但前端只暴露了 `.zip` 导出入口，未兑现“ZIP 或文件夹导出”需求。
3. Source Asset 人工标注步骤的“已完成”状态由本地未保存草稿驱动，而非持久化后的真实元数据，导致流程状态与保存状态错位。

这 3 个问题都不是“以后再优化”的轻微瑕疵，而是会直接影响目录隔离、需求兑现和工作流可信度的收口缺口，因此需要补成独立 issue，按顺序消化。

## 目标

以最小补票方式补齐 Remix 主链 review 遗留问题，不重开大规模重构，不改变已确认的产品流程，只修正当前实现与既有 issue / 设计文档之间的偏差。

## 范围

- 覆盖现有 `Issue #11 / #12 / #13 / #14` 已落地代码中的 review follow-up
- 输出 3 张可执行 issue，供后续按顺序实现
- 不在本包中直接改代码

## 建议执行顺序

1. 先修 Variant 复制串链，保证数据边界正确
2. 再补导出到文件夹入口，兑现 Issue #12 导出契约
3. 最后统一人工标注完成态与持久化状态，收口 Issue #14 的流程语义

## 对应关系

- `Issue 01`：补强已实现的 Variant 管理能力，属于 `Issue #13` 的 correctness follow-up
- `Issue 02`：补齐 `Issue #12` 的 bundle 导出交互缺口
- `Issue 03`：补齐 `Issue #14` 的状态一致性缺口
