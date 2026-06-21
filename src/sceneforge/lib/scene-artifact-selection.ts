import type { SceneArtifact } from '../../lib/electron-api';
import type { SceneStageId } from '../../types/sceneforge';

function preferredCoreArtifactId(artifacts: SceneArtifact[], stage: SceneStageId): string | null {
  const stageArtifacts = artifacts.filter((artifact) => artifact.stage === stage);
  const coreArtifacts = stageArtifacts.filter((artifact) => artifact.kind === 'final' && artifact.coreAsset);
  if (coreArtifacts.length === 0) {
    return null;
  }
  return (
    coreArtifacts.find((artifact) => artifact.id.endsWith('.design_prompts'))?.id ??
    coreArtifacts.find((artifact) => artifact.id.endsWith('.storyboard_prompt_pack'))?.id ??
    coreArtifacts.find((artifact) => artifact.id.endsWith('.video_prompt_pack_cn'))?.id ??
    coreArtifacts[0]?.id ??
    null
  );
}

export function getPreferredStageArtifactId(
  artifacts: SceneArtifact[],
  stage: SceneStageId,
): string | null {
  return (
    preferredCoreArtifactId(artifacts, stage) ??
    artifacts.find((artifact) => artifact.stage === stage)?.id ??
    null
  );
}

export function resolveStageArtifactSelection(input: {
  artifacts: SceneArtifact[];
  stage: SceneStageId;
  selectedArtifactId: string | null;
}): string | null {
  const current = input.selectedArtifactId
    ? input.artifacts.find((artifact) => artifact.id === input.selectedArtifactId) ?? null
    : null;
  if (current?.stage === input.stage) {
    return current.id;
  }
  return getPreferredStageArtifactId(input.artifacts, input.stage);
}

export function shouldClearAutoSelectedStageArtifact(input: {
  artifacts: SceneArtifact[];
  stage: SceneStageId;
  selectedArtifactId: string | null;
  hasPendingDraft: boolean;
  stageStatus?: string;
}): boolean {
  if (!input.selectedArtifactId) {
    return false;
  }
  const selected = input.artifacts.find((artifact) => artifact.id === input.selectedArtifactId) ?? null;
  if (selected?.stage !== input.stage) {
    return false;
  }
  const preferred = getPreferredStageArtifactId(input.artifacts, input.stage);
  if (!preferred || preferred !== input.selectedArtifactId) {
    return false;
  }
  return input.hasPendingDraft || input.stageStatus === 'revision_requested';
}
