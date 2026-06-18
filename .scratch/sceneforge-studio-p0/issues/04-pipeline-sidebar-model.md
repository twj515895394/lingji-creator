Status: completed

## 父问题

`.scratch/sceneforge-studio-p0/PRD.md`

## 要构建什么

新增 `scene-pipeline-ui`：从 `SCENE_STAGE_DEFINITIONS`（或共享导出）生成侧栏项——前期/制作/交付分组、中文显示名、与 `projectState.state.stages` 合并的状态。替换 `coreStages` 硬编码列表。

## 验收标准

- [ ] 侧栏展示 13 个引擎阶段（export 含 system）
- [ ] 分组标签正确
- [ ] `tests/sceneforge-pipeline-ui.test.ts` 通过

## 被阻塞于

无 - 可以立即开始