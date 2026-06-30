Status: done

# 资产标记工作台瘦身为资产级编辑

Type: AFK

## 父问题

`.scratch/sceneforge-remix-asset-marking-publish/PRD.md`

## 要构建什么

重做第 05 步工作台，让它只承担“整条资产的标签与备注编辑”职责，不再充当片段级理解工作台的延长线。

端到端行为：
- 进入第 05 步时，用户看到的是资产标记说明、标签输入区、备注输入区和保存动作区。
- 页面可展示 AI 生成的资产级建议，但不再展示当前片段、片段编号、时间范围、保留/替换建议等片段级卡片。
- 用户修改标签和备注后可保存，保存结果会稳定回写到当前 source asset 的资产级元数据中。

## 验收标准

- [x] 第 05 步主界面只保留资产级字段编辑和说明，不再渲染片段级详情卡片
- [x] 保存标签和备注后，重新进入工作台仍能读取到已保存的资产级内容
- [x] 第 05 步保存提示、未保存拦截和完成态都围绕资产级标记表达

## 被阻塞于

- `.scratch/sceneforge-remix-asset-marking-publish/issues/01-stage-vocabulary-and-gates.md`
