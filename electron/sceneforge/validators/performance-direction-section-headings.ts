import { hasMarkdownSection } from './markdown-sections';

export const PERFORMANCE_DIRECTION_SECTIONS = [
  'character_performance_profiles',
  'beat_performance_notes',
  'action_continuity_chains',
  'emotion_continuity_chains',
  'continuity_rules',
  'storyboard_handoff',
  'risk_notes',
  'next_action',
] as const;

export type PerformanceDirectionSection = (typeof PERFORMANCE_DIRECTION_SECTIONS)[number];

export const PERFORMANCE_SECTION_CANONICAL_ZH: Record<PerformanceDirectionSection, string> = {
  character_performance_profiles: '角色表演画像',
  beat_performance_notes: '节拍表演说明',
  action_continuity_chains: '动作连续性链',
  emotion_continuity_chains: '情绪连续性链',
  continuity_rules: '连续性规则',
  storyboard_handoff: '分镜交接',
  risk_notes: '风险说明',
  next_action: '下一步行动',
};

const PERFORMANCE_SECTION_ALIASES: Record<PerformanceDirectionSection, RegExp[]> = {
  character_performance_profiles: [
    /^character_performance_profiles$/i,
    /^角色表演画像/i,
    /^角色表演档案/i,
    /^表演画像/i,
  ],
  beat_performance_notes: [
    /^beat_performance_notes$/i,
    /^节拍表演说明/i,
    /^beat\s*表演/i,
    /^节拍级表演/i,
  ],
  action_continuity_chains: [
    /^action_continuity_chains$/i,
    /^动作连续性链/i,
    /^动作连续链/i,
  ],
  emotion_continuity_chains: [
    /^emotion_continuity_chains$/i,
    /^情绪连续性链/i,
    /^情绪连续链/i,
  ],
  continuity_rules: [/^continuity_rules$/i, /^连续性规则/i, /^连续规则/i],
  storyboard_handoff: [/^storyboard_handoff$/i, /^分镜交接/i, /^分镜承接/i],
  risk_notes: [/^risk_notes$/i, /^风险说明/i, /^风险提示/i],
  next_action: [/^next_action$/i, /^下一步/i, /^后续动作/i, /^下步行动/i],
};

function stripHeadingDecorations(title: string): string {
  let normalized = title.replace(/\*+/g, '').trim();
  normalized = normalized.replace(/^\d+[.)]\s*/, '');
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return normalized;
}

export function resolvePerformanceSectionFromHeading(
  title: string,
): PerformanceDirectionSection | null {
  const normalized = stripHeadingDecorations(title);
  if (!normalized) return null;

  for (const section of PERFORMANCE_DIRECTION_SECTIONS) {
    if (normalized === section || normalized.toLowerCase() === section) {
      return section;
    }
    if (PERFORMANCE_SECTION_ALIASES[section].some((re) => re.test(normalized))) {
      return section;
    }
    const zh = PERFORMANCE_SECTION_CANONICAL_ZH[section];
    if (normalized === zh || normalized.startsWith(zh)) {
      return section;
    }
  }
  return null;
}

function isTopLevelPerformanceSectionHeadingLine(line: string): PerformanceDirectionSection | null {
  const trimmed = line.trim();
  const headingMatch = trimmed.match(/^##\s+(?!#)(.+)$/);
  if (!headingMatch) return null;
  return resolvePerformanceSectionFromHeading(headingMatch[1] ?? '');
}

export function extractPerformanceMarkdownSection(
  content: string,
  section: PerformanceDirectionSection,
): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (isTopLevelPerformanceSectionHeadingLine(lines[index] ?? '') === section) {
      start = index;
      break;
    }
  }
  if (start < 0) return '';

  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const sectionAtLine = isTopLevelPerformanceSectionHeadingLine(lines[index] ?? '');
    if (sectionAtLine && sectionAtLine !== section) {
      break;
    }
    collected.push(lines[index] ?? '');
  }
  return collected.join('\n').trim();
}

export function normalizePerformanceDirectionMarkdown(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return text;

  const out: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^##\s+(?!#)(.+)$/);
    if (!headingMatch) {
      out.push(line);
      continue;
    }
    const canonical = resolvePerformanceSectionFromHeading(headingMatch[1] ?? '');
    out.push(canonical ? `## ${canonical}` : line);
  }
  return out.join('\n').trim();
}

export function hasPerformanceMarkdownSection(
  content: string,
  section: PerformanceDirectionSection,
): boolean {
  if (extractPerformanceMarkdownSection(content, section).trim().length > 0) {
    return true;
  }
  if (hasMarkdownSection(content, section)) return true;
  const zh = PERFORMANCE_SECTION_CANONICAL_ZH[section];
  if (hasMarkdownSection(content, zh)) return true;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^##\s+(?!#)(.+)$/);
    if (!headingMatch) continue;
    if (resolvePerformanceSectionFromHeading(headingMatch[1] ?? '') === section) return true;
  }
  return false;
}

export function listMissingPerformanceMarkdownSections(
  content: string,
  sectionNames: readonly PerformanceDirectionSection[] = PERFORMANCE_DIRECTION_SECTIONS,
): PerformanceDirectionSection[] {
  const normalized = normalizePerformanceDirectionMarkdown(content);
  return sectionNames.filter((name) => !hasPerformanceMarkdownSection(normalized, name));
}