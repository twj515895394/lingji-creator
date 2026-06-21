Status: pending-manual-validation

# Issue 04：主链验收与回归

## 目标

确认 `topic_gate -> design -> script -> storyboard` 的节奏 contract 在真实链路里成立，而不是只在文档和单测里成立。

## 验收重点

- gate 中 `segment_duration_sec` 能被设计与脚本显式继承
- storyboard 不会生成跨段 shot
- storyboard 镜头密度符合段长与 pacing profile
- 切换阶段与回到阶段后，草案与校验状态恢复正常

## 建议场景

- `8s + lyrical`
- `10s + balanced`
- `15s + kinetic`

## 回归范围

- stage-context
- stage-pack
- semantic validators
- storyboard validator
- support/direct-llm happy path

## 交付

- 更新 checklist / progress / handoff
- 记录至少一个失败样例及其最终修复结论

## 本轮实现结果

- 代码侧 contract 已完成：
  - `design` 新增项目级 rhythm contract 校验与 prompt 约束
  - `script` 新增 pacing handoff、segment boundary、boundary lock 校验
  - `storyboard` 新增 shot density、pacing profile、跨段镜头硬校验
- 自动化回归已完成：
  - `npx vitest run tests/sceneforge-semantic-validators.test.ts tests/sceneforge-support-submit.test.ts tests/sceneforge-support-llm-happy-path.test.ts tests/sceneforge-validator.test.ts`
  - `npx vitest run tests/sceneforge-validator.test.ts tests/sceneforge-stage-context.test.ts tests/sceneforge-phase2-integration.test.ts tests/sceneforge-core-llm-happy-path.test.ts`
  - `npx tsc --noEmit`

## 已记录失败样例

- 样例：`script` 阶段真实草案中已存在 `story_beats`，但仍被误判为“至少应给出 3 个以上 beat，并明确 beat_id”
- 根因：旧解析逻辑只接受过窄的 beat 标记格式，未覆盖真实草案里的 `- **beat_01: 标题**` 与编号标题变体
- 处理：扩展 `semantic-support-stages.ts` 的 section / beat 解析规则，并补齐定向回归
- 结论：当前该误判已在本地修复，但仍需通过真机链路再次确认 `script -> performance -> storyboard` 的真实产物格式稳定

## 剩余人工验证

- 使用真实项目至少验证以下场景之一：
  - `8s + lyrical`
  - `10s + balanced`
  - `15s + kinetic`
- 将结果回写到：
  - `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md`
  - 最新 `.handoff/` 文档
