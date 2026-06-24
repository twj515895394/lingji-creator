Status: ready-for-agent

# SceneForge Remix 项目身份与再次打开落点收口

## 背景

当前首页“本地草稿”列表不会区分普通剪辑项目、SceneForge 项目和 Remix 项目。与此同时，Remix 资产入库入口会把目录初始化成 `type: sceneforge` 工程，导致再次从首页打开时默认落到 SceneForge Studio，而不是回到用户上次真正工作的 Remix 界面。

这会带来两个直接问题：

1. 用户无法在首页判断一个草稿到底属于哪种工作流。
2. 用户从 Remix 进入的工程再次打开时，不能稳定回到“资产入库”或“二次创作”对应界面。

## 目标

为 recent projects 增加项目身份元数据，让首页草稿列表和再次打开行为都能感知：

- 普通剪辑项目
- SceneForge 主流程项目
- Remix 资产入库项目
- Remix 二次创作项目

并保证 Remix 工程再次打开时，能稳定回到对应的 Remix 界面，而不是被笼统送回 SceneForge Studio。

## 范围

- 扩展 recent projects 存储结构与 renderer 类型
- 首页草稿列表展示项目类型标签
- 从首页 / recent project 重新打开时按项目身份决定落点
- 在 Remix 资产入库 / 二次创作流中持续刷新 recent project 身份

## 不在范围

- 不重构 SceneForge / Remix 底层 artifact 数据结构
- 不把当前项目拆成多个物理工程目录
- 不重做 application menu 的信息架构，只保证当前 reopen 行为正确
