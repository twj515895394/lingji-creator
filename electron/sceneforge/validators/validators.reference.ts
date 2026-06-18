import { validatePrepSupportStage } from './validators.support-prep';

export async function validateReferenceStage(projectDir: string) {
  return validatePrepSupportStage(projectDir, 'reference');
}