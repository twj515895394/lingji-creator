Status: completed-local

# Prompt Pack 导出与核心流程回归

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

实现第一版 Prompt Pack 文件夹导出，并补一条端到端回归：create project -> submit core artifacts -> validate -> approve -> export。导出只包含 approved/final 的核心产物和 manifest，后续再扩展 ZIP 与支撑产物附录。

## 验收标准

- [x] 导出目录位于 `sceneforge/exports/prompt_pack/`。
- [x] 导出包含 `final_prompt_pack.md`、`design_prompts.md`、`storyboard_prompts.md`、`video_prompts.md`、`manifest.json`。
- [x] 未 approved 的核心产物不会进入最终导出。
- [x] Service 暴露 `exportPromptPack`，IPC 和 MCP 均可调用。
- [x] 覆盖 export 单测和核心流程端到端回归。
- [x] 相关回归测试通过：`tests/sceneforge-*.test.ts`、`tests/project-file.test.ts`、`tests/pipeline-*.test.ts`、`tests/electron-api.test.ts`。

## Review Checklist

- [x] 导出逻辑只读取 manifest 中 eligible 的核心产物，不扫目录猜测。
- [x] `final_prompt_pack.md` 内容顺序稳定，便于 diff 和回归测试。
- [x] 导出不会覆盖源阶段产物。
- [x] 导出完成后 `project.json.sceneforge.lastExportPath` 更新。
- [x] 导出失败返回结构化错误，不留下半注册 artifact。
- [x] 端到端测试覆盖 `validated != approved` 和未审批不导出。

## 被阻塞于

- Issue 05：需要三个核心阶段与 Stage Context。
- Issue 06：需要 IPC/MCP 服务面。

## Implementation Notes

- 已实现 Prompt Pack 文件夹导出、稳定输出顺序、manifest 过滤、`lastExportPath` 更新和 IPC/MCP 调用面。
- 核心流程回归覆盖 create project -> submit -> validate -> approve -> export 的主路径，并覆盖未审批不导出。
- 对应执行记录：`.planning/tasks/sceneforge-issue-08/`。

## Verification

- 覆盖 export 单测和核心流程回归；`validated != approved` 与未审批不导出已纳入测试。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- 导出失败不会注册半成品 artifact，也会通过 IPC/MCP 返回结构化错误；但当前文件写入不是事务式操作，极端失败时可能留下部分导出文件，后续可补原子目录/临时目录切换。
- 原总计划提到单独 `tests/sceneforge-core-flow.test.ts` 和 `npm run build`；当前核心流程回归分布在 export/service/stage 测试中，尚未单独建该测试文件，也未跑完整 build。
