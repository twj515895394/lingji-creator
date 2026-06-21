# Findings

## 2026-06-18

- SceneForge 现在已经具备可跑的 Direct LLM 主链，但“能跑通”不等于“完整闭环”；仍缺少草案迭代、状态恢复、跨阶段回显、真机验收顺序等系统化收敛。
- 前面补齐的很多包并不都应该立刻实现：
  - `Flow Hardening`、`Direct LLM E2E`、`Style Selector`、`Studio UX Clarity` 更适合作为验收基线。
  - `Draft Refinement` 是高频真实缺口，应进入当前实现队列。
  - `Publish Workspace` 不阻塞 Direct LLM 主链跑透，应后置。
  - `ACP Studio Alignment` 已明确 deferred。
- 接下来的主线不该再按“文档包顺序”推进，而该按“是否阻塞 LLM 主链稳定闭环”推进。
