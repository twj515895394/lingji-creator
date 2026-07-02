# Findings & Decisions

## Requirements
- 创建 source asset 时必须写入真实媒体规格，至少包含 `durationMs`、`width`、`height`、`fps`、`audioChannels`、`hasAudio`
- 当前修复只处理“新创建的 source asset”，不包含历史资产回填
- 必须兼容现有大量基于 fake video 文件的 Remix 单测

## Research Findings
- `electron/sceneforge/remix/remix-source-asset-service.ts` 当前在 `createFromImport()` 内硬编码 `1920x1080 / 25fps / 2ch / hasAudio=true`
- `electron/media-duration.ts` 只有 `readAudioDurationMs()` / `readVideoDurationMs()`，都只读取 `format=duration`
- 当前仓库没有可直接复用的 ffprobe JSON 视频 metadata 解析封装
- `tests/sceneforge-remix-*.test.ts` 中大量通过 `readDurationMs` stub + 文本假文件创建 source asset，因此默认切到真实 ffprobe 会破坏广泛测试
- `src/sceneforge/remix/types/index.ts` 中 `RemixVideoMetadata` 已包含本轮需要的全部字段，无需改 schema
- 现有 `rebuildPublishedSourceAssetLibrary()` 只负责把 manifest 已有内容重新灌入 SQLite，不会修复历史 manifest 中错误的 `videoMetadata`
- 现有 Remix IPC / preload / electron-api / mock API 都是显式列举式契约，新增批量能力必须整条链同步补齐

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 在 `electron/media-duration.ts` 增加 `readVideoMetadata()` | 复用现有 ffprobe 入口，避免把媒体探测逻辑塞进 Remix service |
| `readVideoMetadata()` 使用 `ffprobe -print_format json -show_entries format=duration:stream=...` | 一次调用即可拿到时长、分辨率、帧率和音频流信息 |
| `RemixSourceAssetServiceOptions` 新增 metadata 级注入，同时保留 duration 级注入 fallback | 生产走真实探测，测试继续可控 |
| 新增 `rebuildSourceAssetVideoMetadata`，而不是扩展 `rebuildPublishedSourceAssetLibrary` | 一个修 manifest 真相源，一个修 SQLite 索引，职责边界更清晰 |
| 回填结果返回 `rebuiltAssetIds / syncedPublishedAssetIds / failedAssets` | 方便 UI 或后续脚本区分“已修复”“已同步到库”“失败待处理”三种状态 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `rg` 搜索时把 `-show_entries` 当成参数 | 视为一次探索噪音，未影响实现方向 |

## Resources
- `electron/media-duration.ts`
- `electron/sceneforge/remix/remix-source-asset-service.ts`
- `tests/media-duration.test.ts`
- `tests/sceneforge-remix-source-asset.test.ts`
