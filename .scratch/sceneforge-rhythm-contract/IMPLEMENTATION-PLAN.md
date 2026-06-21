# SceneForge Segment Rhythm Contract Implementation Plan

> **For agentic workers:** 先改 contract 与 validator，再做真机验收记录。未经用户同意不提交 Git。

**Goal:** 把 `topic_gate` 中的段长设定升级为贯穿 `design / script / storyboard` 的正式节奏 contract，并保证 storyboard 镜头拆分遵守段界与密度规则。

**Architecture:** 复用现有 `Stage Context + Stage Pack + Validator` 主接缝；不新增 stage、不新增 artifact key、不改 `project.json`、不加 IPC。

**Tech Stack:** Electron、TypeScript、React、Vitest、SceneForge stage packs、semantic validators。

---

## 文件结构

- Modify: `prompts/sceneforge/stages/design/*`
- Modify: `prompts/sceneforge/stages/script/*`
- Modify: `prompts/sceneforge/stages/storyboard/*`
- Modify: `src/sceneforge/lib/scene-prep-support-stages.ts`
- Modify: `electron/sceneforge/validators/validators.design.ts`
- Modify: `electron/sceneforge/validators/validators.script.ts`
- Modify: `electron/sceneforge/validators/validators.storyboard.ts`
- Modify: `electron/sceneforge/validators/semantic-support-stages.ts`
- Modify: `tests/sceneforge-validator.test.ts`
- Modify: `tests/sceneforge-semantic-validators.test.ts`
- Modify: `tests/sceneforge-stage-pack.test.ts`
- Modify: `tests/sceneforge-stage-context.test.ts`
- Modify: `tests/sceneforge-support-llm-happy-path.test.ts`

## Task 1：落地 design 节奏 contract

- [ ] 明确 `design` 阶段应新增的节奏 section 命名与最小字段集合。
- [ ] 为 `design` 阶段增加 validator failing cases：缺 segment duration、缺 density 表、缺 boundary rule。
- [ ] 补 `design` prompt / review checklist / 手工模板，使其正式输出项目级 rhythm contract。
- [ ] 跑 `design` 定向测试，确认现有 design contract 未回退。

## Task 2：落地 script 段级 pacing handoff

- [ ] 明确 `script` 阶段应新增的 segment pacing 字段位置，保持单 artifact。
- [ ] 为 `script` 增加 failing cases：无 pacing profile、无 shot density hint、跨段 handoff。
- [ ] 补 `script` prompt / review checklist / 手工模板，使其输出可被 storyboard 消费的 pacing handoff。
- [ ] 跑 script 定向测试与 support happy path。

## Task 3：落地 storyboard 硬执行与硬校验

- [ ] 把 `5 / 6 / 8 / 10 / 15` 的 density 区间与 `lyrical / balanced / kinetic` 推荐带压进 storyboard contract。
- [ ] 为 `storyboard` 增加 failing cases：跨段 shot、密度过低、密度过高、pacing mismatch。
- [ ] 保持现有 pack / copy-block / total_shots 规则不回退。
- [ ] 跑 storyboard 与 video-prompt 相邻回归。

## Task 4：主链验收与缺陷回补

- [ ] 至少走一条 `topic_gate -> design -> script -> storyboard` 主链。
- [ ] 验证 gate 中不同段长至少覆盖 `8s / 10s / 15s` 三档，必要时再补 `5s / 6s` fixture。
- [ ] 若暴露确定性缺陷，按单缺陷最小修复回补，不混入 UI redesign。
- [ ] 回写 checklist / progress / handoff。

## 建议提交切片

1. `test(sceneforge): add rhythm contract coverage for design script storyboard`
2. `feat(sceneforge): align design and script pacing contract`
3. `feat(sceneforge): enforce storyboard segment boundary and shot density`
4. `docs(sceneforge): record rhythm contract acceptance and handoff`
