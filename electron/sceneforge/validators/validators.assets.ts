import { validatePrepSupportStage } from './validators.support-prep';

export async function validateAssetsStage(projectDir: string) {
  return validatePrepSupportStage(projectDir, 'assets');
}