# SceneForge Stage Pack Prompt Enrichment 执行计划

**Goal:** 基于旧 `scene_forge/.agents/skills` 对照，补强当前各阶段 stage pack 的 prompt 内容标准，让 Direct LLM 运行时真正继承旧技能里的执行链、交付体裁与关键禁忌。

### Phase 1: 旧 Skill 对照审计
**Status:** complete

- 建立独立执行记录。
- 记录高优先级阶段的旧 skill 与当前 prompt 差距。

### Phase 2: Stage Prompt 补强
**Status:** complete

- 优先补强 `design`、`storyboard`、`video_prompts`、`performance`、`audio`。
- 同步补强 `reference`、`story`、`assets`、`script` 的最小可执行标准。

### Phase 3: Checklist 补强与回归
**Status:** complete

- 更新过薄的 `review-checklist.md`。
- 补充关键短语抽检，确保旧 skill 中的关键规则已进入当前 pack。

### Phase 4: 验证与状态同步
**Status:** complete

- 跑定向测试与 `tsc`。
- 更新 issue、计划与执行进度。
