# Storyboard Methodology Index

asset_type: executable_reference
runtime_readable: true
version: v8

本目录用于 SceneForge v8 的故事板方法论执行期资产库。

使用原则：

1. 这些文件是运行期可读参考，不是 `docs/` 设计文档。
2. 所有模板和枚举都是开放参考，不是封闭集合。
3. 运行时只允许按需读取，不得整目录默认深读。
4. 方法论资产不写入黑板顶层，只通过 `runtime_policy.context_policy.allowed_runtime_asset_paths` 与 `stage_index.storyboard.files.*` 暴露。

目录：

- `video-generation-unit-library.md`
- `beat-structure-library.md`
- `shot-type-library.md`
- `rhythm-type-shot-combo-library.md`
- `shot-density-reference.md`
- `continuity-control-library.md`
- `storyboard-dual-version-prompt-library.md`
- `video-prompt-translation-library.md`
- `storyboard-quality-checklist.md`
- `model-adaptation-library.md`
