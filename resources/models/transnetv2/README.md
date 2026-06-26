# TransNetV2 模型权重目录

本目录用于放置 SceneForge 2.0 Remix 高精分镜切片模式所需的 TransNetV2 PyTorch 权重文件。

## 推荐来源

优先使用现成 PyTorch 版本：

```text
https://huggingface.co/magnusdtd/TransNetV2/tree/main
```

下载后请确认来源仓库中同时包含：

```text
1. PyTorch 权重文件：*.pth
2. 匹配的 PyTorch 模型结构代码
3. requirements / README / LICENSE 或模型卡说明
```

`.pth` 只是权重文件，不能单独运行；还需要把匹配的模型结构代码放入：

```text
resources/shot-detectors/vendor/transnetv2/
```

## 推荐文件

开发期可以使用环境变量指向任意本地权重：

```bash
LINGJI_TRANSNETV2_MODEL_PATH=/absolute/path/to/transnetv2-pytorch-weights.pth
```

也可以把权重放在本目录下：

```text
resources/models/transnetv2/transnetv2-pytorch-weights.pth
```

如果文件名不同，也可以放在本目录中。resolver 会在没有默认文件时尝试扫描本目录下唯一的 `.pth` 文件。

## 不要直接提交大权重

`*.pth` 权重文件通常较大，不建议直接提交到普通 Git 历史。建议使用以下任一方式：

```text
1. 开发期：使用 LINGJI_TRANSNETV2_MODEL_PATH 指向本地文件
2. 内测期：让测试者按本文说明自行下载权重
3. 正式发布：使用 Git LFS、安装包内置或首次运行下载
```

## 配置文件

可复制 `model-config.example.json` 为 `model-config.json`，记录权重来源、license、sha256 等信息。
