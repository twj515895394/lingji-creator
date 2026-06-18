import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import { validateIntakeAdaptationGate } from './validators.hitl-gate';

const REQUIRED = ['source_material'] as const;

function missingError(artifactKey: string): SceneValidationError {
  return {
    code: `SCENE_INTAKE_MISSING_${artifactKey.toUpperCase()}`,
    level: 'error',
    message: `Source Intake 缺少产物：${artifactKey}`,
    suggestion: `请在工坊提交 ${artifactKey} 内容后重新校验。`,
  };
}

export async function validateSourceIntakeStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of REQUIRED) {
    const artifact = artifacts.find((item) => item.id === `source_intake.${artifactKey}`);
    if (!artifact || artifact.stage !== 'source_intake' || artifact.kind !== 'final') {
      errors.push(missingError(artifactKey));
      continue;
    }
    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_INTAKE_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Source Intake 产物为空：${artifactKey}`,
        suggestion: '请补充源材料说明或解析结果。',
      });
    }
  }

  const adaptationGate = await validateIntakeAdaptationGate(projectDir);
  if (!adaptationGate.ok) {
    errors.push({
      code: 'SCENE_INTAKE_ADAPTATION_PENDING',
      level: 'error',
      message: adaptationGate.message ?? '改编方向未确认',
      suggestion: '在工坊改编方向卡片中选择一项并提交确认。',
    });
  }

  return errors;
}