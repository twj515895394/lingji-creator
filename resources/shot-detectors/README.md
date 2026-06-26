# SceneForge Remix Shot Detectors

本目录用于放置 SceneForge 2.0 Remix 分镜切片 Python Worker。

当前阶段先落地运行时目录、依赖说明和模型资产校验工具。后续会新增：

```text
detect_shots.py
fast_pyscenedetect.py
accurate_transnetv2.py
common.py
```

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

## 本地校验

放好权重和 vendor 代码后运行：

```bash
python resources/shot-detectors/validate_transnetv2_assets.py
```

该脚本只检查文件是否存在，不加载 torch，也不执行模型推理。
