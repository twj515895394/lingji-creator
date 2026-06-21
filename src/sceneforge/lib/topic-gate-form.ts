export interface TopicBriefFormValues {
  intent: string;
  totalDurationSec: number | null;
  segmentDurationSec: 5 | 6 | 8 | 10 | 15;
}

export const SEGMENT_DURATION_OPTIONS: Array<{ value: TopicBriefFormValues['segmentDurationSec']; label: string }> = [
  { value: 5, label: '5 秒' },
  { value: 6, label: '6 秒' },
  { value: 8, label: '8 秒' },
  { value: 10, label: '10 秒' },
  { value: 15, label: '15 秒' },
];

const SEGMENT_SET = new Set([5, 6, 8, 10, 15]);

export function buildTopicBriefMarkdown(values: TopicBriefFormValues): string {
  const intent = values.intent.trim() || '（待补充创作意图）';
  const total =
    values.totalDurationSec != null && values.totalDurationSec > 0
      ? String(Math.round(values.totalDurationSec))
      : '';
  const seg = values.segmentDurationSec;
  return `# 选题简报

## 创作意图
${intent}

## 成片规格
total_duration_sec: ${total || '60'}
segment_duration_sec: ${seg}

## 决策
go

## 风格（待确认）
- style_family:
- director_style_id:

## 风格候选
- id: pixar_like | label: 动画·皮克斯感 | family: animation
- id: live_action_cinematic | label: 实拍·电影感 | family: live_action
- id: documentary | label: 纪实·解说 | family: documentary

## 备注
- 可先保存简报，再做分析与人工确认。
`;
}

export function parseTopicBriefForm(markdown: string): TopicBriefFormValues {
  const intentMatch = markdown.match(/##\s*创作意图\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  const intent = (intentMatch?.[1] ?? '').trim().replace(/^（待补充.*）$/, '');

  const totalMatch = markdown.match(/total_duration_sec:\s*(\d+)/i);
  const totalParsed = totalMatch ? Number.parseInt(totalMatch[1], 10) : null;
  const totalDurationSec =
    totalParsed != null && Number.isFinite(totalParsed) && totalParsed > 0 ? totalParsed : null;

  const segMatch = markdown.match(/segment_duration_sec:\s*(\d+)/i);
  const segParsed = segMatch ? Number.parseInt(segMatch[1], 10) : 8;
  const segmentDurationSec = (SEGMENT_SET.has(segParsed as 5) ? segParsed : 8) as TopicBriefFormValues['segmentDurationSec'];

  return {
    intent,
    totalDurationSec,
    segmentDurationSec,
  };
}

export function buildIntakeBriefMarkdown(intent: string): string {
  const body = intent.trim() || '（待补充）';
  return `# 源材料

## 输入类型
text

## 链接或说明
${body}

## 用户目标
（可选：改编方向、结构分析等，可在下方「改编方向」区块补充）
`;
}

export function parseIntakeIntent(markdown: string): string {
  const link = markdown.match(/##\s*链接或说明\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (link?.[1]?.trim()) return link[1].trim();
  const first = markdown.replace(/^#.*\n+/m, '').trim();
  return first.slice(0, 500);
}
