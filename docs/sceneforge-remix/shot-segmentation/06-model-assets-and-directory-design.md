# TransNetV2 模型文件与目录存放设计

> 本文定义高精模式 TransNetV2 需要准备哪些模型/代码文件，以及在 `lingji-creator` 项目中的推荐存放目录、环境变量、打包策略和验收检查。

---

## 1. 结论

如果采用 PyTorch 版 TransNetV2，高精模式至少需要三类东西：

```text
1. 权重文件：*.pth，例如 transnetv2-pytorch-weights.pth
2. 模型结构代码：例如 transnetv2_pytorch.py / model.py / nets.py，具体以来源仓库为准
3. Python 依赖：torch、numpy，以及 ffmpeg/opencv 相关依赖
```

也就是说，`transnetv2-pytorch-weights.pth` 是最核心的模型权重文件，但它不能单独运行；还必须有与该权重匹配的 PyTorch 模型结构代码。

推荐第一阶段使用 Hugging Face 上的 PyTorch 版本作为模型资产来源：

```text
https://huggingface.co/magnusdtd/TransNetV2/tree/main
```

该来源如果已经提供现成代码和 `.pth` 权重，就不需要再从官方 TensorFlow 权重手动转换 PyTorch 权重。实际接入时不要强依赖文件名必须叫 `transnetv2-pytorch-weights.pth`，而应通过 `LINGJI_TRANSNETV2_MODEL_PATH` 或模型 resolver 指向实际 `.pth` 文件。

---

## 2. 推荐项目目录

建议把“模型权重”和“推理代码”分开放：

```text
resources/
  models/
    transnetv2/
      transnetv2-pytorch-weights.pth        # 或 HF 仓库实际提供的 .pth 文件
      model-config.json                     # 可选，记录权重来源、版本、sha256
      README.md                             # 说明下载方式、授权、校验方式

  shot-detectors/
    detect_shots.py
    accurate_transnetv2.py
    fast_pyscenedetect.py
    common.py
    requirements-fast.txt
    requirements-accurate.txt
    vendor/
      transnetv2/
        transnetv2_pytorch.py               # 或 HF 仓库实际模型结构文件
        __init__.py
        LICENSE                             # 如果来源仓库提供，应保留
        README.md                           # 可选，保留来源说明
```

### 为什么这样分

```text
resources/models/transnetv2/
  存权重、模型配置、大文件、校验信息

resources/shot-detectors/vendor/transnetv2/
  存 Python 推理代码/模型结构代码
```

这样做的好处：

1. 权重路径可以被环境变量覆盖。
2. 模型代码可以随 Worker 打包。
3. 未来替换其他模型时，只需要新增一个 vendor 子目录和 model resolver。
4. 避免把 Hugging Face 仓库整包塞进 `models` 目录造成职责混乱。

---

## 3. 需要准备的文件清单

### 3.1 必需文件

```text
resources/models/transnetv2/<实际权重文件>.pth
resources/shot-detectors/vendor/transnetv2/<模型结构代码>.py
resources/shot-detectors/accurate_transnetv2.py
resources/shot-detectors/detect_shots.py
resources/shot-detectors/requirements-accurate.txt
```

其中 `<实际权重文件>.pth` 可以是：

```text
transnetv2-pytorch-weights.pth
```

也可以是 Hugging Face 仓库实际提供的其他 `.pth` 文件名。代码中不要写死文件名，默认找常见文件名，找不到则要求用户配置环境变量。

### 3.2 建议保留的元信息文件

```text
resources/models/transnetv2/model-config.json
resources/models/transnetv2/README.md
resources/shot-detectors/vendor/transnetv2/LICENSE
resources/shot-detectors/vendor/transnetv2/README.md
```

`model-config.json` 示例：

```json
{
  "name": "TransNetV2",
  "implementation": "pytorch",
  "source": "https://huggingface.co/magnusdtd/TransNetV2/tree/main",
  "weightsFile": "transnetv2-pytorch-weights.pth",
  "inputShape": [27, 48, 3],
  "inputDtype": "uint8",
  "framework": "torch",
  "license": "MIT or source-repo-license-to-confirm",
  "sha256": "fill-after-download"
}
```

注意：`license` 字段应以实际下载来源为准。Hugging Face 页面显示的 license、仓库内 LICENSE、模型卡说明三者要尽量一致；如果不一致，以更保守的方式处理。

---

## 4. 下载与放置建议

### 4.1 开发期下载

建议先在本地单独下载 Hugging Face 仓库：

```bash
git lfs install
git clone https://huggingface.co/magnusdtd/TransNetV2 /tmp/TransNetV2
```

然后检查：

```bash
find /tmp/TransNetV2 -maxdepth 2 -type f
```

重点确认：

```text
*.pth
requirements.txt
main.py
模型结构代码文件，例如 transnetv2_pytorch.py / model.py / nets.py
LICENSE 或 README/model card
```

再复制到本项目推荐目录。

### 4.2 不建议直接提交大权重

`*.pth` 通常较大，不建议直接进普通 Git 历史。建议三选一：

```text
方案 A：开发期只用本地路径 + 环境变量
方案 B：使用 Git LFS 管理权重
方案 C：发布包/首次运行下载模型
```

内测阶段推荐方案 A：

```bash
LINGJI_TRANSNETV2_MODEL_PATH=/absolute/path/to/transnetv2-pytorch-weights.pth
```

正式发布再考虑方案 B 或 C。

---

## 5. 环境变量设计

建议支持：

```text
LINGJI_SHOT_PYTHON=/absolute/path/to/python
LINGJI_TRANSNETV2_MODEL_PATH=/absolute/path/to/model.pth
LINGJI_TRANSNETV2_VENDOR_DIR=/absolute/path/to/vendor/transnetv2
LINGJI_FFMPEG_PATH=/absolute/path/to/ffmpeg
LINGJI_FFPROBE_PATH=/absolute/path/to/ffprobe
```

### 5.1 权重路径解析顺序

```text
1. LINGJI_TRANSNETV2_MODEL_PATH
2. resources/models/transnetv2/transnetv2-pytorch-weights.pth
3. resources/models/transnetv2/*.pth 中唯一文件
4. 用户数据目录 models/transnetv2/*.pth
5. 找不到则 accurate fallback 到 fast，并在 diagnostics 说明缺少权重
```

### 5.2 vendor 代码解析顺序

```text
1. LINGJI_TRANSNETV2_VENDOR_DIR
2. resources/shot-detectors/vendor/transnetv2
3. Python package site-packages 中已安装的 transnetv2 模块
4. 找不到则 accurate fallback 到 fast
```

---

## 6. Worker 适配要求

`accurate_transnetv2.py` 不应假设唯一固定实现，而应尽量适配来源仓库的结构。

推荐封装：

```python
def load_transnetv2_model(model_path: str, vendor_dir: str | None, device):
    # 1. 将 vendor_dir 加入 sys.path
    # 2. import TransNetV2
    # 3. torch.load(model_path, map_location=device)
    # 4. model.load_state_dict(state_dict)
    # 5. model.eval().to(device)
    return model
```

如果 Hugging Face 仓库已经提供 `main.py` 风格 CLI，也不要直接从 TS 调它的 CLI；仍应在本项目 Worker 内调用模型代码，输出统一 `ShotDetectionResult JSON`。

---

## 7. requirements 设计

`requirements-accurate.txt` 建议：

```text
-r requirements-fast.txt
numpy>=1.23
torch>=2.1
```

如果 Hugging Face 仓库 `requirements.txt` 里还有其他必要依赖，需要逐项评估后合并。不要无脑复制 GUI、Web API、训练相关依赖。

---

## 8. 验收检查

### 8.1 文件检查

```text
存在 .pth 权重文件
存在模型结构代码
存在 requirements-accurate.txt
model-config.json 记录来源和 sha256
```

### 8.2 Python smoke test

新增脚本或测试命令：

```bash
python resources/shot-detectors/detect_shots.py < request.json
```

最小 request：

```json
{
  "videoPath": "/path/to/test.mp4",
  "mode": "accurate",
  "minShotDurationMs": 1200,
  "durationMs": 10000,
  "fps": 25,
  "width": 1920,
  "height": 1080,
  "modelPath": "/path/to/transnetv2-pytorch-weights.pth"
}
```

输出必须是：

```json
{
  "ok": true,
  "detector": "transnetv2",
  "scenes": [],
  "boundaries": []
}
```

实际 scenes/boundaries 不能为空与否取决于测试视频内容，但 JSON schema 必须稳定。

### 8.3 fallback 检查

移走模型文件后运行 accurate，应得到：

```text
usedFallback = true
detector = hybrid_fallback
fallbackReason 包含 model not found / missing weights
```

---

## 9. 与打包的关系

开发期可以只保留目录结构和 README，不提交权重：

```text
resources/models/transnetv2/README.md
resources/models/transnetv2/.gitkeep
```

正式打包时需要确保以下目录不被 asar 压缩到无法直接访问：

```text
resources/shot-detectors
resources/models
resources/python-runtime
```

如果权重随包分发，则需要确认：

1. license 允许再分发。
2. 文件在 macOS/Windows 打包后可被 Python 直接读取。
3. 签名/公证流程不会破坏大文件路径。

---

## 10. 最终建议

当前最稳妥策略：

```text
开发期：使用 Hugging Face 仓库现成 PyTorch 代码和 .pth 权重，本地路径配置。
内测期：提供 README 和环境变量，让测试者自己放权重。
正式期：评估 license 后，把权重纳入 Git LFS 或安装包资源。
```

实现上不要强依赖 `transnetv2-pytorch-weights.pth` 这个固定文件名，而是支持：

```text
1. 环境变量精确指定
2. 默认目录自动扫描唯一 .pth
3. 找不到时 fallback fast
```
