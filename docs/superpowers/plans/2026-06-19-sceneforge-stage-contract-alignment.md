# SceneForge Stage Contract Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `lingji-creator` 的 SceneForge 各阶段产物数量、正式体裁、内容标准和自动 review 尽量对齐旧 `scene_forge` 对应 skill，优先收口 `storyboard`、`video_prompts`，再统一补强 support 阶段。

**Architecture:** 保持当前 Studio 的少量 artifact key 主链不变，优先把旧 skill 的正式体裁、关键 marker 和下游继承语义压回现有 artifact。每个阶段通过 `system.md / user.md / review-checklist.md` 约束生成，再由 `validators.*` 做存在性与语义双重拦截。

**Tech Stack:** Electron, React, TypeScript, Vitest, SceneForge stage packs, stage-specific validators

---

## Scope

- 审计入口文档：`docs/sceneforge/2026-06-19-sceneforge-stage-contract-alignment-audit.md`
- 第一批实施阶段：
  - `storyboard`
  - `video_prompts`
- 第二批实施阶段：
  - `reference`
  - `story`
  - `assets`
  - `script`
  - `performance`
  - `audio`
- 展示层配套：
  - 草案审阅和相关 UI 中的中英结合产物名

## File Map

### Core Prompt Packs

- Modify: `prompts/sceneforge/stages/storyboard/system.md`
- Modify: `prompts/sceneforge/stages/storyboard/user.md`
- Modify: `prompts/sceneforge/stages/storyboard/review-checklist.md`
- Modify: `prompts/sceneforge/stages/video_prompts/system.md`
- Modify: `prompts/sceneforge/stages/video_prompts/user.md`
- Modify: `prompts/sceneforge/stages/video_prompts/review-checklist.md`

### Support Prompt Packs

- Modify: `prompts/sceneforge/stages/reference/review-checklist.md`
- Modify: `prompts/sceneforge/stages/story/review-checklist.md`
- Modify: `prompts/sceneforge/stages/assets/review-checklist.md`
- Modify: `prompts/sceneforge/stages/script/review-checklist.md`
- Modify: `prompts/sceneforge/stages/performance/review-checklist.md`
- Modify: `prompts/sceneforge/stages/audio/review-checklist.md`

### Validators

- Modify: `electron/sceneforge/validators/validators.storyboard.ts`
- Modify: `electron/sceneforge/validators/validators.video-prompts.ts`
- Modify: `electron/sceneforge/validators/validators.reference.ts`
- Modify: `electron/sceneforge/validators/validators.story.ts`
- Modify: `electron/sceneforge/validators/validators.assets.ts`
- Modify: `electron/sceneforge/validators/validators.script.ts`
- Modify: `electron/sceneforge/validators/validators.performance.ts`
- Modify: `electron/sceneforge/validators/validators.audio.ts`
- Modify: `electron/sceneforge/validators/semantic-support-stages.ts`

### UI / Labels

- Modify: `src/sceneforge/lib/scene-artifact-labels.ts`
- Modify: `src/sceneforge/components/stage-run/SceneRunDraftReview.tsx`
- Modify: any additional artifact presentation points discovered during implementation

### Tests

- Modify: `tests/sceneforge-validator.test.ts`
- Create if needed: `tests/sceneforge-storyboard-validator.test.ts`
- Create if needed: `tests/sceneforge-video-prompts-validator.test.ts`
- Modify: `tests/sceneforge-ui.test.tsx`

## Phase Breakdown

### Phase 1: Storyboard Contract Alignment

**Success criteria**

- `storyboard_prompt_pack` 必须体现旧 `scene-storyboard-director` 的核心结构 marker
- `control_board_prompts` / `style_board_prompts` 必须体现正式整板 prompt 三段结构
- `Validate` 能拦住空壳 storyboard 草案

### Phase 2: Video Prompts Contract Alignment

**Success criteria**

- `video_prompt_pack` / `video_prompt_pack_cn` 必须体现旧 `scene-video-prompt-builder` 的四层强结构
- `segment_sound_execution` 与 `pack_audio_execution_plan` 必须进入自动 review
- `Validate` 能拦住只有 segment/audio 关键词但不具正式体裁的草案

### Phase 3: Support Stage Contract Alignment

**Success criteria**

- `reference / story / assets / script / performance / audio` 每个阶段至少具备旧 skill 的正式 marker 和下游继承信息
- `Validate` 不再只停留在“像一段文本”，而是检查正式结构

### Phase 4: Shared Review Framework Cleanup

**Success criteria**

- 抽取重复的 marker 校验 helper（如确有必要）
- 保持 validator 可读，不做过度抽象

## Execution Notes

- 先修 `storyboard`，再修 `video_prompts`
- 每阶段先补 failing validator tests，再改 prompt pack 和 validator
- 不新增 artifact key，除非当前 key 无法承载旧 skill 的关键语义
- 若某阶段必须新增 artifact key，需先停下来写 ADR 或补充设计决策

## Verification Commands

- `npx vitest run tests/sceneforge-validator.test.ts`
- `npx vitest run tests/sceneforge-ui.test.tsx`
- 根据阶段拆分后的新增测试文件逐个运行
- 必要时：`npx tsc --noEmit`

## Risks

- 校验变严格后，已有项目中的历史草案可能大量 fail
- `storyboard` / `video_prompts` 若压入过多旧项目语义，可能导致 prompt token 明显上涨
- 旧 skill 的多文件交付语义压回少量 artifact 时，需谨防把正文写成难读的“大杂烩”

## Rollout Strategy

1. `storyboard` 单独收口并通过测试
2. `video_prompts` 单独收口并通过测试
3. support 阶段分两批补：
   - `reference / story / assets`
   - `script / performance / audio`
4. 最后统一做一轮跨阶段回归和 UI 审阅
