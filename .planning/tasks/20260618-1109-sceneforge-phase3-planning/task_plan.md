# Task Plan: SceneForge 工程收口与 Phase 3 需求规划

## Goal
产出并执行小问题收口计划，同时完成四个独立功能包的 PRD、详细设计、实施计划和垂直切片 issues。

## Current Phase
Phase 8

## Phases

### Phase 1: Requirements & Discovery
- [x] 阅读总 handoff、现有 ADR、PRD、计划和 issues
- [x] 核对代码、测试、TypeScript 债和 Git 状态
- [x] 确认本地 Markdown issue tracker 与标签约定
- [x] 确认交付拆为工程收口 + 四个独立功能包
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 编写 Phase 3 路线图
- [x] 编写工程收口实施计划
- [x] 为四个功能包确定 PRD、设计、计划和 issues 文件结构
- **Status:** complete

### Phase 3: Documentation
- [x] Core LLM Happy Path 文档包
- [x] Gate/Intake 卡片式 HITL 文档包
- [x] Continue & Run 文档包与 ADR
- [x] Support Pack Wave 文档包
- **Status:** complete

### Phase 4: Testing & Verification
- [x] 检查所有 PRD 均为 ready-for-agent
- [x] 检查 issues 为垂直切片且依赖无环
- [x] 检查计划无 TODO/TBD/占位项
- [x] 检查文档路径和交叉引用
- **Status:** complete

### Phase 5: Delivery
- [x] 汇总创建文件、推荐执行顺序和需要用户后续确认的产品决策
- **Status:** complete

### Phase 6: Engineering Closure Implementation
- [x] 收窄支撑阶段类型并补行为测试
- [x] TypeScript 与 SceneForge 回归通过
- [x] 同步 issues 06–10 的完成证据
- [x] 更新 Issue 20 自动化项，保留人工项
- **Status:** complete

### Phase 7: Electron Acceptance
- [x] 维护者决定自行执行人工验收
- [x] 记录部分试跑发现与剩余复核项
- **Status:** complete

### Phase 8: Core LLM Happy Path Issues 01–03
- [x] 锁定 Core Stage Pack 与阶段定义的 output contract
- [x] 严格校验 Direct LLM JSON 和全部 required artifacts
- [x] 实现草案审核、显式提交和失败保留
- [x] 增加三阶段 mock happy path
- [x] TypeScript、目标测试与 SceneForge 全量回归通过
- [x] 完成模块级 Code Review
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 使用四个独立功能包 | 每包均可单独设计、实施和验收，避免巨型计划 |
| Core LLM Happy Path 优先 | 最快验证 SceneForge 的真实核心价值 |
| Continue 自动运行单独 ADR | 会改变既有 Continue 语义，不能混入普通实现 |
| 采用 Continue & Run 双动作 | 保留默认安全语义，自动运行必须显式触发 |
| PRD/issues 发布到 `.scratch/` | 遵循本仓库本地 Markdown issue tracker 约定 |
| 不修改业务代码、不提交 Git | 当前任务只负责计划与设计文档 |
| 编码规范不整体复制为 ADR | CLAUDE.md 是执行规范，approved engineering constraints 是稳定项目级约束；ADR 仅记录具体架构取舍 |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| `init-session.sh` 无执行权限 | 改用 `bash <script>` 成功初始化 |
| document-helper 英文模板路径不存在 | 复用仓库既有 SceneForge 设计/ADR 格式 |
