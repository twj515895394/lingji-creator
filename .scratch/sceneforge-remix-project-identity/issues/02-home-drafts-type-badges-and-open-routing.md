Status: ready-for-agent

# 首页草稿列表显示项目类型，并按身份决定打开落点

Type: AFK

## 父问题

`.scratch/sceneforge-remix-project-identity/PRD.md`

## 要构建什么

让首页“本地草稿”列表显示项目类型标签，并让用户从首页或 recent project 重新打开项目时，不再只按 `projectData.type === sceneforge` 粗暴跳转，而是按 recent project 记录的项目身份进入正确界面。

这个切片只解决“首页可见性”和“再次打开去哪”的基础能力，不负责决定 Remix 项目何时写入身份元数据。

## 验收标准

- [ ] 首页草稿列表能区分普通剪辑、SceneForge、Remix 资产入库、Remix 二次创作
- [ ] 点击 recent project 时，普通剪辑仍进入原写稿/剪辑流
- [ ] 点击 recent project 时，SceneForge 主流程项目进入 SceneForge Studio
- [ ] 点击 recent project 时，Remix 项目进入对应 Remix 界面，而不是落到 SceneForge Studio

## 被阻塞于

- `.scratch/sceneforge-remix-project-identity/issues/01-recent-project-project-identity.md`
