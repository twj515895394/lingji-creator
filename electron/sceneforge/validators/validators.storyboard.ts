import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const STORYBOARD_REQUIRED_ARTIFACTS = [
  'storyboard_prompt_pack',
  'control_board_prompts',
  'style_board_prompts',
  'master_board_prompt',
] as const;

function toMissingErrorCode(artifactKey: string): string {
  return `SCENE_STORYBOARD_MISSING_${artifactKey.toUpperCase()}`;
}

export async function validateStoryboardStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of STORYBOARD_REQUIRED_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `storyboard.${artifactKey}`);
    if (
      !artifact ||
      artifact.stage !== 'storyboard' ||
      artifact.kind !== 'final' ||
      artifact.role !== 'core_generation_asset' ||
      !artifact.coreAsset
    ) {
      errors.push({
        code: toMissingErrorCode(artifactKey),
        level: 'error',
        message: `Storyboard 阶段缺少核心产物：${artifactKey}`,
        suggestion: `请提交 ${artifactKey}.md 后重新校验。`,
      });
      continue;
    }

    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_STORYBOARD_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Storyboard 核心产物为空：${artifactKey}`,
        suggestion: `请补充 ${artifactKey}.md 的提示词内容。`,
      });
    }
  }

  return errors;
}
