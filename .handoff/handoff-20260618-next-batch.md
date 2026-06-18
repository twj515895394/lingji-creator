# SceneForge 下一批（P1–P4）— Handoff 2026-06-18

## 计划与 issues

- PRD：`.scratch/sceneforge-next-batch/PRD.md`
- 设计：`docs/sceneforge/2026-06-18-sceneforge-next-batch-design.md`
- ADR 附录：`docs/adr/0002-appendix-production-support-mvp.md`
- [`.scratch/sceneforge-next-batch/IMPLEMENTATION-PLAN.md`](.scratch/sceneforge-next-batch/IMPLEMENTATION-PLAN.md)
- issues **06–09** 已实现；**10** 延后（UI 债）

## 已完成

| P | 内容 |
| --- | --- |
| **1** | storyboard / video **MVP 占位**；`tests/sceneforge-core-mvp-placeholder.test.ts` |
| **2** | 本 handoff + issues 状态 |
| **3** | Direct LLM 未配置时 **设置 → AI** 引导文案 |
| **4** | **script / performance / audio** 提交 + Validate/Continue（同 reference 模式） |

## 全链人工验收（占位走通，UI 后优化）

建议顺序（每步：提交或 MVP 占位 → Validate → Continue）：

1. gate → reference → story → assets  
2. design → **script** → **performance**  
3. **storyboard**（MVP 占位）→ **audio**  
4. **video_prompts**（MVP 占位，含 Segment/Audio 占位文案）  
5. **export** → 导出 Prompt Pack  

你已验收：gate → assets → design。**后续可按上表继续。**

## 验证

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts  # 113 passed
npx tsc --noEmit
```

## P5 延后（issue 10）

- Studio 拆 Shell、侧栏 entryPath 文案、Setup 文案、gate 卡片 HITL

## git commit

未执行；需要时按模块拆分提交。