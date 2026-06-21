import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneStageId } from '../types';
import type { SceneValidationError } from './scene-validator';

/** 单产物支撑阶段 MVP 校验（与 scene-stage-definitions requiredArtifacts 对齐） */
const SINGLE_ARTIFACT_REQUIRED: Partial<Record<SceneStageId, readonly string[]>> = {
  reference: ['reference_notes'],
  story: ['story_direction'],
  assets: ['asset_plan'],
  script: ['script_draft'],
  performance: ['performance_direction'],
  audio: ['audio_design'],
  publish: ['publish_notes'],
};

function missingError(stage: SceneStageId, artifactKey: string): SceneValidationError {
  const slug = stage.toUpperCase().replace(/-/g, '_');
  return {
    code: `SCENE_${slug}_MISSING_${artifactKey.toUpperCase()}`,
    level: 'error',
    message: `${stage} 阶段缺少产物：${artifactKey}`,
    suggestion: `请在工坊提交 ${artifactKey} 后重新校验。`,
  };
}

export async function validateSingleArtifactSupportStage(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneValidationError[]> {
  const required = SINGLE_ARTIFACT_REQUIRED[stage];
  if (!required) {
    return [];
  }
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of required) {
    const artifact = artifacts.find((item) => item.id === `${stage}.${artifactKey}`);
    if (!artifact || artifact.stage !== stage || artifact.kind !== 'final') {
      errors.push(missingError(stage, artifactKey));
      continue;
    }
    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_${stage.toUpperCase()}_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `${stage} 产物为空：${artifactKey}`,
        suggestion: '请补充 Markdown 内容后重新提交。',
      });
    }
  }

  return errors;
}

export type PrepSupportStage = 'reference' | 'story' | 'assets';

export async function validatePrepSupportStage(
  projectDir: string,
  stage: PrepSupportStage,
): Promise<SceneValidationError[]> {
  return validateSingleArtifactSupportStage(projectDir, stage);
}

export function isPrepSupportStage(stage: SceneStageId): stage is PrepSupportStage {
  return stage === 'reference' || stage === 'story' || stage === 'assets';
}