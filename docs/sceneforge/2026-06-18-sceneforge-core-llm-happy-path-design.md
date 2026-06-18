# SceneForge Core LLM Happy Path — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-core-llm-happy-path/PRD.md`  
> 前置：ADR-0002、Runner 与执行面设计、Core Stage Packs

## 1. 目标

把三个 Core 阶段从“存在 Runner 与占位按钮”推进到“真实生成结果可审阅、可提交、可校验、可审批”的稳定路径，同时不改变 Runner 不写盘的架构边界。

## 2. 核心数据流

```text
StageRunPanel
  → sceneRunStage(direct_llm)
  → SceneContextBuilder
  → Stage Pack + PromptRenderer
  → Provider
  → parse requiredArtifacts
  → Pending Draft Review
  → sceneSubmitStageDraft
  → Artifact Store
  → Validator
  → Approval / Continue
```

## 3. 契约一致性

三个真相源必须一致：

| 阶段 | requiredArtifacts |
| --- | --- |
| design | `design_prompts`、`character_prompts`、`scene_prompts`、`prop_prompts`、`master_reference_prompt` |
| storyboard | `storyboard_prompt_pack`、`control_board_prompts`、`style_board_prompts`、`master_board_prompt` |
| video_prompts | `video_prompt_pack`、`video_prompt_pack_cn` |

新增契约校验函数比较：

- `scene-stage-definitions.ts.requiredArtifacts`
- `output-contract.yaml.requiredArtifacts`
- Runner 返回的非空 artifact keys

若 Stage Pack 与阶段定义不一致，Runner 在调用 Provider 前失败，错误码为 `SCENE_STAGE_OUTPUT_CONTRACT_MISMATCH`。

## 4. Runner 行为

### 4.1 输入

- `projectDir`
- `stage`
- `runnerType: direct_llm`
- policy 驱动的 `SceneStageContext`
- 应用 LLM 设置

### 4.2 输出

```ts
interface SceneStageRunnerResult {
  runnerType: 'direct_llm';
  stage: SceneStageId;
  artifacts: Record<string, string>;
}
```

Runner 仅返回 output contract 中登记的 key。解析结果缺少任意 required key 时，整个运行失败，不返回部分成功结果。

### 4.3 错误分类

| 错误码 | 用户含义 | 恢复方式 |
| --- | --- | --- |
| `SCENE_DIRECT_LLM_NO_SETTINGS` | 未配置 Provider | 打开设置 → AI |
| `SCENE_DIRECT_LLM_UNSUPPORTED_STAGE` | 当前阶段不支持 | 切换手动提交或受支持阶段 |
| `SCENE_STAGE_OUTPUT_CONTRACT_MISMATCH` | Pack 与引擎定义漂移 | 维护者修复 Pack |
| `SCENE_DIRECT_LLM_PARSE_FAILED` | 返回不是可用 JSON | 重试；保留错误摘要 |
| `SCENE_DIRECT_LLM_MISSING_ARTIFACTS` | 缺少 required keys | 重试或调整 Prompt |
| Provider 原始错误 | 网络、鉴权、限流 | 展示可读原始消息 |

## 5. Studio 草案审阅

`StageRunPanel` 拆出专责的 `SceneRunDraftReview`：

- 按 output contract 顺序显示 artifact。
- 每项显示中文标题、artifactKey、字符数和可展开正文。
- 缺失 key 使用错误态卡片，不允许提交。
- 提交按钮文案为“提交 N 个草案到产物库”。
- 重新运行前提示会替换当前未提交草案。
- 提交失败时不清空草案。
- 提交成功后清空草案并刷新项目状态。

首版不提供富文本编辑；需要修改时，用户重新运行或复制到手动编辑路径。

## 6. 阶段切片

### 6.1 Design

- 先验证 Stage Context 含 reference/story/assets 和 selected style。
- mock Provider 返回五项完整草案。
- 提交后 design validator 通过。

### 6.2 Storyboard

- Context 至少包含 design handoff、script、performance。
- Pack 可引用 storyboard methodology assets。
- 返回四项完整草案并通过 validator。

### 6.3 Video Prompts

- Context 包含 storyboard、audio、performance 和 design 摘要。
- 中英文两个 pack 均非空。
- 内容继续满足现有 `Segment`、`Audio` 语义校验。

## 7. 任务进度与并发

- 一次只允许运行当前 StageRunPanel 的一个请求。
- 运行中禁用 Runner 切换、提交和 MVP 占位。
- 继续复用统一 task-progress，不新增独立进度弹窗。
- 首版不支持取消 Provider 请求。

## 8. 测试

| 层级 | 测试 |
| --- | --- |
| Pack | 三阶段 output contract 与 stage definition 一致 |
| Runner | 完整 JSON 成功、无设置、非法 JSON、缺 key |
| Service | run 不写盘；submit 后写盘并校验 |
| UI | 草案顺序、缺失态、提交成功、失败保留 |
| Electron | 真 Provider 至少完成 design 一次 |

## 9. 风险

- 单次生成多 key 输出较长：首版沿用现架构，若真实失败率高再立项逐 key 生成。
- Provider 可能包裹 Markdown code fence：继续复用 `parseLLMJsonResponse`。
- Prompt 质量与结构成功率混在一起：自动化只锁结构，人工验收判断内容质量。

