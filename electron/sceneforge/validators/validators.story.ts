import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { hasChineseLedStoryBody } from './story-chinese-led';
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
  const section = extractStoryBeatsSection(content);
  const beatIds = new Set<string>();
  for (const match of section.matchAll(
    /(?:^|\n)\s*[-*]?\s*(?:\*\s*)?(?:\*\*)?beat_id(?:\*\*)?\s*:\s*([A-Za-z0-9_-]+)/gim,
  )) {
    beatIds.add(match[1].toLowerCase());
  }
  if (beatIds.size > 0) {
    return beatIds.size;
  }

  const lines = section.split('\n');
  let beats = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^#{1,3}\s*Beat\s+\d+/i.test(line)) {
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
  const regex = new RegExp(
    `^\\s*[-*]?\\s*(?:\\*\\s*)?(?:\\*\\*)?${fieldName}(?:\\*\\*)?\\s*:\\s*.+$`,
    'gim',
  );
  return extractStoryBeatsSection(content).match(regex)?.length ?? 0;
}

export async function validateStoryStage(projectDir: string) {
  const errors = await validatePrepSupportStage(projectDir, 'story');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'story.story_direction');

  if (!hasChineseLedStoryBody(content)) {
    errors.push({
      code: 'SCENE_STORY_DIRECTION_NOT_CHINESE_LED',
      level: 'error',
      message: 'Story 阶段故事方向不是中文主导正文，当前英文占比过高或中文叙述过轻。',
      suggestion:
        '请用中文撰写 logline、beat 标题与摘要、角色/场景功能与风险说明；英文仅保留 beat_id、section 键名或括号内短标签。点击「运行本阶段」将自动按中文硬性规则重试生成。',
    });
  }

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