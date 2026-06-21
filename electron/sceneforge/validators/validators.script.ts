import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { validateScriptDraftSemantic } from './semantic-support-stages';
import {
  listMissingScriptDraftMarkdownSections,
  normalizeScriptDraftMarkdown,
  SCRIPT_DRAFT_SECTIONS,
} from './script-draft-section-headings';
import { validateSingleArtifactSupportStage } from './validators.support-prep';

export async function validateScriptStage(projectDir: string) {
  const errors = await validateSingleArtifactSupportStage(projectDir, 'script');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'script.script_draft');
  const normalized = normalizeScriptDraftMarkdown(content);
  const missingSections = listMissingScriptDraftMarkdownSections(normalized, SCRIPT_DRAFT_SECTIONS);
  if (missingSections.length > 0) {
    errors.push({
      code: 'SCENE_SCRIPT_DRAFT_MISSING_MARKERS',
      level: 'error',
      message: `Script 阶段缺少正式剧本承接 section：${missingSections.join('、')}`,
      suggestion:
        '请补齐 script_summary、segment_strategy、story_beats、beat_table、video_generation_unit_plan、script_body、performance_handoff、storyboard_handoff、risk_notes 与 next_action。',
    });
  }

  const semantic = validateScriptDraftSemantic(normalized);
  const semanticErrors: SceneValidationError[] = semantic.issues.map((issue) => ({
    code: issue.code,
    level: 'error',
    message: issue.message,
    suggestion:
      '请补齐 story_beats、video_generation_unit_plan、script_body 与下游 handoff 的具体内容，确保可录制、可表演、可分镜后再提交。',
  }));
  return [...errors, ...semanticErrors];
}
