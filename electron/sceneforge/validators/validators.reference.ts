import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { normalizeReferenceNotesMarkdown } from './normalize-reference-notes';
import {
  listMissingReferenceMarkdownSections,
  REFERENCE_REQUIRED_SECTIONS,
  REFERENCE_SECTION_CANONICAL_ZH,
} from './reference-section-headings';
import { validatePrepSupportStage } from './validators.support-prep';

export async function validateReferenceStage(projectDir: string) {
  const errors = await validatePrepSupportStage(projectDir, 'reference');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content: rawContent } = await readSceneArtifact(projectDir, 'reference.reference_notes');
  const content = normalizeReferenceNotesMarkdown(rawContent);
  const missingMarkers = listMissingReferenceMarkdownSections(content, REFERENCE_REQUIRED_SECTIONS);
  if (missingMarkers.length > 0) {
    const zhLabels = missingMarkers.map((key) => REFERENCE_SECTION_CANONICAL_ZH[key]);
    errors.push({
      code: 'SCENE_REFERENCE_NOTES_MISSING_MARKERS',
      level: 'error',
      message: `Reference 阶段缺少正式边界 section：${zhLabels.join('、')}`,
      suggestion:
        '请用中文 ## 小节补齐：参考类型、参考边界、允许继承、禁止继承、必须保留、必须避免、风险说明、下一步行动等。',
    });
  }

  if (!/primary_reference|主参考/.test(content) || !/secondary_reference|辅助参考/.test(content)) {
    errors.push({
      code: 'SCENE_REFERENCE_NOTES_MISSING_BOUNDARY_ROLES',
      level: 'error',
      message: 'Reference 阶段未明确主参考与辅助参考角色。',
      suggestion: '请在「参考边界」中明确主参考与辅助参考，避免下游误读参考来源。',
    });
  }

  return errors;
}
