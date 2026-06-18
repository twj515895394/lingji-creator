Status: ready-for-agent

# P0 Stage Pack 迁移（performance / audio / storyboard / video）

Type: AFK

## 父问题

- 设计：`docs/sceneforge/2026-06-17-sceneforge-stage-pack-migration-design.md`
- 计划：Wave B1–B2

## 要构建什么

从 `scene_forge/.agents/skills` 迁移 **P0** 阶段能力包到 `prompts/sceneforge/stages/`：**performance、audio、storyboard、video_prompts**（含 system/user/agent-instructions、output-contract、review-checklist、references 节选）。每阶段补齐 **context-policy.yaml** 与 **handoff-template.yaml**（与 Issue 13/15 对齐）。

扩展 `scene-stage-pack.ts` 可选加载 policy/handoff 模板路径（不将 references 全文注入 context）。**补全 design** 可本票或拆出——本票至少保证 design 与 P0 四阶段 `loadSceneStagePack` 不抛错。

## 验收标准

- [ ] 上述四阶段目录符合设计 §4 标准布局。
- [ ] `loadSceneStagePack('performance'|'audio'|'storyboard'|'video_prompts')` 成功。
- [ ] 各阶段 `context-policy.yaml` 关键 artifactKey 与旧 skill「输入边界」一致（表驱动或快照测试）。
- [ ] `tests/sceneforge-stage-pack.test.ts` 扩展覆盖。
- [ ] 运行时 **不**读取 `.agents/skills`。

## Review Checklist

- [ ] `MIGRATION.md` 可选记录来源 skill 与差异。
- [ ] 单票不实现 runner（Wave C）。

## 被阻塞于

- Issue 13：Context Policy 与 YAML 加载（policy 文件格式与 loader 共用）