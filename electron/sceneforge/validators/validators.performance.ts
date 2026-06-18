import { validateSingleArtifactSupportStage } from './validators.support-prep';

export async function validatePerformanceStage(projectDir: string) {
  return validateSingleArtifactSupportStage(projectDir, 'performance');
}