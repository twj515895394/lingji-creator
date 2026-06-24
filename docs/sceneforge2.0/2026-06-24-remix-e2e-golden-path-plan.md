# SceneForge Remix — 方案 A 黄金路径实施计划（#7–#14，无运行时 Mock）

> **日期**：2026-06-24  
> **状态**：待执行（Phase 1 起）  
> **前置**：Wave 0–5 UI 恢复已在代码层收口（见 `.handoff/handoff-20260624-193000.md`）  
> **权威 Issue 清单**：`.planning/tasks/remix-issue-07` … `remix-issue-14` 各目录 `task_plan.md`

---

## 1. 用户决策（本计划必须遵守）

| 决策 | 结论 |
|------|------|
| `openProject` 是否继续拆 `App.tsx` | **否**。Remix / SceneForge 接缝已外提；**script 等原有 `openProject` 主体暂不拆**。 |
| 运行时数据策略 | **否 Mock**。Electron 内 Remix 三页只走 `electronAPI.sceneForgeRemix` IPC；无 API 时明确错误/空态，不 silent fallback 到 `createMockRemixApi()`。 |
| 推进方式 | **方案 A 黄金路径**：一条实机链路贯穿 #7–#14，按 Phase 分 3 轮交付。 |

---

## 2. 现状判断

**已具备**：`RemixService` + 子服务、preload IPC、`tests/sceneforge-remix-*.test.ts`（27+）。

**仍缺口**：`resolveRemixApiClientMode` 默认 mock、三页 `useMockSnapshot`、#13/#14 专项测试与实机 E2E。

旧 2026-06-22 开发计划以 Issue #3 Mock 为默认路径，与当前决策冲突 → **需要本 E2E 计划**。

`mock-api.ts` / `createMockRemixApi` **仅单测注入**，不作产品默认。

---

## 3. 黄金路径

```text
projectDir → 导入 → 切片 → 关键帧 → 理解 → 人工标注(#14) → 入库
→ Library / 筛选 → Variant → 策略 → Design → 改图 Prompt
→ 改后帧(#11) → Seedance(#12) → 导出 → Variant 管理(#13)
```

---

## 4. Issue 映射

| Issue | Phase | 完成定义（摘要） |
|-------|-------|------------------|
| #7 | 1 | 入库后端；service 测试绿 |
| #8 | 1 | 三页去运行时 mock；Processing 五步 IPC |
| #14 | 1 | metadata 持久化 + Library 筛选；补 metadata 测试 |
| #9 | 2 | Variant / strategy / design / keyframe-prompt |
| #10 | 2 | Creation 01–05 真实 IPC |
| #13 | 2 | list/rename/duplicate/delete + Library 继续创作 |
| #11 | 3 | 改后帧上传/审批；Seedance 前置校验 |
| #12 | 3 | Seedance、export、发布清单 |

---

## 5. 分阶段执行

### Phase 1（#7 / #8 / #14）

- `remix-api-client.ts`：默认 electron，无 API 抛错
- 三页删除 `useMockSnapshot` 与运行时 `MOCK_*`
- 补 `tests/sceneforge-remix-source-asset-metadata.test.ts`

验证：`npx tsc --noEmit` + source/segmentation/keyframe/understanding/validators + asset-library/processing 测试。

实机：Electron 导入短视频 → 处理五步 → 标注 → 入库。

### Phase 2（#9 / #10 / #13）

- Creation + Library Variant 管理 UI
- 补 `tests/sceneforge-remix-variant-management.test.ts`

### Phase 3（#11 / #12）

- Creation 06–08 步 + export

---

## 6. 环境依赖

FFmpeg/video-import、LLM binding、`projectDir` 全链路透传。`VITE_SCENEFORGE_REMIX_API_MODE` 仅调试文档化。

---

## 7. 明确不做

不拆 `openProject` 主体；不把 #3 当产品里程碑；不恢复 Wave UI 假数据路径。

---

## 8. 执行顺序

1. 确认本计划 → 2. Phase 1 编码 → 3. Phase 2/3 → 4. 全链实机 → 更新 handoff。

**一句话**：关默认 Mock，用黄金路径把 #7–#14 从 service 测试绿推到 Electron 实机绿。
