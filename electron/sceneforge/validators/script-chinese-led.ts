import {
  extractScriptDraftMarkdownSection,
  normalizeScriptDraftMarkdown,
} from './script-draft-section-headings';

/** Script script_draft 中文主导判定（生成后自检与提交校验共用） */
export function hasChineseLedScriptBody(content: string): boolean {
  const normalized = normalizeScriptDraftMarkdown(content);
  const chineseChars = (normalized.match(/[一-鿿]/g) ?? []).length;
  const asciiLetters = (normalized.match(/[A-Za-z]/g) ?? []).length;

  if (chineseChars < 80) {
    return false;
  }

  const narrative = extractNarrativeSample(normalized);
  const narrativeChinese = (narrative.match(/[一-鿿]/g) ?? []).length;
  const narrativeAscii = (narrative.match(/[A-Za-z]/g) ?? []).length;
  if (narrativeChinese < 35) {
    return false;
  }
  if (narrativeAscii > 0 && narrativeChinese < narrativeAscii * 0.35) {
    return false;
  }

  if (asciiLetters === 0) {
    return true;
  }
  return chineseChars >= asciiLetters * 0.18;
}

function extractNarrativeSample(content: string): string {
  const sections = [
    'script_summary',
    'story_beats',
    'script_body',
    'performance_handoff',
    'storyboard_handoff',
    'risk_notes',
    'next_action',
  ] as const;
  return sections
    .map((section) => extractScriptDraftMarkdownSection(content, section))
    .filter(Boolean)
    .join('\n');
}

export const SCRIPT_CHINESE_MANDATE_SYSTEM_BLOCK = [
  '## 【硬性规则】输出语言：中文为主',
  '',
  '本阶段所有叙述性正文必须使用简体中文撰写。此条优先级高于行业英文模板习惯。',
  '',
  '必须用中文：script_summary、story_beats 中每个 beat 的 title / beat_summary、beat_table 的说明文字、video_generation_unit_plan 的 narrative_goal / 节奏说明、script_body、performance_handoff、storyboard_handoff、risk_notes、next_action。',
  '',
  '仅允许英文：Markdown section 键名（如 script_summary）、beat_id / vgu_id、snake_case 字段名（如 narrative_goal、pacing_profile、shot_density_hint、boundary_lock），以及括号内不超过 3 个词的功能标签。',
  '',
  '禁止：整篇英文剧本；英文 script_summary；英文 beat 标题；英文 narrative_goal 段落；英文 script_body 正文；英文 handoff 正文。',
  '',
  '若违反语言规则，整份 script_draft 视为无效，不得提交。',
].join('\n');

export const SCRIPT_CHINESE_RETRY_USER_APPENDIX = [
  '## 【强制纠正】上次输出语言违规',
  '',
  '你上一次返回的 script_draft 英文占比过高，不符合「中文为主」硬性规则。',
  '',
  '请保留相同的故事结构、beat 数量、VGU 划分与时长约束，但把 script_summary、beat 标题与 beat_summary、narrative_goal、script_body、performance_handoff、storyboard_handoff、risk_notes、next_action 全部改写为简体中文。',
  '',
  '保留 snake_case section 键名、beat_id / vgu_id 与必要字段名，不要解释，只返回符合 JSON 契约的修正结果。',
].join('\n');
