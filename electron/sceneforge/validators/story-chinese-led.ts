/** Story story_direction 中文主导判定（生成后自检与提交校验共用） */
export function hasChineseLedStoryBody(content: string): boolean {
  const chineseChars = (content.match(/[一-鿿]/g) ?? []).length;
  const asciiLetters = (content.match(/[A-Za-z]/g) ?? []).length;

  if (chineseChars < 120) {
    return false;
  }

  const narrative = extractNarrativeSample(content);
  const narrativeChinese = (narrative.match(/[一-鿿]/g) ?? []).length;
  const narrativeAscii = (narrative.match(/[A-Za-z]/g) ?? []).length;
  if (narrativeChinese < 40) {
    return false;
  }
  if (narrativeAscii > 0 && narrativeChinese < narrativeAscii * 0.45) {
    return false;
  }

  if (asciiLetters === 0) {
    return true;
  }
  return chineseChars >= asciiLetters * 0.32;
}

function extractNarrativeSample(content: string): string {
  const sections = ['logline', 'story_premise', 'story_development_summary', 'ending_payoff'];
  const chunks: string[] = [];
  for (const name of sections) {
    const match = content.match(new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'));
    if (match?.[1]) {
      chunks.push(match[1]);
    }
  }
  const beats = content.match(/##\s*story_beats\s*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] ?? '';
  chunks.push(beats.slice(0, 4000));
  return chunks.join('\n');
}

export const STORY_CHINESE_MANDATE_SYSTEM_BLOCK = [
  '## 【硬性规则】输出语言：中文为主',
  '',
  '本阶段所有叙述性正文必须使用简体中文撰写。此条优先级高于行业英文模板习惯。',
  '',
  '必须用中文：logline、story_premise、story_development_summary、每个 beat 的 title 与 beat_summary、character_functions / core_scene_functions / key_prop_functions 说明、emotional_arc、hero_moment_candidates、ending_payoff、story_risk_notes、next_action 的正文。',
  '',
  '仅允许英文：Markdown section 键名（如 story_beats）、beat_id（如 beat_01）、以及 function 行括号内不超过 3 个词的标签（如 Setup）。',
  '',
  '禁止：整篇英文输出；英文 logline；英文 beat 标题（如 ### Beat 1: The Foundation）；英文段落复述同一内容。',
  '',
  '若违反语言规则，整份 story_direction 视为无效，不得提交。',
].join('\n');

export const STORY_CHINESE_RETRY_USER_APPENDIX = [
  '## 【强制纠正】上次输出语言违规',
  '',
  '你上一次返回的 story_direction 英文占比过高，不符合「中文为主」硬性规则。',
  '',
  '请完全用简体中文重写 story_direction：保留相同故事结构与 beat 数量，但 logline、premise、beat 标题与 beat_summary、角色/场景/道具功能、风险与 next_action 必须改为中文。',
  '',
  '不要解释，只返回符合 JSON 契约的修正结果。',
].join('\n');