import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { validateAudioDesignSemantic } from './semantic-support-stages';
import { validateSingleArtifactSupportStage } from './validators.support-prep';

const AUDIO_REQUIRED_MARKERS = [
  'voice_direction',
  'music_design',
  'foley_design',
  'ambience_design',
  'segment_audio_plan',
  'video_prompt_handoff',
  'risk_notes',
  'next_action',
] as const;

const AUDIO_VOICE_CONTINUITY_MARKERS = [
  'voice_identity_lock',
  'breath_pause_pattern',
  'speaker_voice_notes',
  'segment_voice_continuity',
] as const;

const AUDIO_SOUND_LAYER_ALIASES = {
  BGM: ['BGM', '配乐', '背景音乐', '音乐层'],
  'Foley-SFX': ['Foley-SFX', 'Foley', '拟音', '音效', '音效层'],
  Ambience: ['Ambience', '环境音', '氛围音', '环境层'],
  Silence: ['Silence', '静默', '留白', '停顿静场'],
} as const;

function hasChineseLedBody(content: string): boolean {
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const asciiLetters = (content.match(/[A-Za-z]/g) ?? []).length;
  return chineseChars >= 30 && chineseChars >= asciiLetters * 0.2;
}

function hasDialogueOrNarrationPlanMarker(content: string): boolean {
  if (content.includes('dialogue_or_narration_plan')) {
    return true;
  }
  return /(?:^|\n)\s*#{1,6}\s*(?:\d+\.\s*)?(?:台词|旁白|对白)(?:与旁白|\/旁白)?\s*(?:规划|方案|计划)/im.test(
    content,
  );
}

function declaresNoDialogueOrNarration(content: string): boolean {
  return (
    /无台词/u.test(content) ||
    /无对白/u.test(content) ||
    /无旁白/u.test(content) ||
    /no[\s-]?dialogue/i.test(content) ||
    /non[\s-]?verbal\s+vocal/i.test(content) ||
    /纯视觉叙事/u.test(content) ||
    /(?:全片|本片).{0,12}无台词/u.test(content)
  );
}

function impliesDialogueOrNarrationContext(content: string): boolean {
  if (declaresNoDialogueOrNarration(content)) {
    return false;
  }
  return /对白|台词|旁白|口播|独白|narration|dialogue/i.test(content);
}

export async function validateAudioStage(projectDir: string) {
  const errors = await validateSingleArtifactSupportStage(projectDir, 'audio');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'audio.audio_design');
  if (!hasChineseLedBody(content)) {
    errors.push({
      code: 'SCENE_AUDIO_DESIGN_NOT_CHINESE_LED',
      level: 'error',
      message: 'Audio 阶段正式方案不是中文主导正文，当前英文占比过高或中文结构过轻。',
      suggestion: '请让中文承担主体结构、分段说明和继承规则；英文仅保留少量必要术语或 marker。',
    });
  }

  const missingMarkers = AUDIO_REQUIRED_MARKERS.filter((marker) => !content.includes(marker));
  if (missingMarkers.length > 0) {
    errors.push({
      code: 'SCENE_AUDIO_DESIGN_MISSING_MARKERS',
      level: 'error',
      message: `Audio 阶段缺少正式声音方案 section：${missingMarkers.join('、')}`,
      suggestion:
        '请补齐 voice_direction、music_design、foley_design、ambience_design、segment_audio_plan、video_prompt_handoff、risk_notes 与 next_action。',
    });
  }

  const missingVoiceMarkers = AUDIO_VOICE_CONTINUITY_MARKERS.filter(
    (marker) => !content.includes(marker),
  );
  if (missingVoiceMarkers.length > 0) {
    errors.push({
      code: 'SCENE_AUDIO_DESIGN_MISSING_VOICE_CONTINUITY',
      level: 'error',
      message: `Audio 阶段缺少人声一致性 section：${missingVoiceMarkers.join('、')}`,
      suggestion:
        '请在 voice_direction 中补齐 voice_identity_lock、breath_pause_pattern、speaker_voice_notes 与 segment_voice_continuity，保证分段视频生成时人声不漂移。',
    });
  }

  const missingSoundLayers = Object.entries(AUDIO_SOUND_LAYER_ALIASES)
    .filter(([, aliases]) => aliases.every((alias) => !content.includes(alias)))
    .map(([marker]) => marker);
  if (missingSoundLayers.length > 0) {
    errors.push({
      code: 'SCENE_AUDIO_DESIGN_MISSING_SOUND_LAYERS',
      level: 'error',
      message: `Audio 阶段缺少关键声音层：${missingSoundLayers.join('、')}`,
      suggestion: '请在声音方案中明确补齐 BGM、Foley-SFX/拟音、Ambience/环境音、Silence/静默 四层。',
    });
  }

  const hasDialogueHints = impliesDialogueOrNarrationContext(content);
  if (hasDialogueHints && !hasDialogueOrNarrationPlanMarker(content)) {
    errors.push({
      code: 'SCENE_AUDIO_DESIGN_MISSING_DIALOGUE_PLAN',
      level: 'error',
      message: 'Audio 阶段检测到台词/旁白语境，但缺少 dialogue_or_narration_plan。',
      suggestion:
        '若上游存在对白、旁白或口播，请补充 dialogue_or_narration_plan（或「台词/旁白规划」章节），明确语速、重读、停顿与跨段继承方式；若为无台词纯视觉叙事，请显式写出「无台词」或 No-dialogue。',
    });
  }

  const semantic = validateAudioDesignSemantic(content);
  const semanticErrors: SceneValidationError[] = semantic.issues.map((issue) => ({
    code: issue.code,
    level: 'error',
    message: issue.message,
    suggestion: '请补充配乐、环境音、音效或旁白分层，并对齐分段节奏后重新提交。',
  }));
  return [...errors, ...semanticErrors];
}
