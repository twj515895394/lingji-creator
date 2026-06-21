import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { validateAssetPlanSemantic } from './semantic-support-stages';
import { validatePrepSupportStage } from './validators.support-prep';

const ASSET_REQUIRED_MARKERS = [
  'story_function_summary',
  'character_assets',
  'scene_assets',
  'prop_assets',
  'design_actions',
  'asset_lock_summary',
  'risk_notes',
  'next_action',
] as const;

export async function validateAssetsStage(projectDir: string) {
  const errors = await validatePrepSupportStage(projectDir, 'assets');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'assets.asset_plan');
  const missingMarkers = ASSET_REQUIRED_MARKERS.filter((marker) => !content.includes(marker));
  if (missingMarkers.length > 0) {
    errors.push({
      code: 'SCENE_ASSET_PLAN_MISSING_MARKERS',
      level: 'error',
      message: `Assets 阶段缺少正式资产锁定 section：${missingMarkers.join('、')}`,
      suggestion:
        '请补齐 story_function_summary、character_assets、scene_assets、prop_assets、design_actions、asset_lock_summary、risk_notes 与 next_action。',
    });
  }

  if (!/reuse_direct|reuse_tweak|new_light|new_full/.test(content)) {
    errors.push({
      code: 'SCENE_ASSET_PLAN_MISSING_REUSE_STATUS',
      level: 'error',
      message: 'Assets 阶段未给出角色/场景复用分类。',
      suggestion: '请在 character_assets 或 scene_assets 中标明 reuse_direct、reuse_tweak、new_light 或 new_full。',
    });
  }

  if (!/skip_normal|embed_in_character_or_scene|new_core_prop/.test(content)) {
    errors.push({
      code: 'SCENE_ASSET_PLAN_MISSING_PROP_STATUS',
      level: 'error',
      message: 'Assets 阶段未给出核心道具处理分类。',
      suggestion: '请在 prop_assets 中标明 skip_normal、embed_in_character_or_scene 或 new_core_prop。',
    });
  }

  const semantic = validateAssetPlanSemantic(content);
  const semanticErrors: SceneValidationError[] = semantic.issues.map((issue) => ({
    code: issue.code,
    level: 'error',
    message: issue.message,
    suggestion: '请补充角色、场景、道具及其功能说明，并用清单或优先级组织后重新提交。',
  }));
  return [...errors, ...semanticErrors];
}
