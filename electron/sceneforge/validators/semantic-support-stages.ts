/**
 * 轻量结构校验（无 LLM）。失败即 validation failed，禁止推进。
 */

import {
  extractPerformanceMarkdownSection,
  normalizePerformanceDirectionMarkdown,
} from './performance-direction-section-headings';
import {
  extractScriptDraftMarkdownSection,
  normalizeScriptDraftMarkdown,
} from './script-draft-section-headings';

import type { PerformanceTopicAnchor } from './performance-topic-anchor';
import { validatePerformanceTopicDrift } from './performance-topic-anchor';

export interface SemanticValidationIssue {
  code: string;
  message: string;
}

export interface SemanticValidationResult {
  ok: boolean;
  issues: SemanticValidationIssue[];
}

function normalizeMarkdown(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function stripMarkdownHeadingLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^#/.test(line.trim()))
    .join('\n')
    .trim();
}

function extractMarkdownSection(content: string, sectionName: string): string {
  const lines = normalizeMarkdown(content).split('\n');
  const headingPattern = new RegExp(
    `^##\\s+(?:\\d+[.)]?\\s+)?${sectionName}\\s*$`,
    'i',
  );
  const start = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (start < 0) return '';

  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (/^##\s+(?:\d+[.)]?\s+)?[a-z][a-z0-9_]*\s*$/i.test(trimmed)) {
      break;
    }
    collected.push(lines[index]);
  }
  return collected.join('\n').trim();
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

const ALLOWED_SEGMENT_DURATIONS = new Set([5, 6, 8, 10, 15]);

function stripInlineMarkdownForParsing(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function extractSegmentDurationSeconds(text: string): number | null {
  const scoped = stripInlineMarkdownForParsing(text.trim());
  const fromKey = scoped.match(/segment_duration_seconds\s*\)?\s*[:：]\s*(\d+)/i);
  if (fromKey) {
    const value = Number.parseInt(fromKey[1] ?? '', 10);
    if (ALLOWED_SEGMENT_DURATIONS.has(value)) return value;
  }
  const zh = scoped.match(/(?:段长|单段时长|每段时长)\s*[:：]?\s*(\d+)\s*秒?/i);
  if (zh) {
    const value = Number.parseInt(zh[1] ?? '', 10);
    if (ALLOWED_SEGMENT_DURATIONS.has(value)) return value;
  }
  const inherit = scoped.match(
    /(?:继承|沿用|锁定|对齐)\s*(?:design|设定|节奏)?[^\n]{0,40}?(\d+)\s*秒/i,
  );
  if (inherit) {
    const value = Number.parseInt(inherit[1] ?? '', 10);
    if (ALLOWED_SEGMENT_DURATIONS.has(value)) return value;
  }
  return null;
}

function extractTimeRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const cleaned = stripInlineMarkdownForParsing(text);
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:s|秒)?\s*(?:-|–|—|~|至)\s*(\d+(?:\.\d+)?)\s*(?:s|秒)/gi,
    /(\d+(?:\.\d+)?)\s*(?:-|–|—|~|至)\s*(\d+(?:\.\d+)?)\s*(?:s|秒)/gi,
    /(\d+(?:\.\d+)?)\s*(?:-|–|—)\s*(\d+(?:\.\d+)?)(?=\s*(?:$|\n|,|，|；|;|——|—))/gi,
  ];
  for (const pattern of patterns) {
    for (const match of cleaned.matchAll(pattern)) {
      const start = Number.parseFloat(match[1] ?? '');
      const end = Number.parseFloat(match[2] ?? '');
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        ranges.push({ start, end });
      }
    }
  }
  return ranges;
}

function crossesSegmentBoundary(
  range: { start: number; end: number },
  segmentDurationSeconds: number,
): boolean {
  const startBucket = Math.floor(range.start / segmentDurationSeconds);
  const endBucket = Math.floor((range.end - 0.0001) / segmentDurationSeconds);
  return startBucket !== endBucket;
}

function countStoryBeats(text: string): number {
  const lines = text.split('\n');
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const normalized = stripInlineMarkdownForParsing(trimmed);
    if (/beat_id\s*:/i.test(normalized)) {
      count += 1;
      continue;
    }
    if (/^[-*+]\s+\**beat[_-]?\d+/i.test(normalized)) {
      count += 1;
      continue;
    }
    if (/beat[_-]?\d+\s*\(/i.test(normalized)) {
      count += 1;
    }
  }
  return count;
}

const MIN_SCRIPT_CHARS = 40;
const MIN_SEGMENT_MARKERS = 2;

/** 分段：## / ###、或「第N段」「段落N」、或有序列表行 */
function countScriptSegments(text: string): number {
  const lines = text.split('\n');
  let markers = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^#{2,3}\s+/.test(t)) markers += 1;
    if (/^第[一二三四五六七八九十\d]+[段节幕]/.test(t)) markers += 1;
    if (/^段落\s*\d+/.test(t)) markers += 1;
    if (/^\d+[.)）、]\s+\S/.test(t)) markers += 1;
  }
  return markers;
}

export function validateScriptDraftSemantic(content: string): SemanticValidationResult {
  const issues: SemanticValidationIssue[] = [];
  const text = normalizeScriptDraftMarkdown(content.trim());
  const segmentStrategy = extractScriptDraftMarkdownSection(text, 'segment_strategy');
  const storyBeatsBody = extractScriptDraftMarkdownSection(text, 'story_beats');
  const videoPlanBody = extractScriptDraftMarkdownSection(text, 'video_generation_unit_plan');
  const scriptBody = extractScriptDraftMarkdownSection(text, 'script_body');
  const performanceHandoff = extractScriptDraftMarkdownSection(text, 'performance_handoff');
  const storyboardHandoff = extractScriptDraftMarkdownSection(text, 'storyboard_handoff');

  if (text.length < MIN_SCRIPT_CHARS) {
    issues.push({
      code: 'SCRIPT_TOO_SHORT',
      message: `剧本草案过短（至少约 ${MIN_SCRIPT_CHARS} 字），需包含可录制的分段内容。`,
    });
  }

  const segments = countScriptSegments(text);
  if (segments < MIN_SEGMENT_MARKERS) {
    issues.push({
      code: 'SCRIPT_MISSING_SEGMENTS',
      message:
        '剧本需明确分段（建议使用 ## 标题、或「第N段」、或编号列表），至少 2 个段落标记。',
    });
  }

  const hasSpeakable =
    /旁白|对白|台词|口播|VO|OS/i.test(text) ||
    /[：:][^\n]{4,}/.test(text);
  if (!hasSpeakable && text.length >= MIN_SCRIPT_CHARS) {
    issues.push({
      code: 'SCRIPT_NO_SPEAKABLE',
      message: '剧本需包含旁白/对白/口播等可录制文本标记或明确台词行。',
    });
  }

  let segmentDurationSeconds = extractSegmentDurationSeconds(segmentStrategy);
  if (!segmentDurationSeconds) {
    segmentDurationSeconds = extractSegmentDurationSeconds(text);
  }
  const segmentStrategyRanges = extractTimeRanges(segmentStrategy);
  const auxiliaryRanges = [
    ...segmentStrategyRanges,
    ...extractTimeRanges(storyboardHandoff),
    ...extractTimeRanges(videoPlanBody),
  ];
  const uniqueAuxiliaryRanges = auxiliaryRanges.filter(
    (range, index, all) =>
      all.findIndex(
        (other) => other.start === range.start && other.end === range.end,
      ) === index,
  );
  const hasSegmentTimeRange =
    /segment(?:[_\s-]?\d+)?_time_range|segment_time_range|时间范围|各段时间范围|分段规划|time_range|段\s*\d+.*时间|Segment\s*\d+\s*\(\s*\d/i.test(
      `${segmentStrategy}\n${text}`,
    ) || uniqueAuxiliaryRanges.length >= 2;
  if (!segmentDurationSeconds || !hasSegmentTimeRange) {
    issues.push({
      code: 'SCRIPT_SEGMENT_STRATEGY_TOO_THIN',
      message:
        'segment_strategy 需明确 segment_duration_seconds 与各段 segment_time_range，保证后续 storyboard 有稳定段界。',
    });
  }

  if (
    segmentDurationSeconds &&
    segmentStrategyRanges.some((range) =>
      crossesSegmentBoundary(range, segmentDurationSeconds),
    )
  ) {
    issues.push({
      code: 'SCRIPT_SEGMENT_BOUNDARY_CROSSED',
      message:
        'segment_strategy 中存在跨段时间范围；当已锁定 segment_duration_seconds 时，不得出现 9s-13s 这类跨 segment 区间。',
    });
  }

  const beatCount = countStoryBeats(storyBeatsBody);
  if (beatCount < 3) {
    issues.push({
      code: 'SCRIPT_STORY_BEATS_TOO_THIN',
      message: 'story_beats 至少应给出 3 个以上 beat，并明确 beat_id。',
    });
  }

  const vguCount = countMatches(videoPlanBody, /(?:###\s*)?VGU[_\s-]?\d+/gi);
  const videoPlanForLink = stripInlineMarkdownForParsing(videoPlanBody);
  const hasVguLink =
    /linked_beat_ids|beat_id|对应\s*beat|target_duration_seconds|duration|时长|narrative\s*goal|叙事目标|continuity\s*focus|action_continuity_focus|emotion_continuity_focus/i.test(
      videoPlanForLink,
    );
  if (vguCount < 2 || !hasVguLink) {
    issues.push({
      code: 'SCRIPT_VIDEO_PLAN_TOO_THIN',
      message: 'video_generation_unit_plan 需至少包含 2 个 VGU，并说明 beat 对应或时长/叙事目标。',
    });
  }

  const hasPacingProfile =
    /pacing_profile|pacing\s*profile|pacing\s*:|lyrical|balanced|kinetic|慢节奏|中节奏|快节奏|高动势|抒情|动感/i.test(
      `${segmentStrategy}\n${videoPlanBody}`,
    );
  const hasShotDensityHint =
    /shot_density_hint|shot\s*density\s*hint|镜头密度|低到中|中到高|高密度|低密度|低镜头密度|高镜头密度|高动势拆镜头|拆镜头/i.test(
      `${videoPlanBody}\n${storyboardHandoff}`,
    );
  if (!hasPacingProfile || !hasShotDensityHint) {
    issues.push({
      code: 'SCRIPT_PACING_HANDOFF_TOO_THIN',
      message:
        '剧本需给 storyboard 留下正式 pacing handoff，至少写明 pacing_profile 与 shot_density_hint。',
    });
  }

  const scriptSegments = countScriptSegments(scriptBody);
  const scriptBodyHasAction = /动作|停顿|转身|抬眼|看向|后退|抬手|逼近/i.test(scriptBody);
  if (scriptSegments < 2 || !scriptBodyHasAction) {
    issues.push({
      code: 'SCRIPT_BODY_TOO_THIN',
      message: 'script_body 需至少包含 2 个可拍段落，并写出具体动作、停顿或表演锚点。',
    });
  }

  const hasPerformanceCarry =
    /停顿|视线|眼神|动作|表情|情绪|节奏|重音|压场|反应/i.test(performanceHandoff);
  if (!hasPerformanceCarry) {
    issues.push({
      code: 'SCRIPT_PERFORMANCE_HANDOFF_TOO_THIN',
      message: 'performance_handoff 需明确交给下游的动作、停顿、视线或情绪节奏提示。',
    });
  }

  const hasStoryboardCarry =
    /镜头|近景|远景|构图|机位|连续性|道具|站位|转场|切/i.test(storyboardHandoff);
  if (!hasStoryboardCarry) {
    issues.push({
      code: 'SCRIPT_STORYBOARD_HANDOFF_TOO_THIN',
      message: 'storyboard_handoff 需明确镜头、连续性、站位或道具承接信息。',
    });
  }

  const hasBoundaryLock =
    /boundary_lock|boundary\s*lock|shots_must_not_cross_segment_boundary|边界锁定|镜头不得跨段|镜头不得跨\s*segment\s*边界|不得跨\s*\d+(?:\.\d+)?\s*s\s*边界|严禁跨段剪辑|严格锁定在\s*\d+(?:\.\d+)?\s*s?\s*-\s*\d+(?:\.\d+)?\s*s?\s*区间/i.test(
      `${segmentStrategy}\n${storyboardHandoff}`,
    );
  if (!hasBoundaryLock) {
    issues.push({
      code: 'SCRIPT_BOUNDARY_LOCK_TOO_THIN',
      message:
        'storyboard_handoff 需显式写出 boundary_lock，说明镜头不得跨段，避免下游分镜跨越 segment 边界。',
    });
  }

  return { ok: issues.length === 0, issues };
}

const MIN_PERFORMANCE_CHARS = 24;

function performanceBody(text: string): string {
  return stripMarkdownHeadingLines(text);
}

function countPerformanceBeatRefs(beatNotes: string): number {
  const fromBeatId = beatNotes.match(/beat_id\s*:/gi)?.length ?? 0;
  const fromB = beatNotes.match(/\bB\d+\b/gi)?.length ?? 0;
  const fromBeatUnderscore = beatNotes.match(/beat[_-]\d+/gi)?.length ?? 0;
  return Math.max(fromBeatId, fromB, fromBeatUnderscore);
}

export function validatePerformanceDirectionSemantic(
  content: string,
  topicAnchor?: PerformanceTopicAnchor | null,
): SemanticValidationResult {
  const issues: SemanticValidationIssue[] = [];
  const text = normalizePerformanceDirectionMarkdown(content.trim());
  const body = performanceBody(text);
  const characterProfiles = extractPerformanceMarkdownSection(
    text,
    'character_performance_profiles',
  );
  const beatNotes = extractPerformanceMarkdownSection(text, 'beat_performance_notes');
  const actionChains = extractPerformanceMarkdownSection(text, 'action_continuity_chains');
  const emotionChains = extractPerformanceMarkdownSection(text, 'emotion_continuity_chains');
  const continuityRules = extractPerformanceMarkdownSection(text, 'continuity_rules');
  const storyboardHandoff = extractPerformanceMarkdownSection(text, 'storyboard_handoff');

  if (text.length < MIN_PERFORMANCE_CHARS) {
    issues.push({
      code: 'PERFORMANCE_TOO_SHORT',
      message: `表演指导过短（至少约 ${MIN_PERFORMANCE_CHARS} 字）。`,
    });
  }

  const hasPerformanceCue =
    /情绪|走位|动作|表演|语气|节奏|停顿|视线|肢体/i.test(body);
  if (!hasPerformanceCue) {
    issues.push({
      code: 'PERFORMANCE_MISSING_CUES',
      message: '表演指导需包含情绪、动作、走位或语气等可执行提示（标题行不计）。',
    });
  }

  const hasCharacterDetail =
    /视线|眼神|重心|姿态|手部|标志性动作|signature|blocking|道具/i.test(characterProfiles);
  if (!hasCharacterDetail) {
    issues.push({
      code: 'PERFORMANCE_PROFILE_TOO_THIN',
      message: 'character_performance_profiles 需写清角色视线、重心、手部动作或走位习惯。',
    });
  }

  const beatCount = countPerformanceBeatRefs(beatNotes);
  const hasBeatPlayable =
    /停顿|视线|眼神|动作|手部|表情|重心|反应|节奏|pause|hold/i.test(beatNotes);
  if (beatCount < 2 || !hasBeatPlayable) {
    issues.push({
      code: 'PERFORMANCE_BEAT_NOTES_TOO_THIN',
      message: 'beat_performance_notes 需覆盖多个 beat，并写出可拍的停顿、视线、动作或表情细节。',
    });
  }

  const hasActionChain =
    /->|→|handoff|连续|承接|carry|动作链|接续/i.test(actionChains);
  if (!hasActionChain) {
    issues.push({
      code: 'PERFORMANCE_ACTION_CONTINUITY_TOO_THIN',
      message: 'action_continuity_chains 需说明跨 beat 的动作承接或 handoff 信号。',
    });
  }

  const hasEmotionChain =
    /->|→|平静|紧张|释放|压迫|犹豫|情绪|emotion|carry|过渡/i.test(emotionChains);
  if (!hasEmotionChain) {
    issues.push({
      code: 'PERFORMANCE_EMOTION_CONTINUITY_TOO_THIN',
      message: 'emotion_continuity_chains 需说明情绪弧线如何跨 beat 延续。',
    });
  }

  const hasContinuityRule =
    /视线|走位|blocking|道具|prop|gesture|动作|情绪|连续/i.test(continuityRules);
  if (!hasContinuityRule) {
    issues.push({
      code: 'PERFORMANCE_CONTINUITY_RULES_TOO_THIN',
      message: 'continuity_rules 需覆盖视线、走位、道具或情绪连续性的具体规则。',
    });
  }

  const hasStoryboardSupport =
    /镜头|camera|近景|特写|reaction|反应|blocking|道具|prop|timing|节奏|机位/i.test(
      storyboardHandoff,
    );
  if (!hasStoryboardSupport) {
    issues.push({
      code: 'PERFORMANCE_STORYBOARD_HANDOFF_TOO_THIN',
      message: 'storyboard_handoff 需给出镜头关注点、reaction timing 或 blocking 承接提示。',
    });
  }

  for (const drift of validatePerformanceTopicDrift(text, topicAnchor ?? null)) {
    issues.push({ code: drift.code, message: drift.message });
  }

  return { ok: issues.length === 0, issues };
}

const MIN_ASSET_PLAN_CHARS = 40;
const MIN_ASSET_LIST_ITEMS = 2;

function countMarkdownListItems(text: string): number {
  const lines = text.split('\n');
  let n = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^[-*+]\s+\S/.test(t)) n += 1;
    if (/^\d+[.)）、]\s+\S/.test(t)) n += 1;
  }
  return n;
}

export function validateAssetPlanSemantic(content: string): SemanticValidationResult {
  const issues: SemanticValidationIssue[] = [];
  const text = content.trim();

  if (text.length < MIN_ASSET_PLAN_CHARS) {
    issues.push({
      code: 'ASSET_PLAN_TOO_SHORT',
      message: `资产规划过短（至少约 ${MIN_ASSET_PLAN_CHARS} 字）。`,
    });
  }

  const hasAssetDimensions =
    /角色|场景|道具|资产/i.test(text) &&
    (/列表|清单|规划|P0|优先级/i.test(text) || countMarkdownListItems(text) >= MIN_ASSET_LIST_ITEMS);
  if (!hasAssetDimensions) {
    issues.push({
      code: 'ASSET_PLAN_MISSING_STRUCTURE',
      message: '资产规划需覆盖角色/场景/道具等功能说明，并含列表项或优先级（如 P0）。',
    });
  }

  const hasFunctionHint = /功能|剧情|节拍|出场/i.test(text);
  if (!hasFunctionHint && text.length >= MIN_ASSET_PLAN_CHARS) {
    issues.push({
      code: 'ASSET_PLAN_MISSING_FUNCTION',
      message: '资产条目需说明剧情功能或出场关系，避免仅列名称。',
    });
  }

  return { ok: issues.length === 0, issues };
}

const MIN_AUDIO_DESIGN_CHARS = 40;

function audioBody(text: string): string {
  return stripMarkdownHeadingLines(text);
}

export function validateAudioDesignSemantic(content: string): SemanticValidationResult {
  const issues: SemanticValidationIssue[] = [];
  const text = content.trim();
  const body = audioBody(text);

  if (text.length < MIN_AUDIO_DESIGN_CHARS) {
    issues.push({
      code: 'AUDIO_DESIGN_TOO_SHORT',
      message: `声音设计过短（至少约 ${MIN_AUDIO_DESIGN_CHARS} 字）。`,
    });
  }

  const hasAudioLayers =
    /配乐|BGM|环境音|音效|SFX|旁白|音乐|声音/i.test(body);
  if (!hasAudioLayers) {
    issues.push({
      code: 'AUDIO_DESIGN_MISSING_LAYERS',
      message: '声音设计需说明配乐、环境音、音效或旁白层等至少一类声音要素。',
    });
  }

  const hasSegmentOrContinuity =
    /分段|段[一二三四五六七八九十0-9]|镜头|连续性|storyboard|段落|节奏/.test(body) ||
    (body.match(/段/g)?.length ?? 0) >= 2;
  if (!hasSegmentOrContinuity && text.length >= MIN_AUDIO_DESIGN_CHARS) {
    issues.push({
      code: 'AUDIO_DESIGN_MISSING_STRUCTURE',
      message: '声音设计需与分段/镜头或连续性说明对齐（如分段配乐或节奏）。',
    });
  }

  return { ok: issues.length === 0, issues };
}
