Status: ready-for-agent

# Issue 05：回归与验收收口

## 目标

对本轮 UI、交互、ASR 重跑和 stale 收口进行组合验收，确保“单点修复”没有把原片理解工作台打散。

## 范围

- Vitest 定向回归
- 类型检查
- Electron/真机人工验收脚本
- 必要时补一份简短 handoff/验收记录

## 必须产出

- 定向测试命令清单
- 真机验收 checklist
- 本轮剩余风险记录

## 硬规则

- 不能只跑单个 parser 测试就算完成
- 必须覆盖点击片段预览、全量/单段 ASR 重跑、确认 stale 收口
- 人工验收必须包含至少一次切换 ASR 后的真实点击链路

## 验收

- 相关 vitest 全部通过
- `npx tsc --noEmit` 通过
- 人工验收 checklist 至少覆盖 1 次全量重跑、1 次单段重跑、1 次一键确认收口

