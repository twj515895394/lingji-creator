import { hasMarkdownSection } from './markdown-sections';

export const SCRIPT_DRAFT_SECTIONS = [
  'script_summary',
  'segment_strategy',
  'story_beats',
  'beat_table',
  'video_generation_unit_plan',
  'script_body',
  'performance_handoff',
  'storyboard_handoff',
  'risk_notes',
  'next_action',
] as const;

export type ScriptDraftSection = (typeof SCRIPT_DRAFT_SECTIONS)[number];

export const SCRIPT_DRAFT_SECTION_CANONICAL_ZH: Record<ScriptDraftSection, string> = {
  script_summary: '剧本摘要',
  segment_strategy: '分段策略',
  story_beats: '故事节拍',
  beat_table: '节拍表',
  video_generation_unit_plan: '视频生成单元规划',
  script_body: '剧本文本',
  performance_handoff: '表演交接',
  storyboard_handoff: '分镜交接',
  risk_notes: '风险说明',
  next_action: '下一步行动',
};

const SCRIPT_DRAFT_SECTION_ALIASES: Record<ScriptDraftSection, RegExp[]> = {
  script_summary: [/^script_summary$/i, /^剧本摘要/i, /^剧本概要/i, /^summary$/i],
  segment_strategy: [
    /^segment_strategy$/i,
    /^分段策略/i,
    /^分段方案/i,
    /^段长策略/i,
    /^节奏分段/i,
  ],
  story_beats: [/^story_beats$/i, /^故事节拍/i, /^剧情节拍/i, /^节拍列表/i],
  beat_table: [/^beat_table$/i, /^节拍表/i, /^beat\s*table$/i],
  video_generation_unit_plan: [
    /^video_generation_unit_plan$/i,
    /^视频生成单元/i,
    /^生成单元规划/i,
  ],
  script_body: [/^script_body$/i, /^剧本文本/i, /^剧本正文/i, /^可拍正文/i],
  performance_handoff: [/^performance_handoff$/i, /^表演交接/i, /^表演指导交接/i],
  storyboard_handoff: [/^storyboard_handoff$/i, /^分镜交接/i, /^分镜承接/i],
  risk_notes: [/^risk_notes$/i, /^风险说明/i, /^风险提示/i],
  next_action: [/^next_action$/i, /^下一步/i, /^后续动作/i, /^下步行动/i, /^后续步骤/i],
};

function stripHeadingDecorations(title: string): string {
  let normalized = title.replace(/\*+/g, '').trim();
  normalized = normalized.replace(/^\d+[.)]\s*/, '');
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return normalized;
}

export function resolveScriptDraftSectionFromHeading(title: string): ScriptDraftSection | null {
  const normalized = stripHeadingDecorations(title);
  if (!normalized) return null;

  for (const section of SCRIPT_DRAFT_SECTIONS) {
    if (normalized === section || normalized.toLowerCase() === section) {
      return section;
    }
    if (SCRIPT_DRAFT_SECTION_ALIASES[section].some((re) => re.test(normalized))) {
      return section;
    }
    const zh = SCRIPT_DRAFT_SECTION_CANONICAL_ZH[section];
    if (normalized === zh || normalized.startsWith(zh)) {
      return section;
    }
  }
  return null;
}

function isTopLevelScriptDraftSectionHeadingLine(line: string): ScriptDraftSection | null {
  const trimmed = line.trim();
  const headingMatch = trimmed.match(/^##\s+(?!#)(.+)$/);
  if (!headingMatch) return null;
  return resolveScriptDraftSectionFromHeading(headingMatch[1] ?? '');
}

export function extractScriptDraftMarkdownSection(
  content: string,
  section: ScriptDraftSection,
): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (isTopLevelScriptDraftSectionHeadingLine(lines[index] ?? '') === section) {
      start = index;
      break;
    }
  }
  if (start < 0) {
    if (hasMarkdownSection(content, section)) {
      const lines2 = content.replace(/\r\n/g, '\n').split('\n');
      const pattern = new RegExp(
        `^##\\s+(?:\\d+[.)]?\\s+)?${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
        'i',
      );
      const idx = lines2.findIndex((line) => pattern.test(line.trim()));
      if (idx >= 0) {
        const collected: string[] = [];
        for (let index = idx + 1; index < lines2.length; index += 1) {
          const sectionAtLine = isTopLevelScriptDraftSectionHeadingLine(lines2[index] ?? '');
          if (sectionAtLine) break;
          collected.push(lines2[index] ?? '');
        }
        return collected.join('\n').trim();
      }
    }
    return '';
  }

  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const sectionAtLine = isTopLevelScriptDraftSectionHeadingLine(lines[index] ?? '');
    if (sectionAtLine && sectionAtLine !== section) {
      break;
    }
    collected.push(lines[index] ?? '');
  }
  return collected.join('\n').trim();
}

export function normalizeScriptDraftMarkdown(raw: string): string {
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
    const canonical = resolveScriptDraftSectionFromHeading(headingMatch[1] ?? '');
    out.push(canonical ? `## ${canonical}` : line);
  }
  return out.join('\n').trim();
}

export function hasScriptDraftMarkdownSection(
  content: string,
  section: ScriptDraftSection,
): boolean {
  if (extractScriptDraftMarkdownSection(content, section).trim().length > 0) {
    return true;
  }
  const zh = SCRIPT_DRAFT_SECTION_CANONICAL_ZH[section];
  if (hasMarkdownSection(content, section)) return true;
  if (hasMarkdownSection(content, zh)) return true;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^##\s+(?!#)(.+)$/);
    if (!headingMatch) continue;
    if (resolveScriptDraftSectionFromHeading(headingMatch[1] ?? '') === section) return true;
  }
  return false;
}

export function listMissingScriptDraftMarkdownSections(
  content: string,
  sectionNames: readonly ScriptDraftSection[] = SCRIPT_DRAFT_SECTIONS,
): ScriptDraftSection[] {
  const normalized = normalizeScriptDraftMarkdown(content);
  return sectionNames.filter((name) => !hasScriptDraftMarkdownSection(normalized, name));
}

