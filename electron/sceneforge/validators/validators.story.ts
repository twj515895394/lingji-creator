import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { validatePrepSupportStage } from './validators.support-prep';

const STORY_REQUIRED_MARKERS = [
  'story_development_summary',
  'logline',
  'story_premise',
  'duration_target',
  'story_beats',
  'character_functions',
  'core_scene_functions',
  'key_prop_functions',
  'emotional_arc',
  'hero_moment_candidates',
  'ending_payoff',
  'story_risk_notes',
  'next_action',
] as const;

function countStoryBeats(content: string): number {
  const lines = extractStoryBeatsSection(content).split('\n');
  let beats = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^-\s*(?:\*\*)?beat_id(?:\*\*)?\s*:\s*[A-Za-z0-9_-]+/i.test(line)) {
      beats += 1;
      continue;
    }
    if (/^-?\s*(?:\*\*)?Beat(?:\*\*)?\s*[_\s-]*\d+/i.test(line)) {
      beats += 1;
      continue;
    }
    if (/^-?\s*B\d{2}\b/i.test(line)) {
      beats += 1;
    }
  }
  return beats;
}

function extractStoryBeatsSection(content: string): string {
  const match = content.match(/##\s*story_beats\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  return match?.[1] ?? '';
}

function countStructuredBeatFields(content: string, fieldName: 'function' | 'beat_summary'): number {
  const regex = new RegExp(`^\\s*-?\\s*(?:\\*\\*)?${fieldName}(?:\\*\\*)?\\s*:\\s*.+$`, 'gim');
  return extractStoryBeatsSection(content).match(regex)?.length ?? 0;
}

export async function validateStoryStage(projectDir: string) {
  const errors = await validatePrepSupportStage(projectDir, 'story');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'story.story_direction');
  const missingMarkers = STORY_REQUIRED_MARKERS.filter((marker) => !content.includes(marker));
  if (missingMarkers.length > 0) {
    errors.push({
      code: 'SCENE_STORY_DIRECTION_MISSING_MARKERS',
      level: 'error',
      message: `Story 阶段缺少正式故事骨架 section：${missingMarkers.join('、')}`,
      suggestion:
        '请补齐 logline、story_premise、duration_target、story_beats、character_functions、core_scene_functions、key_prop_functions、emotional_arc、hero_moment_candidates、ending_payoff 与 next_action。',
    });
  }

  const beatCount = countStoryBeats(content);
  if (beatCount < 4 || beatCount > 8) {
    errors.push({
      code: 'SCENE_STORY_DIRECTION_INVALID_BEAT_COUNT',
      level: 'error',
      message: `Story 阶段的 Story Beats 数量异常：检测到 ${beatCount} 个，要求 4-8 个。`,
      suggestion: '请把 story_beats 收敛到 4-8 个明确节拍，并为每个 beat 标明叙事功能。',
    });
  }

  const beatFunctionCount = countStructuredBeatFields(content, 'function');
  const beatSummaryCount = countStructuredBeatFields(content, 'beat_summary');
  if (beatCount > 0 && (beatFunctionCount < beatCount || beatSummaryCount < beatCount)) {
    errors.push({
      code: 'SCENE_STORY_DIRECTION_MISSING_BEAT_DETAILS',
      level: 'error',
      message: `Story 阶段的 Story Beats 细节不足：检测到 ${beatCount} 个 beat，但 function ${beatFunctionCount} 项、beat_summary ${beatSummaryCount} 项。`,
      suggestion:
        '请为每个 beat 至少补齐 title、function、beat_summary，避免只列编号而没有叙事功能描述。',
    });
  }

  return errors;
}
