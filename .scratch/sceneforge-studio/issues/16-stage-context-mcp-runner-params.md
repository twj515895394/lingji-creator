Status: ready-for-agent

# Stage Context MCP 与 runner 参数

Type: AFK

## 父问题

- 设计：D1 §6.2、D3 §6
- 计划：Wave A4

## 要构建什么

扩展 **`scene_get_stage_context`**（IPC / preload / `electron-api` / MCP）支持可选参数：`runner?: manual_submit | direct_llm | acp_agent`、`selectedAssetIds?: string[]`（后者与 Issue 10 Service 能力对齐）。不同 runner 应用 policy 中的 **runnerOverrides**（如 maxTotalChars）。

三件套同步；契约测试更新。

## 验收标准

- [ ] `electron/sceneforge/ipc.ts`、`electron/preload.ts`、`src/lib/electron-api.ts` 签名一致。
- [ ] MCP `scene_get_stage_context` 接受 `runner`；返回 JSON 含 warnings，且 **不**附加 policy 未声明的 artifact。
- [ ] `tests/sceneforge-ipc-contract.test.ts` 覆盖新参数/类型。
- [ ] `npx tsc --noEmit` 通过。

## Review Checklist

- [ ] 不新增 Cut 通用 IPC；保持在 `sceneforge:*` 命名空间。

## 被阻塞于

- Issue 14：SceneContextBuilder 与受控 Stage Context