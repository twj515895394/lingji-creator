# Remix Issue #12：Seedance 2.0 Prompt 输出闭环 — 生成、预览、复制、导出

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 5

## 要构建什么

实现最终的 Seedance 2.0 视频提示词生成、预览、复制和导出功能，贯穿后端服务到前端 UI。

端到端行为：
- 新增 `electron/sceneforge/remix/remix-seedance-prompt-service.ts` — 读取 variant 及其下所有 approved keyframes、关联的 source clip 及 remix design，经 LLM 推理后生成结构化 prompt（包含 audio plan、global rules 和逐 segment prompts）
- 更新 IPC handler 接入：实现 `runSeedancePrompts`（运行生成服务）与 `exportPromptBundle`（导出提示词资源包）
- 更新 `src/sceneforge/remix/pages/RemixCreationWorkspace.tsx` 第 07 步（Seedance 2.0 视频提示词）：
  - 渲染分段的 Seedance Prompt 卡片，展示包含 9 个核心维度的结构化提示词（visual, motion, camera, performance, dialogue, voice, soundEffects, ambientAudio, negative）
  - 提供 "复制 Markdown 格式" 与 "复制纯文本" 功能，支持单段/全局复制
  - 提供 "导出提示词包" 按钮，通过主进程弹出保存对话框，将 json、markdown 提示词及改后关键帧图片打包导出为 zip 或特定文件夹
  - 在同一页面内嵌展示 Audio Plan 高级区域（非独立主导航），可查看 `global_audio_rules`、`voice_profiles`、`segment_audio_plan`
- 更新第 08 步（发布清单）：
  - 汇总展现二创全流程各步骤（从原片选择到 Seedance 提示词生成）的完成校验结果
  - 验证最终打包的完整性和路径引用正确性

## 验收标准

- [ ] 后端服务能针对每个 approved 镜头片段生成对应的 9 维度 Seedance 2.0 Prompt
- [ ] 支持单段 Prompt 的一键复制与 Markdown 格式转换
- [ ] 支持导出完整工程提示词资产包（包含关键帧、说明 manifest、各段提示词 markdown 及 JSON 数据）
- [ ] 在 `keyframes_plus_source_clip` 模式下，生成的 prompt 文本中正确指定 source_clip 路径做为参考
- [ ] 在 `keyframes_only` 模式下，生成的 prompt 文本中只参考 edited keyframes，无 source_clip 依赖引用
- [ ] Audio Plan 以结构化数据生成并可在第 07 步查看：至少覆盖 voice / dialogue / soundEffects / ambientAudio 四层
- [ ] 导出的 prompt bundle 包含 Audio Plan 结构化 JSON 与可读摘要
- [ ] 第 08 步发布清单完整，可以拦截未完成的工作，对全绿状态提供“二创发布完成”的视觉动效

## Code Review 检查项

- [ ] LLM 生成 prompt 时，结构必须严格映射到设计文档指定的 9 大维度，缺一不可
- [ ] 导出操作触发 Electron 原生 `dialog.showSaveDialog` 确保保存路径由用户决定，不默默写入未知目录
- [ ] 导出 bundle 不得包含损坏的资源链接，相对路径必须是自包含（self-contained）的
- [ ] 第一版只支持 Seedance 2.0 的 API，对其它厂商模型的字段做空安全处理
- [ ] Audio Plan 仍作为 Seedance Prompt 页内的高级展开信息区存在，不单独裂变出主流程导航

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-seedance-prompt.test.ts`：测试 LLM 组装、9 维度渲染与路径匹配
- [ ] 新增 `tests/sceneforge-remix-audio-plan.test.ts`：测试 Audio Plan 结构完整性、字段约束与导出内容
- [ ] 新增 `tests/sceneforge-remix-export.test.ts`：校验导出的 zip/目录结构及其中的 JSON、MD 文件的内容合规性
- [ ] 新增 `tests/sceneforge-remix-publish-checklist.test.ts`：测试发布清单的各类前置缺失拦截用例
- [ ] `npm run test` 全量通过
- [ ] 手动端到端验证：从零导入一个原片，走完切片、关键帧、理解，再进入二创、改编、Design、验收上传、提示词生成与导出，检查导出的文件结构是否完好

## 被阻塞于

- Remix Issue #11（需要所有必须的关键帧已 Approved）

## 推荐辅助 Skill

- `codebase-design`：提示词模版结构设计与导出包契约

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 5 (§12)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-module-design.md` — §12
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-frontend-ui-design.md` — §12
