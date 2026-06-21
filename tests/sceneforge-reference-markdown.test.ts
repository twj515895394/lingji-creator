import { describe, expect, it } from 'vitest';
import {
  hasMarkdownSection,
  listMissingMarkdownSections,
} from '../electron/sceneforge/validators/markdown-sections';
import { normalizeReferenceNotesMarkdown } from '../electron/sceneforge/validators/normalize-reference-notes';
import {
  listMissingReferenceMarkdownSections,
  REFERENCE_REQUIRED_SECTIONS,
} from '../electron/sceneforge/validators/reference-section-headings';

describe('reference notes markdown sections', () => {
  it('detects ## section headings only', () => {
    const body = `## reference_type
hybrid

正文提到 decision_summary 但无标题`;
    expect(hasMarkdownSection(body, 'reference_type')).toBe(true);
    expect(hasMarkdownSection(body, 'decision_summary')).toBe(false);
    expect(listMissingMarkdownSections(body, ['reference_type', 'decision_summary'])).toEqual([
      'decision_summary',
    ]);
  });

  it('normalizes Chinese headings to canonical Chinese section titles', () => {
    const raw = `## 参考类型
混合参考

## 决策摘要
一句话

## 参考边界
### 主参考
原著

### 辅助参考
影视

## 允许继承
- 骨架

## 禁止继承
- 逐镜

## 必须保留
- 冲突

## 必须避免
- 演员

## 风险说明
- 相似度

## 下一步
进入 story`;
    const normalized = normalizeReferenceNotesMarkdown(raw);
    expect(listMissingReferenceMarkdownSections(normalized, REFERENCE_REQUIRED_SECTIONS)).toEqual([
      'creative_direction_context',
    ]);
    expect(/## 参考类型/m.test(normalized)).toBe(true);
    expect(/## reference_type/m.test(normalized)).toBe(false);
    expect(/主参考|primary_reference/i.test(normalized)).toBe(true);
  });

  it('normalizes numbered bilingual headings to Chinese titles', () => {
    const raw = `## 1. 参考类型 (Reference Type)
hybrid

## 2. 决策摘要 (Decision Summary)
摘要

## 3. 创意方向上下文 (Creative Direction Context)
上下文

## 4. 参考边界 (Reference Boundary)
主参考：皮克斯
辅助参考：80年代

## 5. 允许继承的叙事与技术功能 (Allowed Inheritance)
- a

## 6. 禁止直接照搬的具体表达 (Forbidden Inheritance)
- b

## 7. 必须保留的硬性约束 (Must Keep)
- c

## 10. 必须避免的禁用要素 (Must Avoid)
- d

## 11. 风险说明 (Risk Notes)
- e

## 12. 下步行动计划 (Next Action)
story`;
    const normalized = normalizeReferenceNotesMarkdown(raw);
    expect(listMissingReferenceMarkdownSections(normalized, REFERENCE_REQUIRED_SECTIONS)).toEqual([]);
    expect(/## 参考类型/m.test(normalized)).toBe(true);
    expect(/## reference_type/m.test(normalized)).toBe(false);
  });

  it('maps 创作方向 to 创意方向上下文 heading', () => {
    const raw = `## 参考类型
hybrid

## 决策摘要
摘要

## 创作方向
方向上下文

## 参考边界
主参考：原著
辅助参考：影视

## 允许继承
- a

## 禁止继承
- b

## 必须保留
- c

## 必须避免
- d

## 风险说明
- e

## 下一步
story`;
    const normalized = normalizeReferenceNotesMarkdown(raw);
    expect(listMissingReferenceMarkdownSections(normalized, REFERENCE_REQUIRED_SECTIONS)).toEqual([]);
    expect(/## 创意方向上下文/m.test(normalized)).toBe(true);
  });
});
