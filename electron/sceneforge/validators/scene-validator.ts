import type { SceneStageId } from '../types';
import { isSceneStageId } from '../pipeline/scene-stage-definitions';
import { validateDesignStage } from './validators.design';
import { validateStoryboardStage } from './validators.storyboard';
import { validateVideoPromptsStage } from './validators.video-prompts';
import { validateSourceIntakeStage } from './validators.source-intake';
import { validateTopicGateStage } from './validators.topic-gate';
import { validateReferenceStage } from './validators.reference';
import { validateStoryStage } from './validators.story';
import { validateAssetsStage } from './validators.assets';
import { validateScriptStage } from './validators.script';
import { validatePerformanceStage } from './validators.performance';
import { validateAudioStage } from './validators.audio';

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
  } else if (stage === 'source_intake') {
    errors = await validateSourceIntakeStage(projectDir);
  } else if (stage === 'topic_gate') {
    errors = await validateTopicGateStage(projectDir);
  } else if (stage === 'reference') {
    errors = await validateReferenceStage(projectDir);
  } else if (stage === 'story') {
    errors = await validateStoryStage(projectDir);
  } else if (stage === 'assets') {
    errors = await validateAssetsStage(projectDir);
  } else if (stage === 'script') {
    errors = await validateScriptStage(projectDir);
  } else if (stage === 'performance') {
    errors = await validatePerformanceStage(projectDir);
  } else if (stage === 'audio') {
    errors = await validateAudioStage(projectDir);
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
