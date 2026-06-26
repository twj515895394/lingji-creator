# SceneForge Remix Shot Detectors

本目录用于放置 SceneForge 2.0 Remix 分镜切片 Python Worker。

当前已有：

```text
detect_shots.py
fast_pyscenedetect.py
accurate_transnetv2.py
common.py
```

---

## 开发环境

建议单独创建 Python venv：

```bash
python3 -m venv .venv-shot
source .venv-shot/bin/activate
pip install -r resources/shot-detectors/requirements-fast.txt
pip install -r resources/shot-detectors/requirements-accurate.txt
```

开发时通过环境变量指定 Python：

```bash
LINGJI_SHOT_PYTHON=$(pwd)/.venv-shot/bin/python npm run dev
```

---

## fast 模式

fast 模式使用：

```text
PySceneDetect AdaptiveDetector
```

入口：

```text
resources/shot-detectors/detect_shots.py
  → fast_pyscenedetect.py
```

---

## accurate 模式

accurate 模式使用：

```text
TransNetV2 PyTorch worker
```

入口：

```text
resources/shot-detectors/detect_shots.py
  → accurate_transnetv2.py
```

当前 `accurate_transnetv2.py` 是通用适配层，不强依赖某一个固定文件名。它会尝试从 vendor 目录导入以下常见模块名：

```text
transnetv2_pytorch
transnetv2
model
models
net
nets
network
```

并查找以下模型类名：

```text
TransNetV2
TransnetV2
TransNet
```

如果 Hugging Face 仓库里的实际文件名或类名不在上述范围内，需要在 `accurate_transnetv2.py` 里补充适配。

---

## TransNetV2 高精模式资产

高精模式至少需要：

```text
1. .pth 权重文件
2. 与该权重匹配的 PyTorch 模型结构代码
```

推荐来源：

```text
https://huggingface.co/magnusdtd/TransNetV2/tree/main
```

推荐目录：

```text
resources/models/transnetv2/*.pth
resources/shot-detectors/vendor/transnetv2/*.py
```

开发期也可以使用环境变量：

```bash
export LINGJI_TRANSNETV2_MODEL_PATH=/absolute/path/to/model.pth
export LINGJI_TRANSNETV2_VENDOR_DIR=/absolute/path/to/vendor/transnetv2
```

如果 assets 缺失，Electron 主进程会把 accurate 模式 fallback 到规则候选边界，并在 diagnostics 中记录：

```text
fallbackReason = TransNetV2 assets missing: weights/vendor
```

---

## 本地校验

放好权重和 vendor 代码后运行：

```bash
python resources/shot-detectors/validate_transnetv2_assets.py
```

该脚本只检查文件是否存在，不加载 torch，也不执行模型推理。

---

## accurate 手工 smoke test

准备好权重、vendor 代码和测试视频后，可手工向 Worker 输入 JSON：

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
  "modelPath": "/absolute/path/to/model.pth",
  "modelVendorDir": "/absolute/path/to/vendor/transnetv2"
}
JSON

python resources/shot-detectors/detect_shots.py < /tmp/shot-request.json
```

期望输出：

```text
ok = true
detector = transnetv2
boundaries/scenes 为稳定 JSON 结构
```

如果输出 `ok = false`，优先检查：

```text
1. torch 是否安装
2. modelPath 是否存在
3. modelVendorDir 是否包含真实 .py 模型结构代码
4. .pth 权重是否与模型结构代码匹配
5. 模型类名是否能被 accurate_transnetv2.py 找到
```
