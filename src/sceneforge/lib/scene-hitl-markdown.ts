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

const ADAPTATION_HEADING = /^##\s*改编方向\s*$/im;
const STYLE_HEADING = /^##\s*风格候选\s*$/im;

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
  const state = parseGateHITLFromArtifacts(topicBrief, gateConfirmations);
  return !state.styleConfirmed;
}