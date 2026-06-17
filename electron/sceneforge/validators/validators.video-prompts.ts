import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';

const VIDEO_REQUIRED_ARTIFACTS = ['video_prompt_pack', 'video_prompt_pack_cn'] as const;

function toMissingErrorCode(artifactKey: string): string {
  return `SCENE_VIDEO_PROMPTS_MISSING_${artifactKey.toUpperCase()}`;
}

export async function validateVideoPromptsStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];
  const contents: string[] = [];

  for (const artifactKey of VIDEO_REQUIRED_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `video_prompts.${artifactKey}`);
    if (
      !artifact ||
      artifact.stage !== 'video_prompts' ||
      artifact.kind !== 'final' ||
      artifact.role !== 'core_generation_asset' ||
      !artifact.coreAsset
    ) {
      errors.push({
        code: toMissingErrorCode(artifactKey),
        level: 'error',
        message: `Video Prompts 阶段缺少核心产物：${artifactKey}`,
        suggestion: `请提交 ${artifactKey}.md 后重新校验。`,
      });
      continue;
    }

    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_VIDEO_PROMPTS_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Video Prompts 核心产物为空：${artifactKey}`,
        suggestion: `请补充 ${artifactKey}.md 的提示词内容。`,
      });
      continue;
    }
    contents.push(content);
  }

  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const combined = contents.join('\n');
  if (!/segment/i.test(combined)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_SEGMENT_STRUCTURE',
      level: 'error',
      message: 'Video Prompts 缺少 Segment 基本结构。',
      suggestion: '请至少包含一个 Segment 段落。',
    });
  }
  if (!/audio/i.test(combined)) {
    errors.push({
      code: 'SCENE_VIDEO_PROMPTS_MISSING_AUDIO_EXECUTION',
      level: 'error',
      message: 'Video Prompts 缺少 Audio execution 基本结构。',
      suggestion: '请为视频提示词补充 Audio 或声音执行说明。',
    });
  }

  return errors;
}
