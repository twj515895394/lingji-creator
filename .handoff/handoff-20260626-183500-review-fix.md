# Handoff Review Fix - 2026-06-26 18:35:00

承接：

```text
.handoff/handoff-20260626-181500-review.md
```

当前任务：按 review handoff 的问题顺序修复 Phase 0-5 发现的问题。

本轮没有运行本地命令：

```bash
npx tsc --noEmit
npx vitest run --reporter=basic
```

---

## 一、本轮已修复

### P0-1：`regenerateSourceSegmentClips()` 不应删除关键帧

修复文件：

```text
electron/sceneforge/remix/segment-clips/segment-clip-maintenance.ts
```

提交：

```text
ff0c2d8b0f94b2119ff3ebf88f4797b0f848fb67
```

修复前：

```text
regenerateSourceSegmentClips()
  → writeSegmentArtifacts()
  → fs.rm(source_segments/, recursive)
  → 会删除 source_clip.mp4、segment_manifest.json、first/middle/last PNG
```

风险：

```text
用户已完成 Phase 4 关键帧抽取后，点击“重新生成片段”会误删关键帧 PNG。
```

修复后：

```text
regenerateSourceSegmentClips()
  → 直接调用 SegmentClipService.generateClips()
  → 只覆盖每个 segment.sourceClipPath 对应的 source_clip.mp4
  → 不删除 source_segments/ 目录
  → 不删除 first_frame.png / middle_frame.png / last_frame.png
  → 仍会更新 diagnostics.clipGeneration
  → 仍会写 clip_generation_report.json
```

待验证：

```text
1. 先运行关键帧抽取生成 PNG。
2. 再点击“重新生成片段”。
3. 确认 PNG 仍存在，source_clip.mp4 被重建。
```

---

### P0-2：补全 `window.electronAPI` 全局类型声明

修复文件：

```text
src/sceneforge/remix/segment-clip-api.d.ts
```

提交：

```text
3e22dbd00a1b604f62a924dff95dd4e7518dd500
```

修复前：

```text
SegmentClipActionsPanel.tsx 使用 window.electronAPI?.showItemInFolder
但 segment-clip-api.d.ts 只声明 window.sceneForgeRemixSegmentClips
```

风险：

```text
tsc 可能报 Property 'electronAPI' does not exist on type Window。
```

修复后：

```ts
interface Window {
  electronAPI?: ElectronAPI;
  sceneForgeRemixSegmentClips?: RemixSegmentClipApi;
}
```

待验证：

```bash
npx tsc --noEmit
```

---

### P1-2：debug 报告写入失败不应阻断主流程

修复文件：

```text
electron/sceneforge/remix/remix-debug-artifacts.ts
```

提交：

```text
a294dd8cac74442230ae138d070120c3ba8107a1
```

修复前：

```text
writeRemixDebugJson() 写 JSON 或 progress_events.jsonl 失败会直接 throw。
```

风险：

```text
主产物已经生成成功，但 debug 文件写入失败会导致整个阶段失败。
```

修复后：

```text
writeRemixDebugJson() 改为 best-effort。
写入失败只 console.warn，不阻断主流程。
progress_events.jsonl 追加失败也只 warn。
```

---

### P1-3：clip 生成失败时也要写失败版 `clip_generation_report.json`

修复文件：

```text
electron/sceneforge/remix/segment-clips/segment-clip-service.ts
```

提交：

```text
f2b5cf8f373fd46f05cb198a98861765c7ce046c
```

修复前：

```text
SegmentClipService.generateClips()
  → 任意片段 ffmpeg 失败
  → throw
  → 调用方后续无法写 clip_generation_report.json
```

修复后：

```text
generateClips() 会先构造完整 summary：
  totalCount
  successCount
  failedCount
  results[]

若存在 failed：
  先写 debug/clip_generation_report.json，status=failed
  再 throw 明确错误
```

待验证：

```text
构造一个 ffmpeg 会失败的视频/片段，确认 debug/clip_generation_report.json 仍写出，并包含 failed results。
```

---

### P1-4：关键帧抽取失败时也要写失败版 `keyframe_report.json`

修复文件：

```text
electron/sceneforge/remix/remix-keyframe-service.ts
```

提交：

```text
fe474e5c418039c61790ad0f2549358261bf847d
```

修复前：

```text
某一张关键帧抽取失败
  → 直接 throw
  → keyframe_report.json 不会写出
```

修复后：

```text
失败时先 append 一条 status=failed 的 report item：
  segmentId
  frameRole
  timestampMs
  inputSource
  inputPath
  seekMs
  outputPath
  error

然后写 debug/keyframe_report.json，status=failed，再抛出错误。
```

待验证：

```text
模拟某个 clip/source 不可读，确认 keyframe_report.json 仍写出且包含失败项。
```

---

### P1-6：TransNetV2 accurate worker 增加长视频内存保护

修复文件：

```text
resources/shot-detectors/accurate_transnetv2.py
```

提交：

```text
6d25114fb9acca93bc4acfc7b26542a0b5e3ea4e
```

修复前：

```text
accurate worker 会一次性读取整段视频全部帧：
  frames.append(...)
  np.stack(frames)
  model(tensor)
```

风险：

```text
长视频可能 OOM。
```

修复后：

```text
新增 DEFAULT_MAX_FRAMES = 20000
支持环境变量：LINGJI_TRANSNETV2_MAX_FRAMES
支持 request.maxFrames

如果视频帧数超过限制：
  抛出友好错误
  TS 侧 accurate 模式捕获后 fallback 到规则候选
```

错误示例：

```text
TransNetV2 accurate mode skipped to avoid OOM: video has about xxx frames, limit is 20000.
```

待验证：

```text
1. 使用超长视频跑 accurate。
2. 确认不会 OOM。
3. 确认 diagnostics.fallbackReason 和 shot_detection_result.json 有清晰错误。
```

---

## 二、仍未完全修复的问题

### P1-1：构建期字符串注入仍是临时方案

涉及：

```text
electron.vite.config.ts
src/sceneforge/remix/pages/RemixAssetProcessing.tsx
electron/preload.ts
```

状态：未修复。

原因：

```text
RemixAssetProcessing.tsx 和 preload.ts 都是大文件。此前直接替换 main.ts 出现过截断风险，因此本轮没有继续大文件源码迁移。
```

建议后续修复：

```text
1. 在本地 IDE 中显式修改 RemixAssetProcessing.tsx：
   import SegmentClipActionsPanel
   在 SegmentTimeline 前直接渲染组件

2. 在 preload.ts 中显式合并 sceneForgeRemixSegmentClips 或直接扩展 electronAPI.sceneForgeRemix。

3. 删除 electron.vite.config.ts 中两个 transform 注入插件。
```

优先级：P1，但不阻塞当前人工测试；需要 tsc 和 UI 验证。

---

### P1-5：TransNetV2 HF 真实模型适配仍需模型文件到位后修

涉及：

```text
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/vendor/transnetv2/
resources/models/transnetv2/
```

状态：未完全修复。

原因：

```text
当前 worker 是通用适配层，尚未拿到实际 Hugging Face 文件名、类名、构造函数与 forward 输出结构进行 smoke test。
```

已缓解：

```text
增加了 max frame guard，避免长视频 OOM。
```

后续需要：

```text
1. 放入 HF vendor 代码和 .pth。
2. 运行 validate_transnetv2_assets.py。
3. 运行 detect_shots.py accurate smoke test。
4. 若模块名/类名/构造函数不匹配，补专用 adapter。
```

---

### P2-1：userDataDir fallback 仍未接入真实 Electron app.getPath('userData')

状态：未修复。

原因：

```text
需要引入 Electron app.getPath('userData') 到运行时 resolver 入口。该项不是 P0/P1 主阻塞，本轮先不动主进程依赖。
```

---

### P2-2 / P2-3：progress_events.jsonl 仍是调试报告事件，不是真实时进度流

状态：未修复。

说明：

```text
当前 progress_events.jsonl 记录“报告写入事件”。
remix-progress-events.ts 仍是后续更细粒度进度的预留模块。
```

---

### P2-4：runtime_diagnostics.json 路径脱敏未做

状态：未修复。

说明：

```text
开发期保留完整路径便于排查。
若后续提供“一键导出 debug 包”，需要加脱敏策略。
```

---

## 三、当前建议验证顺序

先运行：

```bash
npx tsc --noEmit
```

重点关注：

```text
1. Window.electronAPI 全局类型是否还有冲突。
2. segment-clip-api.d.ts 跨 src/electron 类型引用是否通过。
3. accurate_transnetv2.py 改动不影响 TS，但相关 resource 文件应保留。
4. SegmentClipService 新增 debug imports 是否有循环或类型问题。
```

再运行：

```bash
npx vitest run --reporter=basic
```

最后做人工视频测试：

```text
1. fast 切片
2. source_clip.mp4 生成
3. 关键帧抽取
4. 重新生成片段后关键帧仍存在
5. 故意制造 ffmpeg 失败，检查失败版 report
6. accurate 缺模型 fallback
7. accurate 超长视频 max frame guard fallback
```

---

## 四、下一步建议

不建议继续新功能。

建议下一轮：

```text
1. 跑 tsc/vitest。
2. 根据编译/测试结果做 Review Fix Round 2。
3. 如果测试通过，再按人工验证清单跑真实视频流程。
```
