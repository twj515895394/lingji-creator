# Handoff - Local Agent Master - 2026-06-26 19:30:00

## 0. 用途

这份 handoff 是给本地 agent / 本地 IDE 继续优化、补全、编译、测试使用的总入口。

它合并了本轮围绕 SceneForge 2.0 Remix 分镜切片能力的所有 Phase、review 修复、遗留问题、待测试点与建议执行顺序。

当前分支：

```text
sceneforge2.0-remix
```

重要基线：

```text
上一轮 Remix handoff 基线：.handoff/handoff-20260626-140501.md
Review compare base: d455ca4996dd76978a5a57cb598678f9779faabf
```

当前状态：

```text
Phase 0：开发完成，待本地验证
Phase 1：开发完成，待本地验证
Phase 2：开发完成，待本地模型验证
Phase 3：开发完成，待本地验证；仍建议把构建期注入改成源码显式接入
Phase 4：开发完成，待本地验证
Phase 5：开发完成，待本地验证
Review Fix Round 1/2/3：已完成大部分可远程安全修复项
```

本轮所有修改均未在当前环境运行：

```bash
npx tsc --noEmit
npx vitest run --reporter=basic
```

也未执行真实视频 smoke test。

---

## 1. 本轮需求背景

目标：把 Remix 原片分镜切片从规则模拟升级为真实可用链路。

核心要求：

```text
1. fast 模式使用 PySceneDetect。
2. accurate 模式使用 TransNetV2。
3. 每个 SourceSegment 不只是时间范围，还必须生成真实 source_clip.mp4。
4. 真实分镜片段要能用于 Seedance 2.0、人工二创、素材复用、后续编辑。
5. 关键帧不能再是 1px 占位 PNG，要从视频中真实抽取。
6. 每完成一个 Phase，即使只剩人工测试，也要生成 handoff。
7. review 发现的问题按顺序修复；需要本地 IDE 或模型文件的先留给本地处理。
```

---

## 2. Phase 完成情况

### Phase 0：模型资产与目录约定

状态：开发完成，待本地验证。

主要文件：

```text
resources/models/transnetv2/README.md
resources/models/transnetv2/model-config.example.json
resources/models/transnetv2/.gitignore
resources/shot-detectors/README.md
resources/shot-detectors/requirements-fast.txt
resources/shot-detectors/requirements-accurate.txt
resources/shot-detectors/validate_transnetv2_assets.py
resources/shot-detectors/vendor/transnetv2/README.md
resources/shot-detectors/vendor/transnetv2/.gitkeep
resources/python-runtime/README.md
resources/python-runtime/.gitkeep
resources/python-runtime/.gitignore
electron/sceneforge/remix/shot-detection/model-path-resolver.ts
electron/sceneforge/remix/shot-detection/python-runtime-resolver.ts
tests/sceneforge-remix-transnetv2-model-path-resolver.test.ts
tests/sceneforge-remix-shot-python-runtime-resolver.test.ts
scripts/package-mac-helpers.cjs
```

重点行为：

```text
LINGJI_TRANSNETV2_MODEL_PATH
LINGJI_TRANSNETV2_VENDOR_DIR
LINGJI_TRANSNETV2_USER_DATA_DIR
LINGJI_USER_DATA_DIR
LINGJI_SHOT_PYTHON
```

权重默认名：

```text
transnetv2-pytorch-weights.pth
```

用户数据目录约定：

```text
$LINGJI_TRANSNETV2_USER_DATA_DIR/models/transnetv2/transnetv2-pytorch-weights.pth
```

---

### Phase 1：fast 真实检测 + source_clip.mp4 最小闭环

状态：开发完成，待本地验证。

主要文件：

```text
electron/sceneforge/remix/shot-detection/shot-detector-types.ts
electron/sceneforge/remix/shot-detection/shot-detector-runner.ts
resources/shot-detectors/common.py
resources/shot-detectors/fast_pyscenedetect.py
resources/shot-detectors/detect_shots.py
electron/sceneforge/remix/segment-clips/segment-clip-service.ts
electron/sceneforge/remix/remix-segmentation-service.ts
src/sceneforge/remix/types/index.ts
```

重点行为：

```text
fast 模式：PySceneDetect AdaptiveDetector
失败：fallback 到规则候选边界
片段生成：SegmentClipService 使用 ffmpeg 生成真实 source_clip.mp4
clip 生成失败：写失败版 clip_generation_report.json，再抛错
```

---

### Phase 2：accurate TransNetV2 + fallback

状态：开发完成，待本地模型验证。

主要文件：

```text
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/detect_shots.py
electron/sceneforge/remix/remix-segmentation-service.ts
resources/shot-detectors/README.md
```

重点行为：

```text
accurate 模式：优先解析 TransNetV2 weights/vendor
assets 缺失：fallback 到规则候选边界，并写 fallbackReason
worker 失败：fallback 到规则候选边界，并写 fallbackReason
长视频保护：LINGJI_TRANSNETV2_MAX_FRAMES，默认 20000 frames
```

仍待本地模型验证：

```text
vendor 文件名
模型类名
构造函数签名
.pth 格式
forward 输入输出
```

---

### Phase 3：片段导出、重生成、路径 API

状态：开发完成，待本地验证；仍建议本地 IDE 做显式源码接入。

主要文件：

```text
electron/sceneforge/remix/segment-clips/segment-clip-exporter.ts
electron/sceneforge/remix/segment-clips/segment-clip-maintenance.ts
electron/sceneforge/remix/segment-clips/segment-clip-ipc.ts
electron/sceneforge/remix/segment-clips/segment-clip-preload.ts
src/sceneforge/remix/segment-clip-api.d.ts
src/sceneforge/remix/components/SegmentClipActionsPanel.tsx
electron/sceneforge/remix/remix-ipc.ts
electron.vite.config.ts
```

暴露 IPC：

```text
sceneForgeRemix:exportSourceSegmentClips
sceneForgeRemix:regenerateSourceSegmentClips
sceneForgeRemix:openSourceSegmentClipFolder
```

renderer API：

```ts
window.sceneForgeRemixSegmentClips.exportSourceSegmentClips(...)
window.sceneForgeRemixSegmentClips.regenerateSourceSegmentClips(...)
window.sceneForgeRemixSegmentClips.openSourceSegmentClipFolder(...)
```

导出目录：

```text
sceneforge/remix/source-assets/{sourceAssetId}/exported_clips/
```

重要修复：

```text
regenerateSourceSegmentClips 现在只重建 source_clip.mp4，不再删除整个 source_segments/，避免误删关键帧 PNG。
```

当前临时设计：

```text
preload 和 UI 面板目前通过 electron.vite.config.ts 构建期 transform 注入。
这是维护性问题，建议本地 IDE 中改成源码显式接入。
```

---

### Phase 4：真实关键帧抽取

状态：开发完成，待本地验证。

主要文件：

```text
electron/sceneforge/remix/remix-keyframe-service.ts
```

重点行为：

```text
每个 segment 生成：
  first_frame.png
  middle_frame.png
  last_frame.png

优先从 source_clip.mp4 抽取。
source_clip.mp4 不存在时，回退到 sourceVideoPath 原片绝对时间抽取。
失败时写失败版 keyframe_report.json，再抛错。
```

---

### Phase 5：调试产物、进度事件、runtime 文档

状态：开发完成，待本地验证。

主要文件：

```text
electron/sceneforge/remix/remix-artifact-paths.ts
electron/sceneforge/remix/remix-debug-artifacts.ts
electron/sceneforge/remix/remix-progress-events.ts
electron/sceneforge/remix/remix-segmentation-service.ts
electron/sceneforge/remix/remix-keyframe-service.ts
resources/python-runtime/README.md
```

debug 目录：

```text
sceneforge/remix/source-assets/{sourceAssetId}/debug/
```

debug 产物：

```text
shot_detection_result.json
clip_generation_report.json
keyframe_report.json
runtime_diagnostics.json
progress_events.jsonl
```

重点行为：

```text
writeRemixDebugJson 是 best-effort，失败只 warn，不阻断主流程。
runtime_diagnostics.json 写出前会把 home 目录前缀替换为 ~。
progress_events.jsonl 现在包含 clip/keyframe 的 started/running/succeeded/failed 事件。
```

---

## 3. Review Fix 已修复项

已修：

```text
P0-1：regenerateSourceSegmentClips 不再删除关键帧
P0-2：补全 window.electronAPI 全局类型声明
P1-2：debug 报告写入改成 best-effort
P1-3：clip 生成失败时写失败版 clip_generation_report.json
P1-4：关键帧抽取失败时写失败版 keyframe_report.json
P1-6：TransNetV2 worker 增加 max frame guard
P2-1：TransNetV2 userData fallback 支持环境变量进入真实链路
P2-2：progress_events.jsonl 增强为 clip/keyframe 执行事件
P2-3：writeRemixDebugJson 统一走 appendRemixProgressEvent
P2-4：runtime_diagnostics.json 对 home 路径做 ~ 脱敏
```

关键提交：

```text
ff0c2d8b0f94b2119ff3ebf88f4797b0f848fb67
3e22dbd00a1b604f62a924dff95dd4e7518dd500
a294dd8cac74442230ae138d070120c3ba8107a1
f2b5cf8f373fd46f05cb198a98861765c7ce046c
fe474e5c418039c61790ad0f2549358261bf847d
6d25114fb9acca93bc4acfc7b26542a0b5e3ea4e
b22f7e8b6777e6954629b5e85d4f5625b8abeeea
22f24d823dc273793af90b8b365dbbeea439b67e
27beb6d16a5d3dd14185d2f1be1d4e51e9ef785d
984571020384d12b793e79d55062b2e76e51d32d
64d4321777e01ec8f7ad71ffcd8c1045344f030c
```

---

## 4. 仍需本地处理的问题

### A. 必须在本地 IDE 中处理：构建期字符串注入改为源码显式接入

优先级：P1，建议合并主分支前处理。

当前临时实现：

```text
electron.vite.config.ts
  injectRemixSegmentClipPreloadPlugin()
  injectRemixSegmentClipActionsPanelPlugin()
```

问题：

```text
1. 依赖字符串匹配，页面源码稍有变化可能静默失效。
2. RemixAssetProcessing.tsx 源码看不到 SegmentClipActionsPanel。
3. preload.ts 源码看不到 segment clip bridge。
4. 维护者容易漏掉这个构建期注入。
```

建议本地修复步骤：

```text
1. 修改 electron/preload.ts
   - 直接合入 segment clip bridge：
     exportSourceSegmentClips
     regenerateSourceSegmentClips
     openSourceSegmentClipFolder
   - 推荐并入现有 electronAPI.sceneForgeRemix，或保留 window.sceneForgeRemixSegmentClips 但源码显式暴露。

2. 修改 src/sceneforge/remix/pages/RemixAssetProcessing.tsx
   - 显式 import：
     import { SegmentClipActionsPanel } from '../components/SegmentClipActionsPanel';
   - 在 SegmentTimeline 前显式渲染：
     <SegmentClipActionsPanel
       projectDir={projectDir}
       sourceAssetId={sourceAssetId}
       activeSegmentId={activePreviewSegment?.id ?? null}
       disabled={Boolean(pendingActionId)}
       onRefresh={reloadSnapshot}
     />

3. 修改 electron.vite.config.ts
   - 删除 injectRemixSegmentClipPreloadPlugin
   - 删除 injectRemixSegmentClipActionsPanelPlugin
   - preload.plugins 去掉该注入插件
   - renderer.plugins 去掉该注入插件

4. 跑：
   npx tsc --noEmit
   npx vitest run --reporter=basic
```

保留原因：此前远程工具直接完整替换大文件曾导致 `main.ts` 截断风险；这项更适合本地 IDE 小步编辑。

---

### B. 必须依赖本地模型文件处理：TransNetV2 HF 真实模型适配

优先级：P1，必须在模型文件到位后处理。

当前通用 worker：

```text
resources/shot-detectors/accurate_transnetv2.py
```

当前假设：

```text
模块名候选：
  transnetv2_pytorch
  transnetv2
  model
  models
  net
  nets
  network

类名候选：
  TransNetV2
  TransnetV2
  TransNet

构造：
  model_class()

权重：
  torch.load(...)
  model.load_state_dict(...)

输出：
  tensor / tuple / list / dict 中解析 single_frame/predictions/logits 等
```

本地验证步骤：

```bash
python resources/shot-detectors/validate_transnetv2_assets.py
```

准备 smoke request：

```bash
cat > /tmp/shot-request.json <<'JSON'
{
  "projectDir": "/tmp",
  "sourceAssetId": "smoke-source",
  "videoPath": "/absolute/path/to/test.mp4",
  "mode": "accurate",
  "minShotDurationMs": 1200,
  "durationMs": 10000,
  "fps": 25,
  "width": 1920,
  "height": 1080,
  "modelPath": "/absolute/path/to/transnetv2-pytorch-weights.pth",
  "modelVendorDir": "/absolute/path/to/vendor/transnetv2"
}
JSON

python resources/shot-detectors/detect_shots.py < /tmp/shot-request.json
```

如果失败，本地 agent 需要根据实际错误补专用 adapter。重点检查：

```text
1. vendor 模块名是否在候选列表中。
2. 模型类名是否在候选列表中。
3. model_class() 是否需要参数。
4. .pth 是否是纯 state_dict，还是嵌套 dict。
5. forward 输入 shape 是否接受 batch x frames x 27 x 48 x RGB。
6. 输出是否是 logits/scores，是否需要 sigmoid。
```

---

## 5. 本地编译与单测顺序

必须先跑：

```bash
npx tsc --noEmit
```

重点关注：

```text
1. Window.electronAPI / Window.sceneForgeRemixSegmentClips 全局类型是否冲突。
2. segment-clip-api.d.ts 从 electron/* 引入 type 是否通过。
3. electron.vite.config.ts 中 transform plugin 类型是否通过。
4. remix-debug-artifacts.ts 使用 replaceAll / Object.fromEntries 是否通过当前 target。
5. SegmentClipService 引入 debug/progress writer 是否产生循环依赖或类型问题。
6. remix-keyframe-service.ts 新增 progress writer 后类型是否通过。
```

再跑：

```bash
npx vitest run --reporter=basic
```

重点关注：

```text
1. model-path-resolver 单测是否通过。
2. python-runtime-resolver 单测是否通过。
3. Remix 页面测试是否受构建期注入影响。
4. Remix API mock 是否需要补 window.sceneForgeRemixSegmentClips。
```

建议新增/补充单测：

```text
1. model-path-resolver 支持 LINGJI_TRANSNETV2_USER_DATA_DIR。
2. writeRemixDebugJson 对 runtime_diagnostics.json 做 home 前缀脱敏。
3. regenerateSourceSegmentClips 不删除关键帧 PNG。
4. SegmentClipService 失败时写失败版 clip_generation_report.json。
5. RemixKeyframeService 失败时写失败版 keyframe_report.json。
```

---

## 6. 本地人工视频验证清单

### Phase 1 / fast + clip

```text
1. 配置 Python：
   python3 -m venv .venv-shot
   source .venv-shot/bin/activate
   pip install -r resources/shot-detectors/requirements-fast.txt
   LINGJI_SHOT_PYTHON=$(pwd)/.venv-shot/bin/python npm run dev

2. 导入一个短视频。
3. 运行 fast 切片。
4. 确认 detector=pyscenedetect_adaptive，或失败时 fallbackReason 清楚。
5. 确认每个 segment 生成 source_clip.mp4。
6. 确认 source_clip.mp4 是对应 timeRange 的真实片段，不是整片复制。
7. 验证有音频/无音频视频。
8. 验证 debug/clip_generation_report.json。
9. 验证 progress_events.jsonl 有 clip_generation started/running/succeeded/failed。
```

### Phase 2 / accurate + TransNetV2

```text
1. 放置 .pth 权重与 vendor 代码。
2. 配置：
   LINGJI_TRANSNETV2_MODEL_PATH
   LINGJI_TRANSNETV2_VENDOR_DIR
   或 LINGJI_TRANSNETV2_USER_DATA_DIR
3. 运行 validate_transnetv2_assets.py。
4. 运行 accurate smoke test。
5. UI 中选择 accurate 切片。
6. 成功时 detector=transnetv2。
7. 失败/缺模型时 detector=hybrid_fallback 且 fallbackReason 清楚。
8. 超长视频触发 LINGJI_TRANSNETV2_MAX_FRAMES 保护，不应 OOM。
9. 检查 shot_detection_result.json / runtime_diagnostics.json。
```

### Phase 3 / 导出与重生成

```text
1. 页面是否显示 SegmentClipActionsPanel。
2. 点击“导出全部片段”。
3. 确认 exported_clips/ 和 clips_manifest.json。
4. 点击“重新生成片段”。
5. 确认 source_clip.mp4 被重建。
6. 若已经抽过关键帧，确认 first/middle/last PNG 没被删除。
7. 点击“打开当前片段”，确认 showItemInFolder 指向正确文件。
8. 无片段时导出错误提示清楚。
```

### Phase 4 / 关键帧

```text
1. 运行 runSourceKeyframes。
2. 每个 segment 生成：
   first_frame.png
   middle_frame.png
   last_frame.png
3. PNG 是真实画面，不是 1px 占位。
4. 有 source_clip.mp4 时 inputSource=clip。
5. 删除某个 source_clip.mp4 后回退 inputSource=source。
6. 超短片段不应因为边界 seek 失败。
7. ffmpeg 失败时写 keyframe_report.json，status=failed。
8. progress_events.jsonl 有 keyframes started/running/succeeded/failed。
```

### Phase 5 / debug 与 runtime

```text
1. debug 目录存在：
   sceneforge/remix/source-assets/{sourceAssetId}/debug/

2. 文件存在：
   shot_detection_result.json
   clip_generation_report.json
   keyframe_report.json
   runtime_diagnostics.json
   progress_events.jsonl

3. runtime_diagnostics.json 中 home 路径显示为 ~。
4. 多次重跑 progress_events.jsonl 是 append，不是覆盖。
5. debug 写入失败不应阻断主流程。
```

---

## 7. 当前建议执行顺序

给本地 agent 的建议顺序：

```text
1. 跑 npx tsc --noEmit。
2. 修复所有 TypeScript 编译错误。
3. 跑 npx vitest run --reporter=basic。
4. 若测试失败，先修测试/类型问题。
5. 本地 IDE 处理 P1-1：去掉构建期注入，改为源码显式接入。
6. 用本地 TransNetV2 模型处理 P1-5：accurate worker 真实适配。
7. 执行 fast 视频 smoke test。
8. 执行 accurate 视频 smoke test。
9. 执行关键帧 smoke test。
10. 执行导出/重生成 smoke test。
11. 根据问题继续生成新的 handoff。
```

---

## 8. 不建议继续新功能

当前不建议继续新 Phase。

下一步应是：

```text
Local Compile/Test Fix
Local IDE Explicit Integration Fix
TransNetV2 Real Model Adapter Fix
Manual Smoke Test Fix
```

完成后再决定是否进入新的功能 Phase。
