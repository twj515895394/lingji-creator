# Flow Hardening — Progress

## 状态：自动化切片已完成（2026-06-19）

维护者确认：Issues 01–04 均已接线。

| Issue | 内容 | 状态 |
| --- | --- | --- |
| 01 | Required 上下文 UI 阻塞 | ✅ |
| 02 | script / performance 语义 validator（全 failed） | ✅ |
| 03 | audio / assets 语义 validator | ✅ |
| 04 | acp_agent 单轮 run → 审阅 → submit | ✅ |

产品决策（已贯彻）：required 禁止 Run；语义全 failed；ACP 单轮够。

## 建议收口验证

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-required-context.test.ts tests/sceneforge-semantic-validators.test.ts tests/sceneforge-acp-agent-happy-path.test.ts
npx vitest run tests/sceneforge-*.test.ts tests/sceneforge-*.test.tsx tests/electron-api.test.ts
git diff --check
```

## 人工

- Support Pack **Issue 07**：真 LLM + 可选真 ACP + 手工降级
- 历史 **Issue 20**：Continue 后 Renderer 切换（有复现再修）

## Phase 3 下一包（独立 PRD）

1. **项目级 Style / selectedAssetIds** — `.scratch/sceneforge-studio/issues/10-scene-asset-library-and-style-profiles.md`
2. **Regenerate / Request Revision**
3. **Publish Stage**
4. ACP **多轮**对话（二期）

## 相关文档

- `.scratch/sceneforge-flow-hardening/PRD.md`
- `.scratch/sceneforge-flow-hardening/PROBLEM-ANALYSIS.md`
- `.handoff/handoff-20260619-support-pack-wave-closure.md`