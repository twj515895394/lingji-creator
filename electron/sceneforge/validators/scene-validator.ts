import type { SceneStageId } from '../types';
import { isSceneStageId } from '../pipeline/scene-stage-definitions';
import { validateDesignStage } from './validators.design';
import { validateStoryboardStage } from './validators.storyboard';
import { validateVideoPromptsStage } from './validators.video-prompts';

export interface SceneValidationError {
  code: string;
  level: 'error' | 'warning';
  message: string;
  suggestion: string;
}

export interface SceneValidationResult {
  stage: SceneStageId;
  status: 'passed' | 'failed';
  validatedAt: string;
  errors: SceneValidationError[];
}

export type SceneValidatorErrorCode = 'INVALID_STAGE' | 'UNSUPPORTED_STAGE_VALIDATOR';

export class SceneValidatorError extends Error {
  code: SceneValidatorErrorCode;

  constructor(code: SceneValidatorErrorCode, message: string) {
    super(message);
    this.name = 'SceneValidatorError';
    this.code = code;
  }
}

export async function validateSceneStage(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneValidationResult> {
  if (!isSceneStageId(stage)) {
    throw new SceneValidatorError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }

  let errors: SceneValidationError[];
  if (stage === 'design') {
    errors = await validateDesignStage(projectDir);
  } else if (stage === 'storyboard') {
    errors = await validateStoryboardStage(projectDir);
  } else if (stage === 'video_prompts') {
    errors = await validateVideoPromptsStage(projectDir);
  } else {
    throw new SceneValidatorError(
      'UNSUPPORTED_STAGE_VALIDATOR',
      `SceneForge stage validator is not implemented yet: ${stage}`,
    );
  }

  return {
    stage,
    status: errors.some((error) => error.level === 'error') ? 'failed' : 'passed',
    validatedAt: new Date().toISOString(),
    errors,
  };
}
