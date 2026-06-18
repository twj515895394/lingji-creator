Status: completed

## 父问题

`.scratch/sceneforge-studio-p0/PRD.md`

## 要构建什么

按 **ADR-0001**：扩展 `sceneGetProjectState` 返回 `entryPath`；扩展 `submitStageDraft` / service / MCP / IPC / preload / `electron-api` 支持 **`source_intake`**、**`topic_gate`** 及登记的 artifactKey（含改编选择、风格确认等侧车内容）。main / preload / electron-api 同步 + 契约测试。

## 验收标准

- [ ] `electron-api` 或 sceneforge 契约测试覆盖 intake/gate submit
- [ ] 非法 stage/key 仍返回明确错误码
- [ ] Studio 08/09 可调用 submit 写回，不直接写文件

## 被阻塞于

- 08
- 09

## 类型说明

AFK；artifact key 清单以 ADR-0001 与 `scene-stage-definitions` requiredArtifacts 为基准，实现时在 `findings` 或 PR 说明列出最终 key 表。