# Remix Issue #1 Findings

## 2026-06-23

- 现有 SceneForge IPC 的稳定接缝是：
  - `electron/sceneforge/ipc.ts` 负责集中 `ipcMain.handle(...)` 注册
  - `electron/preload.ts` 负责 `ipcRenderer.invoke(...)` 暴露
  - `src/lib/electron-api.ts` 负责 renderer 侧统一类型入口
  - `tests/sceneforge-ipc-contract.test.ts` 通过文本契约检查主进程 / preload / renderer 三层是否同步
- Remix IPC 适合完全平行复制这套骨架，而不是把 handler 直接散落在 `electron/main.ts`。
- `Issue #1` 只需要 handler stub，不需要真实业务逻辑；因此适合引入一个很薄的 `RemixService`，把 mock / stub 结构集中在一个地方，后续 Issue #7 / #9 只替换实现，不改 IPC 面。
