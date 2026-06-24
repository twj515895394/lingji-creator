Status: todo

# 补齐 Prompt Bundle 导出到文件夹入口

Type: AFK

## 父问题

`.scratch/sceneforge-remix-review-followups/PRD.md`

## 要构建什么

补齐 Remix Prompt Bundle 的“导出到文件夹”入口。当前后端 `exportBundle()` 已支持输出到目录，但主进程和前端交互只暴露了 `.zip` 保存对话框，导致用户实际上只能导出 zip，未兑现 `Issue #12` 中“zip 或特定文件夹导出”的产品契约。

本 issue 要求在不破坏现有 zip 导出流程的前提下，为用户提供明确的目录导出入口，并让前后端路径语义保持一致。

## 验收标准

- [ ] 用户可以在 UI 中明确选择“导出 ZIP”或“导出到文件夹”
- [ ] 选择“导出到文件夹”时，主进程使用目录选择对话框，而非 `.zip` 保存框
- [ ] 导出到文件夹后，bundle 内容结构与 zip 解压后的结构一致
- [ ] 现有 zip 导出路径保持可用，不引入回归
- [ ] 导出完成后的成功提示能准确显示输出类型与路径

## Review Checklist

- [ ] renderer 层不假定所有导出路径都以 `.zip` 结尾
- [ ] 主进程目录选择逻辑与 zip 保存逻辑语义分离，不共用模糊 IPC
- [ ] `exportPromptBundle` 对 zip / directory 两种路径的判定清晰且可测
- [ ] 测试覆盖 zip 与目录两种导出模式，避免“后端支持但 UI 不可达”再次发生

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新 `tests/sceneforge-remix-export.test.ts`，覆盖 zip 与目录导出
- [ ] 更新 `tests/sceneforge-remix-creation-workspace.test.tsx`，覆盖用户选择不同导出方式的交互
- [ ] 如有 IPC 合同测试，补对 directory picker 的断言
- [ ] `npm run test -- sceneforge-remix-export sceneforge-remix-creation-workspace`

## 涉及范围

- `electron/main.ts`
- `electron/preload.ts`
- `src/lib/electron-api.ts`
- `src/sceneforge/remix/pages/RemixCreationWorkspace.tsx`
- `tests/sceneforge-remix-export.test.ts`
- `tests/sceneforge-remix-creation-workspace.test.tsx`

## 关联说明

- 这是 `Issue #12` 的需求补齐，不是新增能力包
- 如果后续要处理跨平台 zip 风险，应作为相邻但独立的实现票，不和本票混做
