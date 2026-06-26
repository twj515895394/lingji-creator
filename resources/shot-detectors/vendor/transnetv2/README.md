# TransNetV2 PyTorch 模型结构代码目录

本目录用于放置与 TransNetV2 `.pth` 权重匹配的 PyTorch 模型结构代码。

推荐来源：

```text
https://huggingface.co/magnusdtd/TransNetV2/tree/main
```

请从来源仓库中复制必要的推理代码/模型结构代码到本目录，例如：

```text
transnetv2_pytorch.py
model.py
nets.py
```

实际文件名以来源仓库为准。后续 `accurate_transnetv2.py` 会通过 vendor resolver 将本目录加入 Python `sys.path`，再加载 `TransNetV2` 模型结构。

注意：

1. `.pth` 权重文件不要放在本目录，应放在 `resources/models/transnetv2/` 或通过 `LINGJI_TRANSNETV2_MODEL_PATH` 指定。
2. 如果来源仓库提供 LICENSE，请一并保留到本目录。
3. 只有 `.gitkeep` 或 README 不代表高精模式可用；resolver 会检查是否存在实际 `.py` 模型代码。
