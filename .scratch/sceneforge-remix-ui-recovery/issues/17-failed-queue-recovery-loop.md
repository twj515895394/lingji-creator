Status: ready-for-agent

# 异常队列与失败恢复闭环

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

补齐 Remix 资产治理中的异常队列闭环，让失败素材不仅能被看到，还能被理解、重跑、删除或回流处理链。

端到端行为：

- 失败素材稳定进入异常分区。
- 用户可以查看失败原因、选择重跑、删除草稿，或回到处理页继续修复。
- 异常条目和处理中 / 已入库资产的动作语义明确区分。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md` 与 `02-remix-processing-workbench-exit-guard-and-feedback.md`。
- 这张票负责“失败后怎么恢复”的完整路径，不要只停留在列表展示。
- 错误原因要可读，不直接把原始技术噪音暴露给用户。

## 验收标准

- [ ] 失败素材出现在异常分区，不混入已入库或处理中列表
- [ ] 用户可查看失败原因
- [ ] 用户可从异常分区触发重跑或删除草稿
- [ ] 用户可回到处理页继续修复失败素材
- [ ] 失败恢复路径与处理状态机保持一致

## Review Checklist

- [ ] 异常队列不是只读列表，而是有恢复动作的完整切片
- [ ] 失败原因展示与 job / step 状态来源一致
- [ ] 删除草稿、重跑、返回处理页的语义清晰区分

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新资产库 / 处理页测试，覆盖异常分区与重跑路径
- [ ] 手动验证：造一个失败素材后，可从异常分区恢复或删除

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetLibrary.tsx`
- 处理失败 / 异常状态查询接口
- 相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/01-project-asset-library-status-filters.md`
- `.scratch/sceneforge-remix-ui-recovery/issues/16-processing-job-persistence-foundation.md`
