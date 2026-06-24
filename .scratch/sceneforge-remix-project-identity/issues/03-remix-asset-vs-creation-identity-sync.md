Status: ready-for-agent

# Remix 资产入库与二次创作持续同步项目身份

Type: AFK

## 父问题

`.scratch/sceneforge-remix-project-identity/PRD.md`

## 要构建什么

让 Remix 工作流在进入资产入库、进入二次创作、以及项目初始化为 Remix 工程后，持续刷新 recent project 身份，使同一个工程再次出现在首页时，仍然带着最近一次真实工作的 Remix 语义。

这个切片负责“谁来写 recent project 身份”和“什么时候更新”，从而把首页展示与再次打开的行为闭环补齐。

## 验收标准

- [ ] 从 Remix 资产入库入口初始化的新工程会被记录为 Remix 项目
- [ ] 进入 Remix 资产入库时，recent project 身份会同步为 `remix + asset-ingestion`
- [ ] 进入 Remix 二次创作时，recent project 身份会同步为 `remix + creation`
- [ ] 同一工程从 SceneForge 主流程回到 Studio 后，recent project 身份可回切为主流程语义

## 被阻塞于

- `.scratch/sceneforge-remix-project-identity/issues/01-recent-project-project-identity.md`
