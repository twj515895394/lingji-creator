Status: ready-for-agent

# Recent Projects 记录项目身份与 Remix 入口意图

Type: AFK

## 父问题

`.scratch/sceneforge-remix-project-identity/PRD.md`

## 要构建什么

扩展 recent projects 存储结构，使每条草稿记录除了路径、名称和时间外，还能表达这是什么项目，以及如果它属于 Remix，最近一次是从“资产入库”还是“二次创作”语义进入的。

这一层是后续首页标签展示和再次打开路由的基础，因此要先把主进程存储、preload bridge、renderer 类型和兼容旧数据的读取逻辑一起打通。

## 验收标准

- [ ] recent projects 条目支持记录项目身份，至少区分 `script` / `sceneforge` / `remix`
- [ ] Remix 条目支持记录入口意图，至少区分 `asset-ingestion` / `creation`
- [ ] 读取旧的 recent-projects.json 时不会崩溃，缺失字段能安全回退
- [ ] 刷新 recent projects 时，已有身份信息不会被意外抹掉

## 被阻塞于

无 - 可以立即开始
