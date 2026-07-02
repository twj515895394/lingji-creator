# Task Plan: Remix Source Metadata 真值采集

## Goal
让 SceneForge Remix 既能在创建 source asset 时写入真实的 `durationMs / width / height / fps / audioChannels / hasAudio`，也能对历史 asset 执行媒体元数据回填并同步已发布 SQLite 记录。

## Current Phase
Phase 6

## Phases

### Phase 1: Requirements & Discovery
- [x] 读取 handoff，确认问题根因在 `remix-source-asset-service.ts` 的默认 metadata 写死
- [x] 核对现有媒体读取能力，确认 `electron/media-duration.ts` 目前只提供 duration 探测
- [x] 记录现有测试注入方式：大量 Remix 测试依赖 `readDurationMs` stub 创建假视频资产
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 确定最小修复方案：在 `electron/media-duration.ts` 增加视频 metadata 探测函数
- [x] 确定兼容策略：`RemixSourceAssetService` 默认使用真实探测；测试若只注入 `readDurationMs`，继续走兼容 stub metadata
- [x] 确定本轮暂不处理历史资产回填和 `master_clip` 设计，保持外科手术式改动
- **Status:** complete

### Phase 3: Implementation
- [x] 修改 `electron/media-duration.ts`，增加 ffprobe JSON 解析和视频 metadata 读取
- [x] 修改 `electron/sceneforge/remix/remix-source-asset-service.ts`，创建 source asset 时写入真实 metadata
- [x] 仅清理本次改动直接产生的类型/注入适配，不做无关重构
- **Status:** complete

### Phase 4: Testing & Verification
- [x] 更新 `tests/media-duration.test.ts`，覆盖 fps / 音轨 / 显式 ffprobePath
- [x] 更新 `tests/sceneforge-remix-source-asset.test.ts`，验证 source asset 持久化真实 metadata
- [x] 运行定向测试并记录结果
- **Status:** complete

### Phase 5: Delivery
- [x] 自审语法、依赖、回归风险
- [x] 汇总改动范围、验证结果、剩余风险
- **Status:** complete

### Phase 6: Historical Metadata Backfill
- [x] 设计独立 IPC：不复用 `rebuildPublishedSourceAssetLibrary()` 语义，避免把 DB 重建与 manifest 修复混在一起
- [x] 新增批量重建链路：重探 source video metadata、写回 manifest、仅对已发布资产同步 SQLite
- [x] 补充 mock / IPC 契约 / service tests，覆盖成功、published sync、missing asset 失败分支
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 先修 source metadata 真值采集，不同时引入 `master_clip` | 这是当前误导 UI 与入库判断的直接根因，收益最高且改动面最小 |
| 把通用 ffprobe metadata 读取放在 `electron/media-duration.ts` | 该文件已承载媒体时长探测，是当前最自然的复用接缝 |
| 保留 `readDurationMs` 注入兜底 | 既有大量测试使用假视频文件，直接切真实 probe 会导致无关测试整体失效 |
| 为 `tests/sceneforge-remix-source-asset.test.ts` 补最小 mock LLM 注入 | 当前测试会调用 `runSourceUnderstanding()`，不注入 mock 会被现有 LLM 配置门禁拦住 |
| 历史资产回填走独立 `rebuildSourceAssetVideoMetadata` IPC | 避免污染现有 `rebuildPublishedSourceAssetLibrary()` 的“只重建 SQLite”语义 |
| 已发布资产回填后立即同步 SQLite，草稿资产只改 manifest | 这样 asset library 查询结果能立刻纠正，同时不把未发布资产提前写入库 |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| `rg` 将 `-show_*` 误判为命令参数 | 改为更安全的搜索写法，并据此确认仓库里没有现成的 ffprobe JSON 探测封装 |
| `npx tsc --noEmit` 失败 | 失败来自工作区既有未提交的 transcript stale 修复文件类型断言，不属于本轮 metadata 改动 |
