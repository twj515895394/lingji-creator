Status: ready-for-agent

# 首页项目卡状态摘要与最近位置恢复

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

收口首页项目卡信息，让用户在首页就能看懂：

- 这是哪类项目
- 当前 Remix 工作停留在哪个位置
- 已入库 / 待确认 / 失败资产数量大致如何

同时保证从首页再次打开时，能回到对应的 Remix 资产库分区或处理页。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`。
- 复用已有 `.scratch/sceneforge-remix-project-identity/PRD.md` 对应的 recent project 身份机制，不重新发明第二套恢复状态。
- 页面文案要表达“项目类型 + 上次位置 + 状态摘要”，不要把入口意图当项目类型。

## 验收标准

- [ ] 首页项目卡展示项目类型、上次位置与资产状态摘要
- [ ] 打开最近项目时，能回到正确的 Remix 页面或资产库分区
- [ ] 不再出现“Remix: 资产入库”被误读成项目类型
- [ ] 与已有 `sceneforge-remix-project-identity` 行为不冲突，且不引入第二套 recent project 身份结构

## Review Checklist

- [ ] recent project 身份字段没有再次分叉出不兼容结构
- [ ] 项目卡信息优先级清晰，不堆叠过多状态词
- [ ] 打开最近项目的落点和 issue 01 的分区定义一致
- [ ] 如果已有 project identity 字段不足，优先在原结构上扩展而不是旁路新增

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新 recent project / setup / routing 测试
- [ ] 手动验证：首页卡片可区分项目与上次位置，再次打开落点正确

## 涉及范围

- `src/pages/Setup.tsx`
- `src/lib/recent-project-identity.ts`
- `src/lib/project-navigation.ts`
- recent projects 持久化与相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/01-project-asset-library-status-filters.md`
