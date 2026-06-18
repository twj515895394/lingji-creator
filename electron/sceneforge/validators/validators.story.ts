import { validatePrepSupportStage } from './validators.support-prep';

export async function validateStoryStage(projectDir: string) {
  return validatePrepSupportStage(projectDir, 'story');
}