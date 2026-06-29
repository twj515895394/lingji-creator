import type { RemixSegmentFrameVisionDocument } from './remix-frame-vision-service';

export type SpokenTextSource = 'on_screen_subtitle' | 'transcript_effective' | 'transcript_asr' | 'none';

export function normalizeSubtitleLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2) {
      continue;
    }
    if (seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 从帧级 vision 结果合并烧录字幕（去重、按帧顺序） */
export function mergeOnScreenSubtitlesFromFrameVision(
  frameVision: RemixSegmentFrameVisionDocument | null | undefined,
): string[] {
  if (!frameVision) {
    return [];
  }
  const segmentLevel = (frameVision as { onScreenSubtitles?: string[] }).onScreenSubtitles;
  if (Array.isArray(segmentLevel) && segmentLevel.length > 0) {
    return normalizeSubtitleLines(segmentLevel.map(String));
  }
  const fromFrames: string[] = [];
  for (const frame of frameVision.frames ?? []) {
    const perFrame = (frame as { onScreenSubtitles?: string[] }).onScreenSubtitles;
    if (Array.isArray(perFrame)) {
      fromFrames.push(...perFrame.map(String));
    }
  }
  return normalizeSubtitleLines(fromFrames);
}

export function resolvePrimarySpokenTextForVideoPrompt(input: {
  onScreenSubtitles: string[];
  effectiveTranscript: string;
  asrTranscript: string;
}): { text: string; source: SpokenTextSource; authorityNote: string } {
  const onScreen = normalizeSubtitleLines(input.onScreenSubtitles);
  const effective = input.effectiveTranscript.trim();
  const asr = input.asrTranscript.trim();

  if (onScreen.length > 0) {
    const text = onScreen.join(' ');
    const refs: string[] = ['对白以画面烧录字幕为准'];
    if (effective && effective !== text) {
      refs.push(`人工校对台词（参考）：${effective}`);
    }
    if (asr && asr !== text && asr !== effective) {
      refs.push(`ASR（参考）：${asr}`);
    }
    return {
      text,
      source: 'on_screen_subtitle',
      authorityNote: refs.join('；'),
    };
  }
  if (effective) {
    const asrNote = asr && asr !== effective ? `；ASR 原文（参考）：${asr}` : '';
    return {
      text: effective,
      source: 'transcript_effective',
      authorityNote: `对白以人工校对/有效台词为准${asrNote}`,
    };
  }
  if (asr) {
    return {
      text: asr,
      source: 'transcript_asr',
      authorityNote: '对白以 ASR 识别为准（画面无可靠烧录字幕）',
    };
  }
  return {
    text: '',
    source: 'none',
    authorityNote: '',
  };
}