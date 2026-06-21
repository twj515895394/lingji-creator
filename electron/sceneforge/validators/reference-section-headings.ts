import { hasMarkdownSection } from './markdown-sections';

export const REFERENCE_REQUIRED_SECTIONS = [
  'reference_type',
  'decision_summary',
  'creative_direction_context',
  'reference_boundary',
  'allowed_inheritance',
  'forbidden_inheritance',
  'must_keep',
  'must_avoid',
  'risk_notes',
  'next_action',
] as const;

export type ReferenceSection = (typeof REFERENCE_REQUIRED_SECTIONS)[number];

export const REFERENCE_SECTION_CANONICAL_ZH: Record<ReferenceSection, string> = {
  reference_type: '参考类型',
  decision_summary: '决策摘要',
  creative_direction_context: '创意方向上下文',
  reference_boundary: '参考边界',
  allowed_inheritance: '允许继承',
  forbidden_inheritance: '禁止继承',
  must_keep: '必须保留',
  must_avoid: '必须避免',
  risk_notes: '风险说明',
  next_action: '下一步行动',
};

const REFERENCE_SECTION_ALIASES: Record<ReferenceSection, RegExp[]> = {
  reference_type: [/^参考类型/i, /^reference\s*type$/i],
  decision_summary: [/^决策摘要/i, /^decision\s*summary$/i],
  creative_direction_context: [
    /^创意方向上下文/i,
    /^创作方向上下文/i,
    /^创作方向$/i,
    /^创意方向$/i,
    /^creative\s*direction/i,
  ],
  reference_boundary: [/^参考边界/i, /^reference\s*boundary$/i],
  allowed_inheritance: [/^允许继承/i, /^可继承项/i, /^allowed\s*inheritance$/i],
  forbidden_inheritance: [
    /^禁止继承/i,
    /^禁止照搬/i,
    /^禁止直接照搬/i,
    /^forbidden\s*inheritance$/i,
  ],
  must_keep: [/^必须保留/i, /^must\s*keep$/i],
  must_avoid: [/^必须避免/i, /^must\s*avoid$/i],
  risk_notes: [/^风险说明/i, /^风险提示/i, /^risk\s*notes$/i],
  next_action: [/^下一步/i, /^下步行动/i, /^后续动作/i, /^next\s*action$/i],
};

export function stripReferenceHeadingDecorations(title: string): string {
  let normalized = title.replace(/\*+/g, '').trim();
  normalized = normalized.replace(/^\d+[.)]\s*/, '');
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return normalized;
}

export function resolveReferenceSectionFromHeading(title: string): ReferenceSection | null {
  const normalized = stripReferenceHeadingDecorations(title);
  if (!normalized) return null;

  for (const section of REFERENCE_REQUIRED_SECTIONS) {
    if (normalized === section || normalized.toLowerCase() === section) {
      return section;
    }
    if (REFERENCE_SECTION_ALIASES[section].some((re) => re.test(normalized))) {
      return section;
    }
    const zh = REFERENCE_SECTION_CANONICAL_ZH[section];
    if (normalized === zh || normalized.startsWith(zh)) {
      return section;
    }
  }
  return null;
}

export function hasReferenceMarkdownSection(content: string, section: ReferenceSection): boolean {
  const zh = REFERENCE_SECTION_CANONICAL_ZH[section];
  if (hasMarkdownSection(content, zh)) return true;
  if (hasMarkdownSection(content, section)) return true;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{2,4}\s+(.+)$/);
    if (!headingMatch) continue;
    if (resolveReferenceSectionFromHeading(headingMatch[1] ?? '') === section) return true;
  }
  return false;
}

export function listMissingReferenceMarkdownSections(
  content: string,
  sectionNames: readonly ReferenceSection[] = REFERENCE_REQUIRED_SECTIONS,
): ReferenceSection[] {
  return sectionNames.filter((name) => !hasReferenceMarkdownSection(content, name));
}
