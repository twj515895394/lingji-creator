import { hasMarkdownSection } from './markdown-sections';

/** 角色说明书板必备分区（与 validators.design 错误文案一致） */
export const CHARACTER_PROMPT_REQUIRED_SECTIONS = [
  'character_bible_title',
  'multi_view',
  'silhouette',
  'expression_system',
  'micro_expression',
  'pose_action',
  'prop_interaction',
  'detail_zone',
  'scale_reference',
  'boundary_constraints',
] as const;

export type CharacterPromptSection = (typeof CHARACTER_PROMPT_REQUIRED_SECTIONS)[number];

export const CHARACTER_PROMPT_SECTION_CANONICAL_ZH: Record<CharacterPromptSection, string> = {
  character_bible_title: '角色说明书',
  multi_view: '多视角',
  silhouette: '轮廓剪影',
  expression_system: '表情系统',
  micro_expression: '微表情',
  pose_action: '动作姿态',
  prop_interaction: '关键道具交互',
  detail_zone: '细节区',
  scale_reference: '比例对照',
  boundary_constraints: '边界约束',
};

const CHARACTER_PROMPT_SECTION_ALIASES: Record<CharacterPromptSection, RegExp[]> = {
  character_bible_title: [
    /^角色说明书/i,
    /^角色设计板/i,
    /^角色设定板/i,
    /^character\s*bible/i,
    /^character\s*design\s*sheet/i,
  ],
  multi_view: [/^多视角/i, /^multi[\s-]*view/i, /^turnaround/i, /^三视图/i],
  silhouette: [/^轮廓剪影/i, /^剪影/i, /^silhouette/i],
  expression_system: [/^表情系统/i, /^expression\s*system/i, /^表情/i],
  micro_expression: [/^微表情/i, /^micro[\s-]*expression/i],
  pose_action: [/^动作姿态/i, /^姿态/i, /^pose/i, /^动作/i],
  prop_interaction: [/^关键道具交互/i, /^道具交互/i, /^prop\s*interaction/i],
  detail_zone: [/^细节区/i, /^细节/i, /^detail\s*zone/i],
  scale_reference: [/^比例对照/i, /^比例/i, /^scale\s*reference/i],
  boundary_constraints: [/^边界约束/i, /^约束/i, /^boundary/i],
};

function stripHeadingDecorations(title: string): string {
  let normalized = title.replace(/\*+/g, '').trim();
  normalized = normalized.replace(/^\d+[.)]\s*/, '');
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return normalized;
}

export function resolveCharacterPromptSectionFromHeading(
  title: string,
): CharacterPromptSection | null {
  const normalized = stripHeadingDecorations(title);
  if (!normalized) return null;

  for (const section of CHARACTER_PROMPT_REQUIRED_SECTIONS) {
    const zh = CHARACTER_PROMPT_SECTION_CANONICAL_ZH[section];
    if (normalized === zh || normalized.startsWith(zh)) {
      return section;
    }
    if (CHARACTER_PROMPT_SECTION_ALIASES[section].some((re) => re.test(normalized))) {
      return section;
    }
  }
  return null;
}

export function hasCharacterPromptMarkdownSection(
  content: string,
  section: CharacterPromptSection,
): boolean {
  const zh = CHARACTER_PROMPT_SECTION_CANONICAL_ZH[section];
  if (content.includes(zh)) return true;
  if (hasMarkdownSection(content, zh)) return true;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (!headingMatch) continue;
    if (resolveCharacterPromptSectionFromHeading(headingMatch[1] ?? '') === section) return true;
  }
  return false;
}

export function listMissingCharacterPromptMarkdownSections(
  content: string,
  sectionNames: readonly CharacterPromptSection[] = CHARACTER_PROMPT_REQUIRED_SECTIONS,
): CharacterPromptSection[] {
  return sectionNames.filter((name) => !hasCharacterPromptMarkdownSection(content, name));
}

export function normalizeCharacterPromptsMarkdown(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return text;

  const out: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (!headingMatch) {
      out.push(line);
      continue;
    }
    const level = headingMatch[1] ?? '##';
    const canonical = resolveCharacterPromptSectionFromHeading(headingMatch[2] ?? '');
    if (!canonical) {
      out.push(line);
      continue;
    }
    const zh = CHARACTER_PROMPT_SECTION_CANONICAL_ZH[canonical];
    const hash = canonical === 'character_bible_title' && level.length === 1 ? '#' : '##';
    out.push(`${hash} ${zh}`);
  }
  return out.join('\n').trim();
}
