/**
 * 从 Markdown 草案解析 P0 HITL 结构（与 ADR-0001 闸门字段对齐，存于 artifact 正文）。
 */

export interface SceneAdaptationDirection {
  id: string;
  title: string;
  summary: string;
}

export interface SceneAdaptationSelectionState {
  status: 'pending' | 'selected';
  selectedId?: string;
  directions: SceneAdaptationDirection[];
}

export interface SceneGateStyleOption {
  id: string;
  label: string;
  family?: string;
}

export interface SceneGateHITLState {
  decision: 'go' | 'observe' | 'drop' | null;
  styleOptions: SceneGateStyleOption[];
  selectedStyleId: string | null;
  styleConfirmed: boolean;
}

export interface SceneGateScoreItem {
  label: string;
  value: string;
}

export interface SceneGateScoreState {
  items: SceneGateScoreItem[];
  rawSection: string | null;
}

export interface SceneTopicAnalysisState {
  summary: string | null;
  totalScore: string | null;
  decisionSuggestion: 'go' | 'observe' | 'drop' | null;
  productionLevelSuggestion: 'focus' | 'fast' | null;
  scoreState: SceneGateScoreState;
  styleCandidates: SceneGateStyleOption[];
}

export interface SceneTopicIntentCheckMissingDimension {
  id: string;
  label: string;
  reason: string;
}

export interface SceneTopicIntentCheckSuggestion {
  dimensionId: string;
  tips: string[];
}

export interface SceneTopicIntentCheckState {
  status: 'pass' | 'needs_more' | 'stale' | 'unknown';
  summary: string | null;
  intentHash: string | null;
  missingDimensions: SceneTopicIntentCheckMissingDimension[];
  suggestions: SceneTopicIntentCheckSuggestion[];
}

const ADAPTATION_HEADING = /^##\s*改编方向\s*$/im;
const STYLE_HEADING = /^##\s*风格候选\s*$/im;
const SCORE_HEADING = /^##\s*评分\s*$/im;
const STYLE_CANDIDATE_HEADING = /^##\s*(?:导演\s*\/\s*画面风格候选|风格候选)\s*$/im;
const INTENT_CHECK_MISSING_HEADING = /^##\s*缺失项\s*$/im;
const INTENT_CHECK_SUGGESTIONS_HEADING = /^##\s*补充建议\s*$/im;

function slugId(title: string, index: number): string {
  const base = title
    .trim()
    .slice(0, 32)
    .replace(/\s+/g, '-')
    .replace(/[^\w一-鿿-]/g, '');
  return base ? `dir-${base}` : `dir-${index + 1}`;
}

/** 解析「## 改编方向」下 `-` 列表；支持 `- id: x | title: y | summary: z` 或 `- 标题：摘要` */
export function parseAdaptationDirectionsFromMarkdown(content: string): SceneAdaptationDirection[] {
  const match = content.match(ADAPTATION_HEADING);
  if (!match || match.index === undefined) {
    return [];
  }
  const after = content.slice(match.index + match[0].length);
  const sectionEnd = after.search(/^##\s/m);
  const section = sectionEnd >= 0 ? after.slice(0, sectionEnd) : after;
  const lines = section.split('\n');
  const directions: SceneAdaptationDirection[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const body = trimmed.replace(/^-\s*/, '');
    const idMatch = body.match(/(?:^|\|)\s*id:\s*([^|]+)/i);
    const titleMatch = body.match(/(?:^|\|)\s*title:\s*([^|]+)/i);
    const summaryMatch = body.match(/(?:^|\|)\s*summary:\s*(.+)$/i);
    if (idMatch || titleMatch) {
      const title = (titleMatch?.[1] ?? idMatch?.[1] ?? '').trim();
      if (!title) continue;
      directions.push({
        id: (idMatch?.[1] ?? slugId(title, directions.length)).trim(),
        title,
        summary: (summaryMatch?.[1] ?? '').trim(),
      });
      continue;
    }
    const colon = body.indexOf('：');
    const colonAscii = body.indexOf(':');
    const splitAt =
      colon >= 0 && (colonAscii < 0 || colon < colonAscii)
        ? colon
        : colonAscii >= 0
          ? colonAscii
          : -1;
    if (splitAt >= 0) {
      const title = body.slice(0, splitAt).trim();
      const summary = body.slice(splitAt + 1).trim();
      if (title) {
        directions.push({
          id: slugId(title, directions.length),
          title,
          summary,
        });
      }
    } else if (body.length > 0) {
      directions.push({
        id: slugId(body, directions.length),
        title: body,
        summary: '',
      });
    }
  }
  return directions;
}

export function parseAdaptationSelectionFromArtifact(
  adaptationSelectionMarkdown: string | null | undefined,
  directionsFromSource: SceneAdaptationDirection[],
): SceneAdaptationSelectionState {
  const directions = directionsFromSource.length > 0 ? directionsFromSource : [];
  if (!adaptationSelectionMarkdown?.trim()) {
    return { status: directions.length > 0 ? 'pending' : 'selected', directions };
  }
  const statusMatch = adaptationSelectionMarkdown.match(/status:\s*(pending|selected)/i);
  const selectedMatch = adaptationSelectionMarkdown.match(/selected_id:\s*(\S+)/i);
  const status = statusMatch?.[1]?.toLowerCase() === 'selected' ? 'selected' : 'pending';
  return {
    status,
    selectedId: selectedMatch?.[1]?.trim(),
    directions,
  };
}

export function buildAdaptationSelectionMarkdown(selected: {
  id: string;
  title: string;
  summary?: string;
}): string {
  return `# 改编方向确认

status: selected
selected_id: ${selected.id}
selected_title: ${selected.title}
${selected.summary ? `summary: ${selected.summary}` : ''}
`;
}

export function parseGateStyleOptionsFromMarkdown(content: string): SceneGateStyleOption[] {
  const match = content.match(STYLE_HEADING);
  if (!match || match.index === undefined) {
    return [];
  }
  const after = content.slice(match.index + match[0].length);
  const sectionEnd = after.search(/^##\s/m);
  const section = sectionEnd >= 0 ? after.slice(0, sectionEnd) : after;
  const options: SceneGateStyleOption[] = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const body = trimmed.replace(/^-\s*/, '');
    const idMatch = body.match(/id:\s*([^|]+)/i);
    const labelMatch = body.match(/label:\s*([^|]+)/i);
    const familyMatch = body.match(/family:\s*([^|]+)/i);
    const id = (idMatch?.[1] ?? '').trim();
    const label = (labelMatch?.[1] ?? id).trim();
    if (!id && !label) continue;
    options.push({
      id: id || slugId(label, options.length),
      label: label || id,
      family: familyMatch?.[1]?.trim(),
    });
  }
  return options;
}

export function parseGateScoresFromMarkdown(content: string): SceneGateScoreState {
  const match = content.match(SCORE_HEADING);
  if (!match || match.index === undefined) {
    return { items: [], rawSection: null };
  }

  const after = content.slice(match.index + match[0].length);
  const sectionEnd = after.search(/^##\s/m);
  const rawSection = (sectionEnd >= 0 ? after.slice(0, sectionEnd) : after).trim();
  const items: SceneGateScoreItem[] = [];

  for (const line of rawSection.split('\n')) {
    const body = line.trim().replace(/^-\s*/, '');
    if (!line.trim().startsWith('-') || !body) continue;
    const splitAt = body.search(/[：:]/);
    if (splitAt < 0) continue;
    const label = body.slice(0, splitAt).trim();
    const value = body.slice(splitAt + 1).trim();
    if (label && value) {
      items.push({ label, value });
    }
  }

  return { items, rawSection };
}

function parseTopicAnalysisStyleCandidates(content: string): SceneGateStyleOption[] {
  const match = content.match(STYLE_CANDIDATE_HEADING);
  if (!match || match.index === undefined) {
    return [];
  }
  const after = content.slice(match.index + match[0].length);
  const sectionEnd = after.search(/^##\s/m);
  const section = sectionEnd >= 0 ? after.slice(0, sectionEnd) : after;
  const options: SceneGateStyleOption[] = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const body = trimmed.replace(/^-\s*/, '');
    const idMatch = body.match(/id:\s*([^|]+)/i);
    const labelMatch = body.match(/label:\s*([^|]+)/i);
    const familyMatch = body.match(/family:\s*([^|]+)/i);
    const id = (idMatch?.[1] ?? '').trim();
    const label = (labelMatch?.[1] ?? id).trim();
    if (!id && !label) continue;
    options.push({
      id: id || slugId(label, options.length),
      label: label || id,
      family: familyMatch?.[1]?.trim(),
    });
  }
  return options;
}

function getMarkdownSection(content: string, heading: RegExp): string | null {
  const match = content.match(heading);
  if (!match || match.index === undefined) {
    return null;
  }
  const after = content.slice(match.index + match[0].length);
  const sectionEnd = after.search(/^##\s/m);
  return (sectionEnd >= 0 ? after.slice(0, sectionEnd) : after).trim();
}

function parseTopicIntentCheckMissingDimensions(
  content: string,
): SceneTopicIntentCheckMissingDimension[] {
  const section = getMarkdownSection(content, INTENT_CHECK_MISSING_HEADING);
  if (!section) {
    return [];
  }
  const items: SceneTopicIntentCheckMissingDimension[] = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const body = trimmed.replace(/^-\s*/, '');
    const id = (body.match(/id:\s*([^|]+)/i)?.[1] ?? '').trim();
    const label = (body.match(/label:\s*([^|]+)/i)?.[1] ?? '').trim();
    const reason = (body.match(/reason:\s*(.+)$/i)?.[1] ?? '').trim();
    if (!id || !label || !reason) continue;
    items.push({ id, label, reason });
  }
  return items;
}

function parseTopicIntentCheckSuggestions(content: string): SceneTopicIntentCheckSuggestion[] {
  const section = getMarkdownSection(content, INTENT_CHECK_SUGGESTIONS_HEADING);
  if (!section) {
    return [];
  }
  const grouped = new Map<string, string[]>();
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const body = trimmed.replace(/^-\s*/, '');
    const dimensionId = (body.match(/dimension_id:\s*([^|]+)/i)?.[1] ?? '').trim();
    const tip = (body.match(/tip:\s*(.+)$/i)?.[1] ?? '').trim();
    if (!dimensionId || !tip) continue;
    grouped.set(dimensionId, [...(grouped.get(dimensionId) ?? []), tip]);
  }
  return Array.from(grouped.entries()).map(([dimensionId, tips]) => ({
    dimensionId,
    tips,
  }));
}

export function parseTopicAnalysisFromMarkdown(content: string): SceneTopicAnalysisState {
  const summaryMatch = content.match(/(?:^|\n)summary:\s*(.+)$/im);
  const totalScoreMatch = content.match(/(?:^|\n)total_score:\s*(.+)$/im);
  const decisionMatch = content.match(/(?:^|\n)decision_suggestion:\s*(go|observe|drop)\b/im);
  const productionLevelMatch = content.match(/(?:^|\n)production_level_suggestion:\s*(focus|fast)\b/im);
  const decisionSuggestion =
    (decisionMatch?.[1]?.toLowerCase() as SceneTopicAnalysisState['decisionSuggestion'] | undefined) ??
    null;
  const productionLevelSuggestion =
    (productionLevelMatch?.[1]?.toLowerCase() as
      | SceneTopicAnalysisState['productionLevelSuggestion']
      | undefined) ?? null;

  return {
    summary: summaryMatch?.[1]?.trim() || null,
    totalScore: totalScoreMatch?.[1]?.trim() || null,
    decisionSuggestion,
    productionLevelSuggestion,
    scoreState: parseGateScoresFromMarkdown(content),
    styleCandidates: parseTopicAnalysisStyleCandidates(content),
  };
}

export function buildTopicAnalysisMarkdown(input: {
  summary: string;
  totalScore: string;
  decisionSuggestion: 'go' | 'observe' | 'drop';
  productionLevelSuggestion: 'focus' | 'fast' | null;
  scores: Array<{ label: string; value: string }>;
  styleCandidates: Array<{ id: string; label: string; family?: string | null }>;
}): string {
  const scoreLines =
    input.scores.length > 0
      ? input.scores.map((item) => `- ${item.label}: ${item.value}`).join('\n')
      : '- 总评: 待补充';
  const styleLines =
    input.styleCandidates.length > 0
      ? input.styleCandidates
          .map((item) =>
            `- id: ${item.id} | label: ${item.label}${item.family ? ` | family: ${item.family}` : ''}`,
          )
          .join('\n')
      : '- id: pixar_like | label: 动画·皮克斯感 | family: animation';

  return `# 选题分析

summary: ${input.summary.trim()}
total_score: ${input.totalScore.trim()}
decision_suggestion: ${input.decisionSuggestion}
production_level_suggestion: ${input.productionLevelSuggestion ?? ''}

## 评分
${scoreLines}

## 导演 / 画面风格候选
${styleLines}
`;
}

export function buildTopicIntentCheckMarkdown(input: {
  status: 'pass' | 'needs_more' | 'stale';
  summary: string;
  intentHash: string;
  missingDimensions: SceneTopicIntentCheckMissingDimension[];
  suggestions: SceneTopicIntentCheckSuggestion[];
}): string {
  const missingLines =
    input.missingDimensions.length > 0
      ? input.missingDimensions
          .map((item) => `- id: ${item.id} | label: ${item.label} | reason: ${item.reason}`)
          .join('\n')
      : '- 无';
  const suggestionLines =
    input.suggestions.length > 0
      ? input.suggestions
          .flatMap((item) => item.tips.map((tip) => `- dimension_id: ${item.dimensionId} | tip: ${tip}`))
          .join('\n')
      : '- 无';

  return `# 创作意图检查

status: ${input.status}
intent_hash: ${input.intentHash}
summary: ${input.summary.trim()}

## 缺失项
${missingLines}

## 补充建议
${suggestionLines}
`;
}

export function parseTopicIntentCheckFromMarkdown(content: string): SceneTopicIntentCheckState {
  const statusMatch = content.match(/(?:^|\n)status:\s*(pass|needs_more|stale)\b/i);
  const summaryMatch = content.match(/(?:^|\n)summary:\s*(.+)$/im);
  const intentHashMatch = content.match(/(?:^|\n)intent_hash:\s*(\S+)/i);

  return {
    status:
      (statusMatch?.[1]?.toLowerCase() as SceneTopicIntentCheckState['status'] | undefined) ?? 'unknown',
    summary: summaryMatch?.[1]?.trim() || null,
    intentHash: intentHashMatch?.[1]?.trim() || null,
    missingDimensions: parseTopicIntentCheckMissingDimensions(content),
    suggestions: parseTopicIntentCheckSuggestions(content),
  };
}

const DEFAULT_GATE_STYLES: SceneGateStyleOption[] = [
  { id: 'pixar_like', label: '动画·皮克斯感', family: 'animation' },
  { id: 'live_action_cinematic', label: '实拍·电影感', family: 'live_action' },
  { id: 'documentary', label: '纪实·解说', family: 'documentary' },
];

export function parseGateDecisionFromMarkdown(content: string): SceneGateHITLState['decision'] {
  const m = content.match(/(?:^|\n)##\s*决策\s*\n\s*(go|observe|drop)\b/im);
  if (m) return m[1].toLowerCase() as SceneGateHITLState['decision'];
  const inline = content.match(/决策[：:]\s*(go|observe|drop)\b/i);
  if (inline) return inline[1].toLowerCase() as SceneGateHITLState['decision'];
  return null;
}

export function parseGateHITLFromArtifacts(
  topicBrief: string,
  gateConfirmations: string | null | undefined,
): SceneGateHITLState {
  let decision = parseGateDecisionFromMarkdown(topicBrief);
  let styleOptions = parseGateStyleOptionsFromMarkdown(topicBrief);
  let selectedStyleId: string | null = null;
  let styleConfirmed = false;

  if (gateConfirmations?.trim()) {
    const d = gateConfirmations.match(/decision:\s*(go|observe|drop)/i);
    if (d) decision = d[1].toLowerCase() as SceneGateHITLState['decision'];
    const sid = gateConfirmations.match(/style_id:\s*(\S+)/i);
    if (sid) selectedStyleId = sid[1].trim();
    styleConfirmed = /style_confirmed:\s*true/i.test(gateConfirmations);
  }

  if (styleOptions.length === 0) {
    styleOptions = DEFAULT_GATE_STYLES;
  }

  if (!selectedStyleId) {
    const fromBrief = topicBrief.match(/director_style_id:\s*(\S+)/i);
    if (fromBrief) selectedStyleId = fromBrief[1].trim();
  }

  return {
    decision,
    styleOptions,
    selectedStyleId,
    styleConfirmed,
  };
}

export function buildGateConfirmationsMarkdown(input: {
  decision: 'go' | 'observe' | 'drop';
  styleId: string;
  styleLabel: string;
  styleFamily?: string;
  totalDurationSec?: number | null;
  segmentDurationSec?: number | null;
}): string {
  return `# 选题闸门确认

decision: ${input.decision}
style_id: ${input.styleId}
style_label: ${input.styleLabel}
style_family: ${input.styleFamily ?? ''}
style_confirmed: true
total_duration_sec: ${input.totalDurationSec ?? ''}
segment_duration_sec: ${input.segmentDurationSec ?? ''}
confirmed_at: ${new Date().toISOString()}
`;
}

/** topic_gate 未确认风格时，reference 及之后应显示阻塞（产品层，与 ADR 一致） */
export function isTopicGateStyleBlockingDownstream(
  gateConfirmations: string | null | undefined,
  topicBrief: string,
): boolean {
  return getTopicGateDownstreamBlockReason(gateConfirmations, topicBrief) !== null;
}

export function getTopicGateDownstreamBlockReason(
  gateConfirmations: string | null | undefined,
  topicBrief: string,
): string | null {
  const state = parseGateHITLFromArtifacts(topicBrief, gateConfirmations);
  if (!state.styleConfirmed) {
    return '请先完成「选题闸门」的风格确认';
  }
  if (state.decision === 'drop') {
    return '选题已放弃，后续阶段保持阻塞';
  }
  return null;
}
