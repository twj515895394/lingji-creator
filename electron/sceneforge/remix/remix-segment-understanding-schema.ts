import { createHash } from 'node:crypto';
import type { SourceKeyframe, SourceSegment } from '../../../src/sceneforge/remix/types';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';

export const REMIX_SEGMENT_UNDERSTANDING_SCHEMA = 'sceneforge-remix-segment-understanding' as const;
export const REMIX_SEGMENT_UNDERSTANDING_VERSION = 2 as const;
export const REMIX_SEGMENT_UNDERSTANDING_PROMPT_VERSION = 'balanced-mvp-v2.1' as const;

export interface RemixChineseVideoPrompt {
  language: 'zh-CN';
  fullChinesePrompt: string;
  subjectPrompt: string;
  scenePrompt: string;
  actionPrompt: string;
  performancePrompt: string;
  cameraPrompt: string;
  lightingPrompt: string;
  colorPrompt: string;
  emotionPrompt: string;
  rhythmPrompt: string;
  dialoguePrompt: string;
  soundPrompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  remixControlPrompt: string;
  negativePrompt: string;
  modelHints?: {
    seedance?: string;
    kling?: string;
    veo?: string;
    runway?: string;
  };
}

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
  videoPrompt: RemixChineseVideoPrompt;
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
  });
}

/** 兼容旧版：inputHash 曾包含台词文本，仅用于判断存量理解是否仍有效 */
export function buildLegacySegmentUnderstandingInputHash(input: {
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

export function segmentUnderstandingInputHashMatchesStored(input: {
  storedHash: string | null | undefined;
  segment: SourceSegment;
  keyframes: SourceKeyframe[];
  transcriptPlainTextsToTry: string[];
}): boolean {
  if (!input.storedHash?.trim()) {
    return false;
  }
  const visualHash = buildSegmentUnderstandingInputHash({
    segment: input.segment,
    keyframes: input.keyframes,
  });
  if (input.storedHash === visualHash) {
    return true;
  }
  for (const plainText of input.transcriptPlainTextsToTry) {
    const legacy = buildLegacySegmentUnderstandingInputHash({
      segment: input.segment,
      keyframes: input.keyframes,
      transcript: { plainText } as RemixSegmentTranscriptDocument,
    });
    if (input.storedHash === legacy) {
      return true;
    }
  }
  return false;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

export const REMIX_VIDEO_PROMPT_DIMENSION_DEFS: Array<{
  key: string;
  label: string;
  field: keyof RemixChineseVideoPrompt;
}> = [
  { key: 'subject', label: '人物主体', field: 'subjectPrompt' },
  { key: 'scene', label: '空间场景', field: 'scenePrompt' },
  { key: 'action', label: '动作流程', field: 'actionPrompt' },
  { key: 'performance', label: '表演状态', field: 'performancePrompt' },
  { key: 'camera', label: '镜头语言', field: 'cameraPrompt' },
  { key: 'lighting', label: '光影明暗', field: 'lightingPrompt' },
  { key: 'color', label: '色调色彩', field: 'colorPrompt' },
  { key: 'emotion', label: '情绪氛围', field: 'emotionPrompt' },
  { key: 'rhythm', label: '镜头节奏', field: 'rhythmPrompt' },
  { key: 'dialogue', label: '台词与口型', field: 'dialoguePrompt' },
  { key: 'sound', label: '环境声音', field: 'soundPrompt' },
  { key: 'style', label: '风格质感', field: 'stylePrompt' },
  { key: 'continuity', label: '时序连续', field: 'continuityPrompt' },
  { key: 'remix', label: '二创控制', field: 'remixControlPrompt' },
];

export function buildVideoPromptDimensionsFromChinesePrompt(
  videoPrompt: RemixChineseVideoPrompt,
): Array<{ key: string; label: string; text: string }> {
  return REMIX_VIDEO_PROMPT_DIMENSION_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    text: asString(videoPrompt[def.field]),
  })).filter((item) => item.text.length > 0);
}

function buildDialoguePerformanceVideoHints(input: {
  effectiveTranscript: string;
  asrTranscript?: string;
  dialogueFromModel: string;
  performanceFromModel: string;
}): { dialoguePrompt: string; performancePrompt: string } {
  const effective = input.effectiveTranscript.trim();
  const asr = input.asrTranscript?.trim() ?? '';
  const modelDialogue = input.dialogueFromModel.trim();
  const modelPerformance = input.performanceFromModel.trim();

  let dialoguePrompt = modelDialogue;
  if (effective) {
    const asrNote =
      asr && asr !== effective ? `（已相对 ASR 纠偏；ASR 原文：${asr}）` : '';
    dialoguePrompt = [
      '画面中人物正在说话或旁白配音，口型与语气需与台词一致。',
      `本段台词：「${effective}」${asrNote}`,
      modelDialogue && !modelDialogue.includes(effective) ? `生成补充：${modelDialogue}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  } else if (!dialoguePrompt) {
    dialoguePrompt = '本段无明显对白；若画面有人物，保持自然闭口或环境声，不编造台词。';
  }

  let performancePrompt = modelPerformance;
  if (effective) {
    const speakPerf =
      '人物口型随台词开合，唇部与下颌有自然说话动作，眼神与表情配合语句情绪。';
    performancePrompt = performancePrompt ? `${performancePrompt}；${speakPerf}` : speakPerf;
  }

  return { dialoguePrompt, performancePrompt };
}

function assembleFullChineseVideoPrompt(parts: RemixChineseVideoPrompt): string {
  return [
    parts.subjectPrompt,
    parts.scenePrompt,
    parts.actionPrompt,
    parts.performancePrompt,
    parts.cameraPrompt,
    parts.lightingPrompt,
    parts.colorPrompt,
    parts.emotionPrompt,
    parts.rhythmPrompt,
    parts.dialoguePrompt,
    parts.soundPrompt,
    parts.stylePrompt,
    parts.continuityPrompt,
    parts.remixControlPrompt,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('，');
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
    /** 用户校对后的有效台词（优先于 transcript.plainText） */
    effectiveTranscriptText?: string | null;
    /** 原始 ASR 文本，用于纠偏说明 */
    asrTranscriptText?: string | null;
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

  const fullChinesePrompt = asString(videoPromptRaw.fullChinesePrompt);
  const subjectPrompt = asString(videoPromptRaw.subjectPrompt);
  const scenePrompt = asString(videoPromptRaw.scenePrompt);
  const actionPrompt = asString(videoPromptRaw.actionPrompt);
  const performancePrompt = asString(videoPromptRaw.performancePrompt);
  const cameraPrompt = asString(videoPromptRaw.cameraPrompt);
  const lightingPrompt = asString(videoPromptRaw.lightingPrompt);
  const colorPrompt = asString(videoPromptRaw.colorPrompt);
  const emotionPrompt = asString(videoPromptRaw.emotionPrompt);
  const rhythmPrompt = asString(videoPromptRaw.rhythmPrompt);
  const dialoguePrompt = asString(videoPromptRaw.dialoguePrompt);
  const soundPrompt = asString(videoPromptRaw.soundPrompt);
  const stylePrompt = asString(videoPromptRaw.stylePrompt);
  const continuityPrompt = asString(videoPromptRaw.continuityPrompt);
  const remixControlPrompt = asString(videoPromptRaw.remixControlPrompt);
  const negativePrompt = asString(videoPromptRaw.negativePrompt, '避免崩坏画面，避免画面抖动，画面保持稳定。');

  const effectiveTranscript =
    context.effectiveTranscriptText?.trim() ||
    context.transcript?.plainText?.trim() ||
    '';
  const asrTranscript = context.asrTranscriptText?.trim() ?? context.transcript?.plainText?.trim() ?? '';

  const transcriptFallback = effectiveTranscript;
  const missingInputs: string[] = [];
  if (!transcriptFallback) {
    missingInputs.push('segment_transcript');
  }
  if (context.keyframes.length === 0) {
    missingInputs.push('keyframes');
  }

  // 兜底桥接值
  const visualAction = asString(visualRaw.mainAction, '人物完成一段可见动作。');
  const cameraShot = asString(cameraRaw.shotSize, '中景') + '，' + asString(cameraRaw.movement, '固定镜头');
  const transSummary = asString(audioRaw.speechSummary, transcriptFallback || '无明确台词');

  const finalSubjectPrompt = subjectPrompt || '人物主体';
  const finalScenePrompt = scenePrompt || asString(visualRaw.environmentDetails, '室内或日常场景');
  const finalActionPrompt = actionPrompt || visualAction;
  let finalPerformancePrompt = performancePrompt || '人物神态自然，眼神聚焦';
  const finalCameraPrompt = cameraPrompt || cameraShot;
  const finalLightingPrompt = lightingPrompt || asString(visualRaw.lighting, '自然光');
  const finalColorPrompt = colorPrompt || asString(visualRaw.colorTone, '写实中性色调');
  const finalEmotionPrompt = emotionPrompt || asString(storyRaw.emotion, '情绪平稳');
  const finalRhythmPrompt = rhythmPrompt || '镜头节奏平稳，动作与对白同步';
  let finalDialoguePrompt = dialoguePrompt;
  const dialoguePerf = buildDialoguePerformanceVideoHints({
    effectiveTranscript: effectiveTranscript,
    asrTranscript: asrTranscript !== effectiveTranscript ? asrTranscript : undefined,
    dialogueFromModel: dialoguePrompt,
    performanceFromModel: finalPerformancePrompt,
  });
  finalDialoguePrompt = dialoguePerf.dialoguePrompt;
  finalPerformancePrompt = dialoguePerf.performancePrompt;
  const finalSoundPrompt =
    soundPrompt ||
    (effectiveTranscript ? `对白清晰可闻：${effectiveTranscript.slice(0, 80)}${effectiveTranscript.length > 80 ? '…' : ''}；环境声与对白平衡` : '环境原声');
  const finalStylePrompt = stylePrompt || '影视级别，超写实高清';
  const finalContinuityPrompt = continuityPrompt || '与上下文镜头逻辑连贯';
  const finalRemixControlPrompt = remixControlPrompt || '保留主体动作和镜头构图';

  const videoPromptParts: RemixChineseVideoPrompt = {
    language: 'zh-CN',
    fullChinesePrompt: '',
    subjectPrompt: finalSubjectPrompt,
    scenePrompt: finalScenePrompt,
    actionPrompt: finalActionPrompt,
    performancePrompt: finalPerformancePrompt,
    cameraPrompt: finalCameraPrompt,
    lightingPrompt: finalLightingPrompt,
    colorPrompt: finalColorPrompt,
    emotionPrompt: finalEmotionPrompt,
    rhythmPrompt: finalRhythmPrompt,
    dialoguePrompt: finalDialoguePrompt,
    soundPrompt: finalSoundPrompt,
    stylePrompt: finalStylePrompt,
    continuityPrompt: finalContinuityPrompt,
    remixControlPrompt: finalRemixControlPrompt,
    negativePrompt,
    modelHints: (videoPromptRaw.modelHints as any) || {},
  };

  const finalFullChinesePrompt = fullChinesePrompt.trim() || assembleFullChineseVideoPrompt(videoPromptParts);
  videoPromptParts.fullChinesePrompt = finalFullChinesePrompt;

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
      mainAction: visualAction,
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
      speechSummary: transSummary,
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
    videoPrompt: videoPromptParts,
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
    videoPromptText: finalFullChinesePrompt,
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
  if (!document.videoPrompt.fullChinesePrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.fullChinesePrompt`);
  }
  if (!document.videoPrompt.subjectPrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.subjectPrompt`);
  }
  if (!document.videoPrompt.scenePrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.scenePrompt`);
  }
  if (!document.videoPrompt.dialoguePrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.dialoguePrompt`);
  }
  if (!document.videoPrompt.performancePrompt.trim()) {
    errors.push(`片段 ${document.segmentId} 缺少 videoPrompt.performancePrompt`);
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
    videoPrompt: document.videoPrompt?.fullChinesePrompt ?? '',
    quality: { confidence: document.quality?.confidence ?? null },
  };
}

export const REMIX_SEGMENT_UNDERSTANDING_SYSTEM_PROMPT = `你是专业影视分镜分析师、中文台词校对助手和 AI 视频生成提示词专家。
请基于片段元数据、分段台词与上下文信息，生成可用于二创和视频生成模型复原的结构化 JSON。

要求：
1. 必须客观描述可见内容，不要编造不可见的剧情细节或人物身份；
2. 必须输出 visual、camera、audio、story、remix、videoPrompt、quality 全部字段；
3. videoPrompt 必须是符合影视级多维度中文提示词的 RemixChineseVideoPrompt 结构：
   - 必须全部输出中文。
   - 需拆解包含：人物主体(subjectPrompt)、空间场景(scenePrompt)、动作流程(actionPrompt)、表演状态(performancePrompt)、镜头语言(cameraPrompt)、光影明暗(lightingPrompt)、色调色彩(colorPrompt)、情绪氛围(emotionPrompt)、镜头节奏(rhythmPrompt)、台词语气(dialoguePrompt)、环境声音(soundPrompt)、风格质感(stylePrompt)、时序连续(continuityPrompt)、二创控制(remixControlPrompt)以及负向约束(negativePrompt)。
   - 若【分段台词】非空：dialoguePrompt 必须写明本段台词原文（使用输入中的有效台词，可结合语气与字幕建议）；performancePrompt 必须描述人物说话状态、口型与表情；禁止忽略对白。
   - 若画面有人物但无台词：dialoguePrompt 应说明无对白/闭口，勿编造台词。
   - fullChinesePrompt 必须将上述全部正向维度（含台词、表演、情绪、节奏、声音）拼接为完整中文提示词，禁止只拼接前 8 项。
4. 只返回合法 JSON，不要附加任何 Markdown 格式、前言或后记；
5. 时序画风连贯性约束：若上下文输入中提供了【上一段的视频提示词】，生成的 videoPrompt.continuityPrompt 必须详细规划前后连贯动作，且主体外貌服装、光影色彩风格必须与上一段保持完全连贯一致，防范生成闪跳漂移。`;
