Status: ready-for-human

## 父问题

`.scratch/sceneforge-continue-and-run/PRD.md`

## 要构建什么

在 Electron 中验证普通 Continue、Continue & Run、Provider 失败恢复和跨阶段草案交接，并记录模型调用边界。

## 验收标准

- [ ] 普通 Continue 不产生模型调用
- [ ] 支持的阶段边界可显式 Continue & Run
- [ ] 下一阶段只运行一次
- [ ] 草案不会自动提交
- [ ] Provider 失败不回滚上一阶段审批
- [ ] 全量测试与 TypeScript 通过

## 被阻塞于

- `03-continue-and-run-studio-action.md`

## 类型

HITL

