import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const DESIGN_REQUIRED_ARTIFACTS = [
  'design_prompts',
  'character_prompts',
  'scene_prompts',
  'prop_prompts',
  'master_reference_prompt',
] as const;

function toErrorCode(artifactKey: string): string {
  return `SCENE_DESIGN_MISSING_${artifactKey.toUpperCase()}`;
}

export async function validateDesignStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of DESIGN_REQUIRED_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `design.${artifactKey}`);
    if (
      !artifact ||
      artifact.stage !== 'design' ||
      artifact.kind !== 'final' ||
      artifact.role !== 'core_generation_asset' ||
      !artifact.coreAsset
    ) {
      errors.push({
        code: toErrorCode(artifactKey),
        level: 'error',
        message: `Design 阶段缺少核心产物：${artifactKey}`,
        suggestion: `请提交 ${artifactKey}.md 后重新校验。`,
      });
      continue;
    }

    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_DESIGN_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Design 核心产物为空：${artifactKey}`,
        suggestion: `请补充 ${artifactKey}.md 的提示词内容。`,
      });
    }
  }

  return errors;
}
