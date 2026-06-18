import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const REQUIRED = ['topic_brief'] as const;

function missingError(artifactKey: string): SceneValidationError {
  return {
    code: `SCENE_GATE_MISSING_${artifactKey.toUpperCase()}`,
    level: 'error',
    message: `Topic Gate 缺少产物：${artifactKey}`,
    suggestion: `请在工坊提交 ${artifactKey} 后重新校验。`,
  };
}

export async function validateTopicGateStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of REQUIRED) {
    const artifact = artifacts.find((item) => item.id === `topic_gate.${artifactKey}`);
    if (!artifact || artifact.stage !== 'topic_gate' || artifact.kind !== 'final') {
      errors.push(missingError(artifactKey));
      continue;
    }
    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_GATE_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Topic Gate 产物为空：${artifactKey}`,
        suggestion: '请补充选题说明、评分或风格确认内容。',
      });
    }
  }

  return errors;
}