# Handoff Review Fix Round 2 - 2026-06-26 18:55:00

承接：

```text
.handoff/handoff-20260626-183500-review-fix.md
```

当前任务：继续按 review handoff 修复 Phase 0-5 的遗留问题。

本轮没有运行本地命令：

```bash
npx tsc --noEmit
npx vitest run --reporter=basic
```

---

## 一、本轮新增修复

### P2-1：TransNetV2 userData fallback 进入真实运行链路

修复文件：

```text
electron/sceneforge/remix/shot-detection/model-path-resolver.ts
```

提交：

```text
b22f7e8b6777e6954629b5e85d4f5625b8abeeea
```

修复前：

```text
resolver 支持 options.userDataDir/models/transnetv2/*.pth
但真实运行中的 buildRuntimeResolutionOptions() 没传 userDataDir。
因此 userData fallback 主要只存在于单测中。
```

修复后：

```text
resolveTransNetV2ModelPath() 新增环境变量入口：
  LINGJI_TRANSNETV2_USER_DATA_DIR
  LINGJI_USER_DATA_DIR

若设置：
  $LINGJI_TRANSNETV2_USER_DATA_DIR/models/transnetv2/transnetv2-pytorch-weights.pth
或唯一 .pth 文件
会被识别为 user_data_default / user_data_scan。
```

说明：

```text
这不是 Electron app.getPath('userData') 的最终接入，但已经让 userData fallback 可通过环境变量进入真实运行链路。
正式发布版后续仍可接 app.getPath('userData')。
```

待验证：

```bash
export LINGJI_TRANSNETV2_USER_DATA_DIR=/absolute/path/to/user-data
```

并放置：

```text
/absolute/path/to/user-data/models/transnetv2/transnetv2-pytorch-weights.pth
```

运行 accurate，检查 runtime_diagnostics.json 中 modelSource 是否为 `user_data_default` 或 `user_data_scan`。

---

### P2-3：`remix-progress-events.ts` 不再是孤立预留模块

修复文件：

```text
electron/sceneforge/remix/remix-debug-artifacts.ts
```

提交：

```text
22f24d823dc273793af90b8b365dbbeea439b67e
```

修复前：

```text
remix-progress-events.ts 提供 appendRemixProgressEvent()
但实际 progress_events.jsonl 追加逻辑写在 remix-debug-artifacts.ts 内部。
```

风险：

```text
存在一个看似正式但未接入的工具模块，容易误导维护者。
```

修复后：

```text
writeRemixDebugJson()
  → 写 debug JSON
  → 根据 relativePath 解析 sourceAssetId
  → 根据报告文件名映射 stage
  → 调用 appendRemixProgressEvent()
```

当前 stage 映射：

```text
shot_detection_result.json    → segmentation
clip_generation_report.json   → clip_generation
keyframe_report.json          → keyframes
runtime_diagnostics.json      → runtime
```

说明：

```text
progress_events.jsonl 仍是“调试报告写入事件”，不是实时百分比进度流。
但现在事件写入已经统一走 remix-progress-events.ts。
```

---

### P2-4：runtime_diagnostics.json 本地路径脱敏

修复文件：

```text
electron/sceneforge/remix/remix-debug-artifacts.ts
resources/python-runtime/README.md
```

提交：

```text
27beb6d16a5d3dd14185d2f1be1d4e51e9ef785d
4c14aa7c8661ef612cc1717c7c85ccff21c06e63
```

修复前：

```text
runtime_diagnostics.json 可能包含用户 home 目录下的绝对路径：
  modelPath
  vendorDir
  cwd
  resourcesPath
```

修复后：

```text
writeRemixDebugJson() 在写 runtime_diagnostics.json 前会递归处理 payload：
  如果字符串以 os.homedir() 开头，则替换为 ~
```

示例：

```text
/Users/alice/project/models/transnetv2/model.pth
→ ~/project/models/transnetv2/model.pth
```

说明：

```text
当前只做 home 前缀脱敏，不做所有绝对路径隐藏。
这样仍能保留足够排查价值，同时降低暴露本地用户名/目录结构的风险。
```

---

## 二、之前 Review Fix Round 1 已修复项回顾

```text
P0-1：regenerateSourceSegmentClips 不再删除关键帧
P0-2：补全 window.electronAPI 全局类型声明
P1-2：debug 报告写入改成 best-effort
P1-3：clip 生成失败时写失败版 clip_generation_report.json
P1-4：关键帧抽取失败时写失败版 keyframe_report.json
P1-6：TransNetV2 worker 增加 max frame guard
```

对应提交：

```text
ff0c2d8b0f94b2119ff3ebf88f4797b0f848fb67
3e22dbd00a1b604f62a924dff95dd4e7518dd500
a294dd8cac74442230ae138d070120c3ba8107a1
f2b5cf8f373fd46f05cb198a98861765c7ce046c
fe474e5c418039c61790ad0f2549358261bf847d
6d25114fb9acca93bc4acfc7b26542a0b5e3ea4e
```

---

## 三、仍未修复 / 需后续处理

### P1-1：构建期字符串注入仍是临时方案

涉及：

```text
electron.vite.config.ts
electron/preload.ts
src/sceneforge/remix/pages/RemixAssetProcessing.tsx
```

状态：未修复。

当前原因：

```text
preload.ts 和 RemixAssetProcessing.tsx 都是较大文件。
此前直接替换 main.ts 曾出现截断风险。
为避免再次破坏仓库，本轮继续保留构建期注入方案。
```

建议后续修复方式：

```text
在本地 IDE 中显式小步编辑：
  1. preload.ts 直接合入 segment clip preload API，删除构建期 preload 注入。
  2. RemixAssetProcessing.tsx 直接 import SegmentClipActionsPanel 并在 SegmentTimeline 前渲染。
  3. 删除 electron.vite.config.ts 中两个 injectRemixSegmentClip*Plugin。
```

该项属于维护性问题，不是当前功能性阻塞，但建议在合并主分支前处理。

---

### P1-5：TransNetV2 HF 真实模型适配仍需模型文件到位后修

涉及：

```text
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/vendor/transnetv2/
resources/models/transnetv2/
```

状态：未完全修复。

当前已缓解：

```text
增加了 max frame guard，避免长视频 OOM。
```

仍需要：

```text
1. 放入 Hugging Face vendor 代码和 .pth 权重。
2. 运行 validate_transnetv2_assets.py。
3. 运行 detect_shots.py accurate smoke test。
4. 若模块名/类名/构造函数/forward 输出不匹配，补专用 adapter。
```

---

### P2-2：progress_events.jsonl 仍不是实时百分比进度流

状态：部分修复。

当前：

```text
progress_events.jsonl 已统一通过 appendRemixProgressEvent() 写入。
但内容仍是报告写入事件，不是 worker/ffmpeg 的实时 running/progress/failure 事件。
```

后续如要真实进度流，需要：

```text
1. Python worker stderr JSONL progress。
2. SegmentClipService 每个 segment 前后 append running/succeeded/failed。
3. RemixKeyframeService 每个 keyframe 前后 append running/succeeded/failed。
4. 前端订阅或刷新 progress_events.jsonl。
```

---

## 四、当前建议验证顺序

先运行：

```bash
npx tsc --noEmit
```

重点关注：

```text
1. Window.electronAPI 全局类型是否还有冲突。
2. remix-debug-artifacts.ts 中 replaceAll / Object.fromEntries 在当前 tsconfig target 下是否通过。
3. model-path-resolver.ts 新增 env user data fallback 是否影响已有 resolver 单测。
4. SegmentClipService 引入 debug writer 是否存在循环或类型问题。
```

再运行：

```bash
npx vitest run --reporter=basic
```

建议新增或补充单测：

```text
1. model-path-resolver 支持 LINGJI_TRANSNETV2_USER_DATA_DIR。
2. writeRemixDebugJson 对 runtime_diagnostics.json 做 home 前缀脱敏。
3. regenerateSourceSegmentClips 不删除 keyframes。
```

---

## 五、当前结论

本轮已继续修复 P2 可安全处理的问题。

现在剩余主要问题为：

```text
P1-1：构建期注入改显式源码接入
P1-5：真实 HF 模型适配
P2-2：实时进度流增强
```

建议下一步先跑 tsc/vitest。如果编译通过，再决定是否继续处理 P1-1 的显式源码迁移。
