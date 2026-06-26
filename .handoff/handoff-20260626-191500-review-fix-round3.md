# Handoff Review Fix Round 3 - 2026-06-26 19:15:00

承接：

```text
.handoff/handoff-20260626-185500-review-fix-round2.md
```

用户要求：

```text
需要本地 IDE 中处理的先留着。
需要模型文件的也先留着。
其他能修的先修掉。
```

本轮没有运行本地命令：

```bash
npx tsc --noEmit
npx vitest run --reporter=basic
```

---

## 一、本轮新增修复

### P2-2：progress_events.jsonl 增强为阶段执行事件

之前状态：

```text
progress_events.jsonl 主要记录“调试报告写入事件”，不是实际运行进度事件。
```

本轮修复为：

```text
SegmentClipService 生成 clips 时逐段写入：
  started
  running
  succeeded
  failed

RemixKeyframeService 抽关键帧时逐帧写入：
  started
  running
  succeeded
  failed
```

#### 1. clip_generation 进度事件

修复文件：

```text
electron/sceneforge/remix/segment-clips/segment-clip-service.ts
```

提交：

```text
984571020384d12b793e79d55062b2e76e51d32d
```

新增行为：

```text
开始生成 clips：
  stage=clip_generation
  status=started
  progress=0

每个 segment 开始：
  stage=clip_generation
  status=running
  progress=index/total
  details.segmentId

每个 segment 成功/失败：
  stage=clip_generation
  status=succeeded | failed
  progress=(index+1)/total
  details.clipPath / error

全部成功：
  stage=clip_generation
  status=succeeded
  progress=1
```

#### 2. keyframes 进度事件

修复文件：

```text
electron/sceneforge/remix/remix-keyframe-service.ts
```

提交：

```text
64d4321777e01ec8f7ad71ffcd8c1045344f030c
```

新增行为：

```text
开始抽取关键帧：
  stage=keyframes
  status=started
  progress=0

每张关键帧开始：
  stage=keyframes
  status=running
  progress=processed/total
  details.segmentId
  details.frameRole
  details.inputSource

每张关键帧成功/失败：
  stage=keyframes
  status=succeeded | failed
  progress=processed/total
  details.outputPath / error

全部成功：
  stage=keyframes
  status=succeeded
  progress=1
```

说明：

```text
当前还没有前端实时订阅 progress_events.jsonl。
但文件层面已经不再只是“报告写入事件”，可以用于人工调试阶段进度。
```

---

## 二、前两轮 Review Fix 已完成项汇总

### Round 1

```text
P0-1：regenerateSourceSegmentClips 不再删除关键帧
P0-2：补全 window.electronAPI 全局类型声明
P1-2：debug 报告写入改成 best-effort
P1-3：clip 生成失败时写失败版 clip_generation_report.json
P1-4：关键帧抽取失败时写失败版 keyframe_report.json
P1-6：TransNetV2 worker 增加 max frame guard
```

提交：

```text
ff0c2d8b0f94b2119ff3ebf88f4797b0f848fb67
3e22dbd00a1b604f62a924dff95dd4e7518dd500
a294dd8cac74442230ae138d070120c3ba8107a1
f2b5cf8f373fd46f05cb198a98861765c7ce046c
fe474e5c418039c61790ad0f2549358261bf847d
6d25114fb9acca93bc4acfc7b26542a0b5e3ea4e
```

### Round 2

```text
P2-1：TransNetV2 userData fallback 可通过环境变量进入真实运行链路
P2-3：writeRemixDebugJson 统一走 appendRemixProgressEvent
P2-4：runtime_diagnostics.json 对 home 路径做 ~ 脱敏
```

提交：

```text
b22f7e8b6777e6954629b5e85d4f5625b8abeeea
22f24d823dc273793af90b8b365dbbeea439b67e
27beb6d16a5d3dd14185d2f1be1d4e51e9ef785d
4c14aa7c8661ef612cc1717c7c85ccff21c06e63
```

---

## 三、按用户要求先保留的问题

### P1-1：构建期字符串注入改为源码显式接入

状态：先留着。

原因：

```text
该问题需要改两个大文件：
  electron/preload.ts
  src/sceneforge/remix/pages/RemixAssetProcessing.tsx

此前直接替换 main.ts 曾出现截断风险。
更适合在本地 IDE 中小步处理：
  1. 直接在 preload.ts 合入 segment clip bridge
  2. 直接在 RemixAssetProcessing.tsx import 并渲染 SegmentClipActionsPanel
  3. 删除 electron.vite.config.ts 中注入插件
```

当前影响：

```text
功能理论可运行，但维护性较差，依赖构建期 transform 字符串匹配。
```

建议：合并主分支前处理。

---

### P1-5：TransNetV2 HF 真实模型适配

状态：先留着，等待本地模型验证。

原因：

```text
用户本地已下载模型。
需要在本地确认：
  vendor 文件名
  模型类名
  构造函数签名
  .pth 格式
  forward 输入输出
```

建议本地验证顺序：

```bash
python resources/shot-detectors/validate_transnetv2_assets.py
```

然后按 README 中的 accurate smoke test 输入 JSON：

```bash
python resources/shot-detectors/detect_shots.py < /tmp/shot-request.json
```

如果失败，再补专用 adapter。

---

## 四、当前剩余状态

```text
已修：P0-1 / P0-2 / P1-2 / P1-3 / P1-4 / P1-6 / P2-1 / P2-2 / P2-3 / P2-4
先留：P1-1 / P1-5
```

下一步建议：

```bash
npx tsc --noEmit
npx vitest run --reporter=basic
```

再根据编译和本地模型 smoke test 结果做下一轮修复。
