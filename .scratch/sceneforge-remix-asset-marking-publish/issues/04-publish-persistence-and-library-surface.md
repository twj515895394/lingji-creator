Status: done

# 入库持久化回写与资产库展示对齐

Type: AFK

## 父问题

`.scratch/sceneforge-remix-asset-marking-publish/PRD.md`

## 要构建什么

在现有 JSON / 文件目录持久化基础上，收紧“保存入库”动作的资产级回写契约，并确保资产库视图能读取到正确的状态与摘要信息。

端到端行为：
- 用户在第 06 步点击 `保存入库` 后，系统对当前 source asset 执行门禁校验、状态切换和时间戳回写。
- 资产 document 中与资产标记、发布时间、状态相关的字段保持一致，不引入新的片段级标注结构。
- 返回资产库后，列表或详情能反映该资产已发布、携带正确标签和备注摘要。

## 验收标准

- [x] 执行保存入库后，source asset 持久化结果体现已发布状态和最新更新时间
- [x] 资产标记相关字段仍按现有资产级 JSON 结构保存，不额外发明新的片段级 schema
- [x] 已入库资产在资产库相关视图中可暴露正确状态、标签和备注信息

## 被阻塞于

- `.scratch/sceneforge-remix-asset-marking-publish/issues/01-stage-vocabulary-and-gates.md`
- `.scratch/sceneforge-remix-asset-marking-publish/issues/03-publish-confirmation-workspace.md`
