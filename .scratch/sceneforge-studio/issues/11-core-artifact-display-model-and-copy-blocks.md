Status: completed-local

# 核心产物 Display Model 与可复制内容块

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

为 Design Prompts、Storyboard Prompts、Video Prompt Packs 三个核心阶段定义稳定的最终产物内容契约。落盘仍使用 Markdown，但 Artifact Store 读取核心 final artifact 时，需要额外返回适合程序取值和 UI 展示的 Display Model：标题、摘要、章节目录、核心 prompt 条目、可复制块、上下游 trace、raw content。这样 UI 不需要临时解析长 Markdown，也能让用户直接复制可用于外部工具的内容。

第一版只要求覆盖三个核心 final artifact；支撑产物继续走普通 Markdown preview。

## 验收标准

- [ ] 核心 final artifact metadata 中声明 `displayModelVersion`、`copyTargets` 和默认 `primaryCopyTarget`。
- [ ] Design final artifact 可解析出 character、scene、prop、master reference 四类可复制块。
- [ ] Storyboard final artifact 可解析出 pack overview、control board、style board、master board、segment prompt 复制块。
- [ ] Video Prompts final artifact 可解析出 full pack、中文 prompt pack、可选英文 prompt pack、单 segment prompt 复制块。
- [ ] `readSceneArtifact` 或等价 service 方法返回 `displayModel`，但 raw Markdown 仍保留。
- [ ] 解析失败时返回结构化 warning，并回退到 raw copy，不阻塞用户查看。
- [ ] 覆盖 Display Model 单测，包含正常、缺章节、空复制块、可选英文 prompt 缺失四类用例。

## Review Checklist

- [ ] Display Model 不依赖 UI 组件实现，main/service 层和 renderer 都能复用类型。
- [ ] Markdown 章节命名、artifact metadata、validator 规则一致，没有三套不同字段名。
- [ ] Copy Block 的 `text` 是可直接粘贴到外部生成工具的纯文本，不包含 UI 标签或调试字段。
- [ ] Copy Block 有稳定 `id`，便于测试、埋点和后续历史 diff。
- [ ] 解析器不通过任意文件路径读取内容，只处理 Artifact Store 已确认的 artifact。
- [ ] raw content、display content、copy content 三者边界清晰。
- [ ] 单测覆盖核心三阶段，并验证 fallback 不会抛出未处理异常。

## 被阻塞于

- Issue 03：需要 Artifact Store 与 Manifest。
- Issue 04：需要核心阶段 Validator 约束。
- Issue 09：需要 Stage Skill Pack 输出契约。

