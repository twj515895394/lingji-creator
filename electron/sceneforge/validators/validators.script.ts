import { validateSingleArtifactSupportStage } from './validators.support-prep';

export async function validateScriptStage(projectDir: string) {
  return validateSingleArtifactSupportStage(projectDir, 'script');
}