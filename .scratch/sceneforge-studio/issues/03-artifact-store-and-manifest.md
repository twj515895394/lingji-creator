Status: completed-local

# Artifact Store 与 Manifest 注册闭环

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

实现 SceneForge Artifact Store，使阶段产物只能通过服务写入受控路径，并自动注册到 `sceneforge/artifact_manifest.yaml`。UI、Validator、Stage Context 和 Export 都以 manifest 为主索引，不扫描全项目目录猜测产物。

## 验收标准

- [x] 能写入 Design / Storyboard / Video Prompts 阶段产物到 `sceneforge/stages/<stage>/outputs/`。
- [x] 每次写入产物后自动注册或更新 manifest。
- [x] manifest 记录 artifact id、stage、kind、role、title、path、coreAsset、readableByDownstream、usedBy、viewModes、createdAt。
- [x] `listSceneArtifacts` 能按项目读取 manifest 中的产物。
- [x] `readSceneArtifact` 能根据 artifact id 读取内容。
- [x] 拒绝项目目录外路径和任意 path 写入。

## Review Checklist

- [x] Artifact Store 是产物写入和 manifest 注册的唯一入口。
- [x] 没有让 Agent 或 UI 传任意 filesystem path。
- [x] path 存储为项目相对路径，避免跨机器不可移植。
- [x] draft/review/system 产物没有混入 core outputs。
- [x] manifest 重复写同一 artifact id 时会更新而不是追加重复项。
- [x] 测试覆盖写入、读取、重复注册和越权路径。

## 被阻塞于

- Issue 01：需要项目目录骨架。

## Implementation Notes

- 已实现受控 Artifact Store、manifest 注册/更新、按 artifact id 读取和项目目录边界校验。
- 对应执行记录：`.planning/tasks/sceneforge-issue-03/`。

## Verification

- 覆盖写入、读取、重复注册、项目相对路径和越权路径拒绝。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- 本票只保证产物写入与 manifest 索引边界；展示模型和复制体验由 Issue 11/12 承接。
