Status: todo

# 修复 Variant 复制后的 Edited Keyframe Prompt 绑定

Type: AFK

## 父问题

`.scratch/sceneforge-remix-review-followups/PRD.md`

## 要构建什么

修复 Variant 复制链路中的元数据串链问题。当前复制一个 Variant 时，新的 `editedKeyframes` 条目虽然会生成新的 `id`、`variantId` 和 `editedFramePath`，但 `promptPath` 仍保留原 Variant 的路径，导致复制后的关键帧元数据继续引用源 Variant 的 prompt 文件。

本 issue 要求复制完成后，新的 Variant 在目录、manifest 和关联元数据上都完全独立，可安全继续创作、导出与回读。

## 验收标准

- [ ] 复制 Variant 后，新的 `editedKeyframes[].promptPath` 指向新 Variant 自己的 prompt 文件路径
- [ ] 复制 Variant 后，新的 `editedKeyframes[].variantId`、`editedFramePath`、`promptPath` 都与新 Variant 目录一致
- [ ] 复制结果不再引用源 Variant 目录下的 prompt 文件
- [ ] Asset Library / Creation Workspace 读取复制后的 Variant 时，不出现跨 Variant 串链
- [ ] 不修改 Source Asset 域数据，不影响原 Variant 的已有数据

## Review Checklist

- [ ] 路径重写逻辑统一通过 `remix-artifact-paths.ts` 或等价路径工具生成，不手拼字符串
- [ ] 复制逻辑只修正 Variant 域与 Edited Keyframe 域，不波及 Source Asset 域
- [ ] 若旧数据缺少 `promptPath`，复制逻辑仍保持空安全，不因兼容分支崩溃
- [ ] 单测不仅校验文件复制，还校验 manifest / snapshot 中的路径绑定正确

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新 `tests/sceneforge-remix-variant-management.test.ts`，覆盖 duplicate 后的 `promptPath` / `editedFramePath` / `variantId` 绑定
- [ ] 如当前测试文件未覆盖 duplicate 元数据回读，补最小后端测试
- [ ] `npm run test -- sceneforge-remix-variant-management`

## 涉及范围

- `electron/sceneforge/remix/remix-variant-service.ts`
- `electron/sceneforge/remix/remix-artifact-paths.ts`
- `tests/sceneforge-remix-variant-management.test.ts`

## 关联说明

- 这是 `Issue #13` 的 correctness follow-up，不是新功能扩张
- 若不先修这一点，后续继续做 rename / duplicate / export 时会放大串链风险
