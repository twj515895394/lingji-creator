# SceneForge Style Selector — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-style-selector/PRD.md`  
> 前置：Scene Asset Library、Stage Context、Flow Hardening

## 1. 目标

把已经可由 policy 注入的 style / asset 选择能力，从“内部支持”补齐为“Studio 可见、可选、可回显、可被 Stage Context 消费”的产品路径。

## 2. 范围

- 项目级 style profile 与 selected asset ids 状态模型
- Studio 选择器与回显
- IPC / service / context builder 的透传
- 真机验收规则

不扩展 style library 本体，不引入 source materials。

## 3. 核心行为

- 维护者可以在 Studio 查看可用 style profile 与 scene assets。
- 维护者可以为项目选择一个 style profile，并可追加 selected asset ids。
- 选择结果写入项目主状态后，后续阶段获取 Stage Context 时自动注入。
- 若项目未选择 style，不强制阻塞所有阶段，但设计相关阶段应给出缺省提示。

## 4. 设计约束

- asset registry 继续作为唯一数据源，不扫描任意目录。
- 选择器只暴露可安全注入上下文的 asset / style 条目。
- `source-materials` 永不出现在 UI 选择器中。
- 选择结果是项目状态，不是某次运行的临时参数。

## 5. 验收门

- 能显示可选 style 与 asset 列表
- 能保存并回显当前选择
- `getStageContext` 能看到选择结果
- 设计 / 分镜 / 视频提示词阶段能消费这些选择

## 6. 风险

- 如果把 style 选择和某次运行绑定，后续复现会不稳定，因此必须持久化到项目级状态。
- 若把所有 asset 都默认注入，会放大 prompt 噪音，因此保持显式选择。
