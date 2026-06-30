Status: ready-for-agent

# 已入库资产重建与回填入口

Type: AFK

## 父问题

`.scratch/sceneforge-asset-library-sqlite-persistence/PRD.md`

## 要构建什么

为已存在的 published 资产提供一次性或重复可执行的数据库重建 / 回填入口。

端到端行为：

- 系统能够扫描现有 `published_to_library` 资产目录。
- 系统能够读取旧资产的 manifest 与关联工件，并按正式 ingest 契约补建数据库记录。
- 重建过程会输出成功、失败、跳过和缺失工件摘要，便于人工核对。
- 新旧资产写入数据库后遵循同一结构和查询规则。

## 验收标准

- [ ] 系统能扫描项目内已 published 的 Source Asset 并执行回填
- [ ] 回填复用正式 ingest 契约，不引入第二套数据库写入规则
- [ ] 回填结果包含成功数、失败数、跳过项和缺失工件摘要
- [ ] 自动测试覆盖“已有 published 资产可被补建进入 DB”的行为

## 被阻塞于

- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/01-asset-library-db-foundation-and-schema.md`
- `.scratch/sceneforge-asset-library-sqlite-persistence/issues/02-publish-to-library-transactional-ingest.md`
