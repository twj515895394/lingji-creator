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

未来正式打包时，建议按平台和架构放置：

```text
resources/python-runtime/darwin-arm64/bin/python
resources/python-runtime/darwin-x64/bin/python
resources/python-runtime/win32-x64/python.exe
resources/python-runtime/linux-x64/bin/python
```

该目录需要 asar-unpack，因为 Python 可执行文件和 site-packages 必须通过真实文件系统路径访问。
