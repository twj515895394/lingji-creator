# SceneForge LLM Mainline Closure — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-llm-mainline-closure/PRD.md`

## 1. 目标

把 SceneForge 的 Direct LLM 主链从“单点能力已打通”推进成“整条链前后端、交互、流程运转、验收都稳定可控”的产品主线，并为后续实现提供唯一优先级入口。

## 2. 核心思路

不再按已有后续包的创建顺序逐个推进，而是改成按主链闭环价值重排：

- 已经足够稳定的包转成验收基线
- 当前真正阻塞主链的项进入实现队列
- 重要但不阻塞主链的包后置
- 明确暂缓的项保持 deferred

## 3. 重新分层

### 3.1 已完成基线

这些包已足够作为当前主链的可靠背景，不再作为第一优先级实现项：

- Flow Hardening
- Direct LLM E2E
- Style Selector
- Studio UX Clarity
- Regenerate / Request Revision（基础入口层）

### 3.2 当前必须实现

这些项直接影响用户是否能顺畅迭代、提交、继续和真机验收：

- Draft Refinement
- LLM Prompt 标准注入与 80k token 闸门
- 主链状态恢复 / 回显 / 阶段切换一致性
- 提交草案、校验、审批、继续间的残余断点
- E2E 清单中尚未被产品和代码共同闭环的验收点

### 3.3 后续再做

- Publish Workspace

### 3.4 暂缓

- ACP Studio Alignment

## 4. 盘点维度

后续每一票都要落到以下五个维度之一，避免再出现“文档齐了但主链没闭环”的错觉：

1. 前端交互
2. 后端 / runner / service
3. 状态流与回显
4. 上下文与阶段切换
5. 自动化与人工验收

## 5. 推荐执行顺序

1. 以本包为总入口，确认当前必须实现列表。
2. 先实现 Draft Refinement。
3. 再做一轮主链状态流与回显缺口补齐。
4. 然后按 Direct LLM E2E 清单做逐阶段验收修补。
5. 主链稳定后，再回到 Publish。
6. ACP 最后。

## 7. 本轮新增约束

- Direct LLM 运行时 prompt 不能只停留在 `system.md + user.md + stageContext`，必须把阶段运行规则与自检标准一并注入。
- 在真正把 prompt 推给 LLM 前，需要做本地 token 闸门；首版阈值固定为 80k，超限直接失败，不允许继续发请求。

## 6. 风险

- 如果继续按零散包顺序推进，会不断被次级 backlog 打断，主链迟迟无法稳定闭环。
- 如果把 Publish 或 ACP 提前，会抢走本该用于主链收敛的注意力。
- 如果不把“已完成基线”和“当前必须实现”分开，后续会重复建设已足够稳定的能力。
