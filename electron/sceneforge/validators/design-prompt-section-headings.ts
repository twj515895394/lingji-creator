import { hasMarkdownSection } from './markdown-sections';

export const DESIGN_PROMPTS_REQUIRED_SECTIONS = [
  'visual_language',
  'character_designs',
  'scene_designs',
  'prop_designs',
  'space_continuity_seed',
  'prop_state_machines',
  'blocking_map',
  'rhythm_contract',
  'segment_rhythm_profiles',
  'cut_density_expectation',
  'boundary_rules',
] as const;

export type DesignPromptSection = (typeof DESIGN_PROMPTS_REQUIRED_SECTIONS)[number];

export const DESIGN_PROMPT_SECTION_CANONICAL_ZH: Record<DesignPromptSection, string> = {
  visual_language: '视觉语言',
  character_designs: '角色设计',
  scene_designs: '场景设计',
  prop_designs: '道具设计',
  space_continuity_seed: '空间连续性',
  prop_state_machines: '道具状态机',
  blocking_map: '场面调度',
  rhythm_contract: '节奏契约',
  segment_rhythm_profiles: '分段节奏配置',
  cut_density_expectation: '镜头密度期望',
  boundary_rules: '边界规则',
};

const DESIGN_PROMPT_SECTION_ALIASES: Record<DesignPromptSection, RegExp[]> = {
  visual_language: [/^视觉语言/i, /^visual\s*language$/i],
  character_designs: [/^角色设计/i, /^character\s*designs?$/i],
  scene_designs: [/^场景设计/i, /^scene\s*designs?$/i],
  prop_designs: [/^道具设计/i, /^prop\s*designs?$/i],
  space_continuity_seed: [/^空间连续性/i, /^space\s*continuity/i],
  prop_state_machines: [/^道具状态机/i, /^prop\s*state\s*machines?$/i],
  blocking_map: [/^场面调度/i, /^走位图/i, /^blocking\s*map$/i],
  rhythm_contract: [/^节奏契约/i, /^节奏合同/i, /^项目级节奏/i, /^rhythm\s*contract$/i],
  segment_rhythm_profiles: [/^分段节奏/i, /^段节奏/i, /^segment\s*rhythm/i],
  cut_density_expectation: [/^镜头密度/i, /^剪辑密度/i, /^cut\s*density/i],
  boundary_rules: [/^边界规则/i, /^boundary\s*rules?$/i],
};

function stripHeadingDecorations(title: string): string {
  let normalized = title.replace(/\*+/g, '').trim();
  normalized = normalized.replace(/^\d+[.)]\s*/, '');
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return normalized;
}

export function resolveDesignPromptSectionFromHeading(title: string): DesignPromptSection | null {
  const normalized = stripHeadingDecorations(title);
  if (!normalized) return null;

  for (const section of DESIGN_PROMPTS_REQUIRED_SECTIONS) {
    if (normalized === section || normalized.toLowerCase() === section) {
      return section;
    }
    if (DESIGN_PROMPT_SECTION_ALIASES[section].some((re) => re.test(normalized))) {
      return section;
    }
    const zh = DESIGN_PROMPT_SECTION_CANONICAL_ZH[section];
    if (normalized === zh || normalized.startsWith(zh)) {
      return section;
    }
  }
  return null;
}

export function hasDesignPromptMarkdownSection(
  content: string,
  section: DesignPromptSection,
): boolean {
  const zh = DESIGN_PROMPT_SECTION_CANONICAL_ZH[section];
  if (hasMarkdownSection(content, zh)) return true;
  if (hasMarkdownSection(content, section)) return true;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{2,4}\s+(.+)$/);
    if (!headingMatch) continue;
    if (resolveDesignPromptSectionFromHeading(headingMatch[1] ?? '') === section) return true;
  }
  return false;
}

export function listMissingDesignPromptMarkdownSections(
  content: string,
  sectionNames: readonly DesignPromptSection[] = DESIGN_PROMPTS_REQUIRED_SECTIONS,
): DesignPromptSection[] {
  return sectionNames.filter((name) => !hasDesignPromptMarkdownSection(content, name));
}

export function normalizeDesignPromptsMarkdown(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return text;

  const out: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (!headingMatch) {
      out.push(line);
      continue;
    }
    const canonical = resolveDesignPromptSectionFromHeading(headingMatch[2] ?? '');
    out.push(
      canonical ? `## ${DESIGN_PROMPT_SECTION_CANONICAL_ZH[canonical]}` : line,
    );
  }
  return out.join('\n').trim();
}
