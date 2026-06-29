Status: ready-for-agent

# Issue 04：台词确认后的 stale 收口

## 目标

修复“一键确认所有片段台词”后仍残留“已编辑需要重跑”之类提示的问题，让确认动作能够真正结束该阶段的 transcript 脏状态。

## 范围

- workbench 中 transcript confirmation 逻辑
- freshness / stale / ready_for_review / approved 相关状态判断
- 一键确认与单段确认后的状态同步

## 必须产出

- 明确 stale 来源的判定收敛
- 一键确认后清掉本不该残留的 transcript 脏状态
- 保留真正需要提示重跑的情形，不做一刀切静默清理

## 硬规则

- 不能靠隐藏提示文案来“修复”
- 不能把真实 stale 场景也全部清空
- 必须对“未手工修改但被误判为已编辑”这一类路径补测试

## 验收

- 点击“一键确认所有片段台词”后，不再错误残留“已编辑 / 需要重跑”提示
- 阶段状态可正确收口
- 相关 freshness / confirmation 测试通过

