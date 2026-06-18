Status: completed

## 父问题

`.scratch/sceneforge-next-batch/IMPLEMENTATION-PLAN.md` P5

## 要构建什么

**延后**：`SceneForgeStudio` 拆 Shell；侧栏 entryPath 折叠文案（DESIGN §1.3）；欢迎/Setup 扫 Prompt Pack 文案。功能稳定后再做 UI 抛光。

## 验收标准

- [x] 拆出 Shell 后单文件 <800 行
- [x] 侧栏 intake 可跳过文案可见
- [x] 无用户可见「Prompt Pack 项目」主标签

## 被阻塞于

- 07

## 类型说明

AFK；**暂不领取**

## 评论

- 2026-06-18：`SceneForgeStudio.tsx` 当前 736 行；Shell 已拆为 Header、PipelineSidebar、Inspector。
- 2026-06-18：补齐支撑阶段窄类型边界，`npx tsc --noEmit` 已恢复通过。
- 2026-06-18：SceneForge 全量回归 33 files / 122 tests 通过。
