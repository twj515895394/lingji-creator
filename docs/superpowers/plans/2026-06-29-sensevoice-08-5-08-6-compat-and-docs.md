# 08-5 / 08-6 Workbench 兼容与文档收口计划

日期：2026-06-29

## 问题理解

在 SenseVoice provider、segment transcript service 与默认切换完成后，消费层还需要补两类收口：

- Workbench / Report Export 正确展示 `engine / timestampLevel / source`
- 文档明确第一阶段是 `segment_range` transcript，不是精准字幕

## 改动范围

- `electron/sceneforge/remix/remix-understanding-workbench.ts`
- `electron/sceneforge/remix/remix-understanding-report-export-service.ts`
- `tests/sceneforge-remix-understanding-workbench-v2.test.ts`
- `tests/sceneforge-remix-understanding-report-export.test.ts`
- `tools/local-stt/README.md`

## 验证方式

1. `npx vitest run tests/sceneforge-remix-understanding-workbench-v2.test.ts tests/sceneforge-remix-understanding-report-export.test.ts`
2. `npx vitest run tests/sceneforge-remix-transcript.test.ts tests/sceneforge-remix-understanding.test.ts tests/sceneforge-remix-understanding-orchestrator.test.ts`
3. `npx tsc --noEmit`

## 预期结果

- Workbench 可识别 SenseVoice transcript 元信息
- 导出报告不再把 `segment_range` 文本误写成精准字幕
- `tools/local-stt/README.md` 能指导本地准备 Whisper 与 SenseVoice 资源
