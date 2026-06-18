import { validateSingleArtifactSupportStage } from './validators.support-prep';

export async function validateAudioStage(projectDir: string) {
  return validateSingleArtifactSupportStage(projectDir, 'audio');
}