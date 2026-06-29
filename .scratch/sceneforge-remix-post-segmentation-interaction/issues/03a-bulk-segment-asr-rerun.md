Status: ready-for-agent

# Issue 03a：全部片段音频 ASR 重跑

## 目标

提供“全部片段音频 ASR 重跑”能力，只重跑片段 transcript / ASR 层，不要求为了更新台词而重跑整份原片理解内容。

## 范围

- 页面操作入口
- IPC 输入输出契约
- transcript 服务或等效编排层
- 相关 job / loading / completion 状态

## 必须产出

- 一个用户可见的“全部片段音频 ASR 重跑”入口
- 读取 Issue 01 的统一 `preferredAsrEngine`
- 重跑完成后刷新 workbench transcript 内容与相关 freshness

## 硬规则

- 不走“完整原片理解重跑”作为内部实现捷径
- 只重跑 transcript / ASR 相关产物
- 重跑必须吃当前唯一 ASR 选择值

## 验收

- 切换 ASR 后触发全量片段 ASR 重跑，后端收到正确引擎
- 不会把片段理解 LLM 全量重新跑一遍
- 重跑完成后 UI 能看到最新 transcript 数据

