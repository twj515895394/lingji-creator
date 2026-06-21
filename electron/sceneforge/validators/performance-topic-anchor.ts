/**
 * 从已定稿 script_draft 提取表演阶段「主题锚点」，用于偏题检测与 LLM 锁定块。
 */

import {
  extractScriptDraftMarkdownSection,
  normalizeScriptDraftMarkdown,
} from './script-draft-section-headings';

export interface PerformanceTopicAnchor {
  beatIds: string[];
  entityTokens: string[];
  requiredMentions: string[];
  forbiddenIfPresent: string[];
  summaryLine: string;
}

const STALL_TEMPLATE_FORBIDDEN = ['电子秤', '零钱夹', '摊位', '称重', '摊贩', '零钱'];

const FOOTBALL_UPSTREAM_SIGNALS = /足球|盘带|球门|院门|踢球|Boy_Hero|凌空抽射/i;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort();
}

function extractBeatIdsFromText(text: string): string[] {
  const ids = [...text.matchAll(/\b(beat_\d+)\b/gi)].map((m) => m[1]!.toLowerCase());
  return uniqueSorted(ids);
}

function extractCharacterIds(text: string): string[] {
  const fromParen = [...text.matchAll(/\(([A-Za-z][A-Za-z0-9_]*)\)/g)].map((m) => m[1]!);
  const heroStyle = [...text.matchAll(/\b([A-Za-z][A-Za-z0-9_]*_Hero)\b/g)].map((m) => m[1]!);
  return uniqueSorted([...fromParen, ...heroStyle]);
}

function extractEntityKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns: Array<{ re: RegExp; token: string }> = [
    { re: /足球/g, token: '足球' },
    { re: /盘带/g, token: '盘带' },
    { re: /球门/g, token: '球门' },
    { re: /院门/g, token: '院门' },
    { re: /书包/g, token: '书包' },
    { re: /石子路/g, token: '石子路' },
  ];
  for (const { re, token } of patterns) {
    if (re.test(text)) keywords.push(token);
  }
  return uniqueSorted(keywords);
}

export function extractPerformanceTopicAnchorFromScript(scriptMarkdown: string): PerformanceTopicAnchor | null {
  const normalized = normalizeScriptDraftMarkdown(scriptMarkdown.trim());
  if (!normalized) return null;

  const storyBeats = extractScriptDraftMarkdownSection(normalized, 'story_beats');
  const scriptBody = extractScriptDraftMarkdownSection(normalized, 'script_body');
  const summary = extractScriptDraftMarkdownSection(normalized, 'script_summary');
  const combined = [storyBeats, scriptBody, summary, normalized].join('\n');

  const beatIds = extractBeatIdsFromText(storyBeats || combined);
  const characterIds = extractCharacterIds(combined);
  const entityTokens = extractEntityKeywords(combined);

  const requiredMentions: string[] = [];
  if (beatIds.length > 0) {
    requiredMentions.push(beatIds[0]!);
    if (beatIds.length >= 2) requiredMentions.push(beatIds[1]!);
  }
  for (const id of characterIds.slice(0, 2)) {
    requiredMentions.push(id);
  }
  for (const kw of entityTokens.slice(0, 3)) {
    requiredMentions.push(kw);
  }

  const uniqueRequired = uniqueSorted(requiredMentions);
  if (uniqueRequired.length === 0 && beatIds.length === 0) {
    return null;
  }

  const forbiddenIfPresent = FOOTBALL_UPSTREAM_SIGNALS.test(combined)
    ? [...STALL_TEMPLATE_FORBIDDEN]
    : [];

  const summaryParts: string[] = [];
  if (characterIds.length > 0) summaryParts.push(`角色：${characterIds.join('、')}`);
  if (beatIds.length > 0) summaryParts.push(`节拍：${beatIds.join('、')}`);
  if (entityTokens.length > 0) summaryParts.push(`题材关键词：${entityTokens.join('、')}`);
  const summaryLine =
    summaryParts.length > 0
      ? summaryParts.join('；')
      : `须继承 script 中的 ${uniqueRequired.join('、')}`;

  return {
    beatIds,
    entityTokens,
    requiredMentions: uniqueRequired,
    forbiddenIfPresent,
    summaryLine,
  };
}

export interface PerformanceTopicDriftIssue {
  code: 'PERFORMANCE_TOPIC_DRIFT' | 'PERFORMANCE_TOPIC_MISSING_ANCHOR';
  message: string;
}

export function validatePerformanceTopicDrift(
  performanceMarkdown: string,
  anchor: PerformanceTopicAnchor | null,
): PerformanceTopicDriftIssue[] {
  if (!anchor) return [];

  const body = performanceMarkdown;
  const issues: PerformanceTopicDriftIssue[] = [];

  for (const forbidden of anchor.forbiddenIfPresent) {
    if (body.includes(forbidden)) {
      issues.push({
        code: 'PERFORMANCE_TOPIC_DRIFT',
        message: `表演指导出现与上游剧本不符的模板内容「${forbidden}」。当前剧本主题为：${anchor.summaryLine}。请删除摊位/称重对峙类设定，改为继承 script 中的角色、道具与 beat_id。`,
      });
      break;
    }
  }

  const stallCombo =
    /对手|对峙|摊/.test(body) &&
    (/电子|零钱|称重|秤/.test(body) || /\bB0[12]\b/.test(body)) &&
    FOOTBALL_UPSTREAM_SIGNALS.test(
      [anchor.summaryLine, ...anchor.entityTokens, ...anchor.beatIds].join(' '),
    );
  if (stallCombo && !issues.some((i) => i.code === 'PERFORMANCE_TOPIC_DRIFT')) {
    issues.push({
      code: 'PERFORMANCE_TOPIC_DRIFT',
      message: `表演指导疑似套用了「摊位对峙」模板，与上游剧本（${anchor.summaryLine}）不一致。beat_performance_notes 必须使用 beat_01 等 script 节拍 id，角色与道具须来自 design/script。`,
    });
  }

  if (anchor.beatIds.length >= 2) {
    const perfBeatUnderscore = extractBeatIdsFromText(body);
    const usesWrongBeatStyle =
      perfBeatUnderscore.length === 0 && /\bB\d+\b/i.test(body) && anchor.beatIds.length >= 2;
    if (usesWrongBeatStyle && anchor.forbiddenIfPresent.length > 0) {
      issues.push({
        code: 'PERFORMANCE_TOPIC_DRIFT',
        message: `beat 引用应使用 script 的 ${anchor.beatIds.slice(0, 3).join('、')} 等形式，勿改用无关模板中的 B01/B02 编号。`,
      });
    }
  }

  const minHits = Math.min(2, anchor.requiredMentions.length);
  if (minHits > 0 && anchor.forbiddenIfPresent.length > 0) {
    const hitCount = anchor.requiredMentions.filter((token) => body.includes(token)).length;
    if (hitCount < minHits) {
      issues.push({
        code: 'PERFORMANCE_TOPIC_MISSING_ANCHOR',
        message: `表演指导未体现上游剧本锚点（至少应出现其中 ${minHits} 项）：${anchor.requiredMentions.join('、')}。当前主题：${anchor.summaryLine}。`,
      });
    }
  }

  return issues;
}

export function buildPerformanceLockedUpstreamBlock(anchor: PerformanceTopicAnchor): string {
  const lines = [
    '## Locked Upstream Facts (MANDATORY — do not replace with other stories)',
    `主题锁定：${anchor.summaryLine}`,
    '- 你只能扩展上述剧本/design 中的表演细节，禁止改写为摊位、市集称重、零钱对峙、陌生主角/对手等新题材。',
    '- `beat_performance_notes` 中的 beat_id 必须与 script `story_beats` 一致（如 beat_01、beat_02），禁止偷换为无关模板里的 B01/B02。',
    '- `character_performance_profiles` 只能覆盖 script/design 已出现的角色 id 与道具，不要发明电子秤、零钱夹等未在上游出现的核心道具。',
  ];
  if (anchor.beatIds.length > 0) {
    lines.push(`- 必须覆盖的 beat_id：${anchor.beatIds.join('、')}`);
  }
  if (anchor.requiredMentions.length > 0) {
    lines.push(`- 正文须可检索地体现：${anchor.requiredMentions.join('、')}`);
  }
  if (anchor.forbiddenIfPresent.length > 0) {
    lines.push(`- 禁止出现：${anchor.forbiddenIfPresent.join('、')}`);
  }
  return lines.join('\n');
}

export function buildPerformanceLockedBlockFromStageContext(
  requiredInputs: Array<{ artifactId: string; content?: string }>,
): string {
  const scriptInput = requiredInputs.find((input) => input.artifactId === 'script.script_draft');
  const content = scriptInput?.content?.trim();
  if (!content) return '';
  const anchor = extractPerformanceTopicAnchorFromScript(content);
  if (!anchor) return '';
  return buildPerformanceLockedUpstreamBlock(anchor);
}
