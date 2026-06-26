# Python Runtime 目录

本目录预留给未来正式发布包内置 Python runtime。

当前阶段不提交实际 Python runtime。开发期请使用本地 venv：

```bash
python3 -m venv .venv-shot
source .venv-shot/bin/activate
pip install -r resources/shot-detectors/requirements-fast.txt
pip install -r resources/shot-detectors/requirements-accurate.txt
```

启动开发环境时指定：

```bash
LINGJI_SHOT_PYTHON=$(pwd)/.venv-shot/bin/python npm run dev
```

TransNetV2 权重可以放在项目 resources 目录，也可以放在用户数据目录。开发期可用：

```bash
export LINGJI_TRANSNETV2_USER_DATA_DIR=/absolute/path/to/user-data
```

对应目录约定：

```text
$LINGJI_TRANSNETV2_USER_DATA_DIR/models/transnetv2/transnetv2-pytorch-weights.pth
```

也兼容通用变量：

```bash
export LINGJI_USER_DATA_DIR=/absolute/path/to/user-data
```

未来正式打包时，建议按平台和架构放置：

```text
resources/python-runtime/darwin-arm64/bin/python
resources/python-runtime/darwin-x64/bin/python
resources/python-runtime/win32-x64/python.exe
resources/python-runtime/linux-x64/bin/python
```

该目录需要 asar-unpack，因为 Python 可执行文件和 site-packages 必须通过真实文件系统路径访问。

---

## Remix 运行时诊断产物

运行 Remix 切片/关键帧流程后，会在项目目录中写入调试产物：

```text
sceneforge/remix/source-assets/{sourceAssetId}/debug/
  shot_detection_result.json
  clip_generation_report.json
  keyframe_report.json
  runtime_diagnostics.json
  progress_events.jsonl
```

用途：

```text
shot_detection_result.json
  记录 fast/accurate 检测结果、fallback 原因、低置信度片段等。

clip_generation_report.json
  记录 source_clip.mp4 生成结果、耗时、失败项。

keyframe_report.json
  记录 first/middle/last 关键帧抽取输入源、seek 时间和输出路径。

runtime_diagnostics.json
  记录 Python/TransNetV2 环境变量是否存在、模型资产解析结果。

progress_events.jsonl
  记录阶段报告写入事件，便于人工排查当前流程执行到哪一步。
```

注意：

```text
runtime_diagnostics.json 不直接保存敏感环境变量值，只记录关键配置是否存在，以及模型资产 resolver 的解析结果。
写出 runtime_diagnostics.json 前会把用户 home 目录前缀替换为 ~，降低调试包分享时泄露本地用户名/目录结构的风险。
```
