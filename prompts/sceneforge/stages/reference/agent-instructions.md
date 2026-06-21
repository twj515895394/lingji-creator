# 参考分析阶段 · Agent 说明

- 先读取受控 Stage Context，再生成参考边界。
- 区分输入来源与最终参考类型，不把 `source_material` 直接当作裁定结果。
- 缺少可选源材料时，仍可根据选题简报和闸门确认完成分析。
- 生成结果只作为草案返回；必须经 `scene_submit_stage_draft` 显式提交。
- 不直接修改项目状态、产物清单或 handoff 文件。
