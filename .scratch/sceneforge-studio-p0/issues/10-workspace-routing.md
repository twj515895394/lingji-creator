Status: completed

## 父问题

`.scratch/sceneforge-studio-p0/PRD.md`

## 要构建什么

`SupportPlaceholderWorkspace`：非 core/intake/gate 阶段显示阶段说明、就绪标签、推荐 MCP 工具名、依赖阻塞；`CoreArtifactWorkspace` 包装现有 StageRunPanel 逻辑；export 使用 `SystemExportWorkspace` 挂接现有 export。

## 验收标准

- [ ] 选中 script/reference 等显示占位而非错误空白
- [ ] core 三阶段行为与 Phase 2 回归一致
- [ ] export 阶段可触发导出或明确说明

## 被阻塞于

- 08
- 09