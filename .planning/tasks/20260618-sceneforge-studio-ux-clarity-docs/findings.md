# Findings

## 2026-06-18

- Core MVP 占位文案已经明确写成“仅用于测试校验流程”，并通过确认弹窗再次强调，不再伪装成真实生成。
- `Continue & Run` 已作为独立动作存在，且文案明确说明“将用 Direct LLM 运行下一阶段，生成结果仍需手动提交”。
- Runner 下拉当前通过 `scene-stage-run-capabilities.ts` 过滤，仅展示阶段实际支持的 runner，不支持时会在 continue 能力判断里给出“下一阶段不支持 Direct LLM”等明确原因。
- 因此这包当前更适合作为“文档与状态同步收口”，而不是新一轮实现任务。
