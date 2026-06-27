import { createHash } from 'node:crypto';
import type { SourceKeyframe, SourceSegment } from '../../../src/sceneforge/remix/types';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';

export const REMIX_SEGMENT_UNDERSTANDING_SCHEMA = 'sceneforge-remix-segment-understanding' as const;
export const REMIX_SEGMENT_UNDERSTANDING_VERSION = 1 as const;
export const REMIX_SEGMENT_UNDERSTANDING_PROMPT_VERSION = 'balanced-mvp-v1' as const;

export interface RemixSegmentUnderstandingDocument {
  schema: typeof REMIX_SEGMENT_UNDERSTANDING_SCHEMA;
  version: typeof REMIX_SEGMENT_UNDERSTANDING_VERSION;
  segmentId: string;
  sourceAssetId: string;
  title: string;
  mode: 'balanced';
  promptVersion: string;
  inputHash: string;
  generatedAt: string;
  visual: {
    sceneSummary: string;
    mainAction: string;
    characters: string[];
    environmentDetails: string;
    lighting: string;
    colorTone: string;
  };
  camera: {
    shotSize: string;
    angle: string;
    movement: string;
    composition: string;
    focus: string;
    editingRole: string;
  };
  audio: {
    speechSummary: string;
    dialogue: Array<{
      speaker: string;
      text: string;
      tone: string;
    }>;
    ambient: string;
    music: string;
    silenceOrPause: string;
  };
  story: {
    plotFunction: string;
    emotion: string;
    conflict: string;
    beforeAfterRelation: string;
  };
  remix: {
    keepElements: string[];
    replaceableElements: string[];
    rewriteIdeas: string[];
    reuseScenarios: string[];
    riskNotes: string[];
  };
  videoPrompt: {
    positivePrompt: string;
    negativePrompt: string;
    motionPrompt: string;
    cameraPrompt: string;
    dialoguePrompt: string;
  };
  quality: {
    confidence: number;
    missingInputs: string[];
    needsHumanReview: boolean;
    warnings: string[];
  };
  videoPromptText: string;
}

export interface RemixSegmentUnderstandingGateItem {
  segmentId: string;
  visual: { mainAction: string };
  camera: { shotSize: string };
  audio?: { speechSummary?: string };
  story?: { plotFunction?: string };
  remix?: { keepElements?: string[] };
  videoPrompt: string;
  quality?: { confidence?: number };
}

function hashPayload(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildSegmentUnderstandingInputHash(input: {
  segment: SourceSegment;
  transcript?: RemixSegmentTranscriptDocument | null;
  keyframes: SourceKeyframe[];
}): string {
  return hashPayload({
    segmentId: input.segment.id,
    timeRange: input.segment.timeRange,
    keyframes: input.keyframes.map((frame) => ({
      id: frame.id,
      frameRole: frame.frameRole,
      imagePath: frame.imagePath,
      timestampMs: frame.timestampMs,
    })),
    transcriptPlainText: input.transcript?.plainText ?? '',
  });
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function asDialogue(value: unknown): RemixSegmentUnderstandingDocument['audio']['dialogue'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const text = asString(record.text);
      if (!text) {
        return null;
      }
      return {
        speaker: asString(record.speaker, 'speaker_unknown'),
        text,
        tone: asString(record.tone, '中性'),
      };
    })
    .filter((item): item is RemixSegmentUnderstandingDocument['audio']['dialogue'][number] => item !== null);
}

export function normalizeSegmentUnderstandingPayload(
  payload: Record<string, unknown>,
  context: {
    segment: SourceSegment;
    sourceAssetId: string;
    transcript?: RemixSegmentTranscriptDocument | null;
    keyframes: SourceKeyframe[];
    generatedAt: string;
  },
): RemixSegmentUnderstandingDocument {
  const visualRaw = (payload.visual as Record<string, unknown> | undefined) ?? {};
  const cameraRaw = (payload.camera as Record<string, unknown> | undefined) ?? {};
  const audioRaw = (payload.audio as Record<string, unknown> | undefined) ?? {};
  const storyRaw = (payload.story as Record<string, unknown> | undefined) ?? {};
  const remixRaw = (payload.remix as Record<string, unknown> | undefined) ?? {};
  const videoPromptRaw = (payload.videoPrompt as Record<string, unknown> | undefined) ?? {};
  const qualityRaw = (payload.quality as Record<string, unknown> | undefined) ?? {};

  const positivePrompt = asString(videoPromptRaw.positivePrompt);
  const negativePrompt = asString(videoPromptRaw.negativePrompt);
  const motionPrompt = asString(videoPromptRaw.motionPrompt);
  const cameraPrompt = asString(videoPromptRaw.cameraPrompt);
  const dialoguePrompt = asString(videoPromptRaw.dialoguePrompt);

  const transcriptFallback = context.transcript?.plainText?.trim() ?? '';
  const missingInputs: string[] = [];
  if (!transcriptFallback) {
    missingInputs.push('segment_transcript');
  }
  if (context.keyframes.length === 0) {
    missingInputs.push('keyframes');
  }

  const document: RemixSegmentUnderstandingDocument = {
    schema: REMIX_SEGMENT_UNDERSTANDING_SCHEMA,
    version: REMIX_SEGMENT_UNDERSTANDING_VERSION,
    segmentId: context.segment.id,
    sourceAssetId: context.sourceAssetId,
    title: context.segment.title,
    mode: 'balanced',
    promptVersion: REMIX_SEGMENT_UNDERSTANDING_PROMPT_VERSION,
    inputHash: buildSegmentUnderstandingInputHash({
      segment: context.segment,
      transcript: context.transcript,
      keyframes: context.keyframes,
    }),
    generatedAt: context.generatedAt,
    visual: {
      sceneSummary: asString(visualRaw.sceneSummary, '画面以人物与场景互动为主。'),
      mainAction: asString(visualRaw.mainAction, '人物完成一段可见动作。'),
      characters: asStringArray(visualRaw.characters),
      environmentDetails: asString(visualRaw.environmentDetails, '室内或日常场景。'),
      lighting: asString(visualRaw.lighting, '自然光或室内柔光。'),
      colorTone: asString(visualRaw.colorTone, '写实中性色调。'),
    },
    camera: {
      shotSize: asString(cameraRaw.shotSize, '中景'),
      angle: asString(cameraRaw.angle, '平视'),
      movement: asString(cameraRaw.movement, '固定镜头'),
      composition: asString(cameraRaw.composition, '主体居中，背景可见。'),
      focus: asString(cameraRaw.focus, '人物表情与动作'),
      editingRole: asString(cameraRaw.editingRole, '叙事推进'),
    },
    audio: {
      speechSummary: asString(audioRaw.speechSummary, transcriptFallback || '无明确台词'),
      dialogue: asDialogue(audioRaw.dialogue),
      ambient: asString(audioRaw.ambient, '环境声'),
      music: asString(audioRaw.music, '无明显配乐'),
      silenceOrPause: asString(audioRaw.silenceOrPause, '无明显长停顿'),
    },
    story: {
      plotFunction: asString(storyRaw.plotFunction, '推进当前情节。'),
      emotion: asString(storyRaw.emotion, '平稳'),
      conflict: asString(storyRaw.conflict, '轻度张力'),
      beforeAfterRelation: asString(storyRaw.beforeAfterRelation, '承接前后片段。'),
    },
    remix: {
      keepElements: asStringArray(remixRaw.keepElements),
      replaceableElements: asStringArray(remixRaw.replaceableElements),
      rewriteIdeas: asStringArray(remixRaw.rewriteIdeas),
      reuseScenarios: asStringArray(remixRaw.reuseScenarios),
      riskNotes: asStringArray(remixRaw.riskNotes),
    },
    videoPrompt: {
      positivePrompt,
      negativePrompt,
      motionPrompt,
      cameraPrompt,
      dialoguePrompt,
    },
    quality: {
      confidence:
        typeof qualityRaw.confidence === 'number' && Number.isFinite(qualityRaw.confidence)
          ? Math.min(1, Math.max(0, qualityRaw.confidence))
          : 0.75,
      missingInputs: asStringArray(qualityRaw.missingInputs).length
        ? asStringArray(qualityRaw.missingInputs)
        : missingInputs,
      needsHumanReview:
        typeof qualityRaw.needsHumanReview === 'boolean' ? qualityRaw.needsHumanReview : true,
      warnings: asStringArray(qualityRaw.warnings),
    },
    videoPromptText: positivePrompt,
  };

  if (!document.audio.dialogue.length && transcriptFallback) {
    document.audio.dialogue = [
      {
        speaker: 'speaker_unknown',
        text: transcriptFallback,
        tone: '中性',
      },
    ];
  }

  if (!document.remix.keepElements.length) {
    document.remix.keepElements = ['镜头节奏', '人物动作'];
  }
  if (!document.remix.replaceableElements.length) {
    document.remix.replaceableElements = ['台词', '场景背景'];
  }

  return document;
}

export function validateSegmentUnderstandingDocument(
  document: RemixSegmentUnderstandingDocument,
): string[] {
  const errors: string[] = [];
  if (!document.visual.mainAction.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 visual.mainAction`);
  }
  if (!document.camera.shotSize.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 camera.shotSize`);
  }
  if (!document.story.plotFunction.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 story.plotFunction`);
  }
  if (!document.videoPrompt.positivePrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.positivePrompt`);
  }
  if (!document.videoPrompt.negativePrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.negativePrompt`);
  }
  if (!document.videoPrompt.motionPrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.motionPrompt`);
  }
  if (!document.videoPrompt.cameraPrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.cameraPrompt`);
  }
  return errors;
}

export function toGateSegmentUnderstandingItem(
  document: RemixSegmentUnderstandingDocument,
): RemixSegmentUnderstandingGateItem {
  return {
    segmentId: document.segmentId,
    visual: { mainAction: document.visual?.mainAction ?? '' },
    camera: { shotSize: document.camera?.shotSize ?? '' },
    audio: { speechSummary: document.audio?.speechSummary ?? '' },
    story: { plotFunction: document.story?.plotFunction ?? '' },
    remix: { keepElements: document.remix?.keepElements ?? [] },
    videoPrompt: document.videoPrompt?.positivePrompt ?? '',
    quality: { confidence: document.quality?.confidence ?? null },
  };
}

export const REMIX_SEGMENT_UNDERSTANDING_SYSTEM_PROMPT = `你是影视分镜与 AI 视频生成提示词专家。
请基于片段关键帧路径、分段台词与时间范围，生成可用于二创复用和视频模型复原的结构化 JSON。

要求：
- 必须客观描述可见内容，不要编造不可见身份；
- 台词为空时 speechSummary 写「无明确台词」；
- 必须输出 visual、camera、audio、story、remix、videoPrompt、quality 全部字段；
- videoPrompt 需包含 positivePrompt、negativePrompt、motionPrompt、cameraPrompt、dialoguePrompt；
- 只返回合法 JSON，不要附加解释。`;
