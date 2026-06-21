import { listSceneArtifacts, readSceneArtifact } from '../artifacts/scene-artifact-store';
import type { SceneValidationError } from './scene-validator';
import {
  CHARACTER_PROMPT_SECTION_CANONICAL_ZH,
  CHARACTER_PROMPT_REQUIRED_SECTIONS,
  listMissingCharacterPromptMarkdownSections,
  normalizeCharacterPromptsMarkdown,
} from './character-prompt-section-headings';
import {
  DESIGN_PROMPT_SECTION_CANONICAL_ZH,
  DESIGN_PROMPTS_REQUIRED_SECTIONS,
  listMissingDesignPromptMarkdownSections,
  normalizeDesignPromptsMarkdown,
} from './design-prompt-section-headings';

const DESIGN_REQUIRED_ARTIFACTS = [
  'design_prompts',
  'character_prompts',
  'scene_prompts',
  'prop_prompts',
  'master_reference_prompt',
] as const;

const DESIGN_FORBIDDEN_POSTER_MARKERS = [
  'single portrait',
  'cinematic portrait',
  'hero poster',
  'character poster',
] as const;

const SCENE_PROMPTS_REQUIRED_MARKERS = [
  '主场景空间布局',
  '角色默认站位',
  '核心道具位置',
  '道具状态矩阵',
  '出入口与运动轴线',
] as const;

function toErrorCode(artifactKey: string): string {
  return `SCENE_DESIGN_MISSING_${artifactKey.toUpperCase()}`;
}

export async function validateDesignStage(projectDir: string): Promise<SceneValidationError[]> {
  const artifacts = await listSceneArtifacts(projectDir);
  const errors: SceneValidationError[] = [];

  for (const artifactKey of DESIGN_REQUIRED_ARTIFACTS) {
    const artifact = artifacts.find((item) => item.id === `design.${artifactKey}`);
    if (
      !artifact ||
      artifact.stage !== 'design' ||
      artifact.kind !== 'final' ||
      artifact.role !== 'core_generation_asset' ||
      !artifact.coreAsset
    ) {
      errors.push({
        code: toErrorCode(artifactKey),
        level: 'error',
        message: `Design 阶段缺少核心产物：${artifactKey}`,
        suggestion: `请提交 ${artifactKey}.md 后重新校验。`,
      });
      continue;
    }

    const { content } = await readSceneArtifact(projectDir, artifact.id);
    if (!content.trim()) {
      errors.push({
        code: `SCENE_DESIGN_EMPTY_${artifactKey.toUpperCase()}`,
        level: 'error',
        message: `Design 核心产物为空：${artifactKey}`,
        suggestion: `请补充 ${artifactKey}.md 的提示词内容。`,
      });
      continue;
    }

    if (artifactKey === 'character_prompts') {
      const characterContent = normalizeCharacterPromptsMarkdown(content);
      const missingSections = listMissingCharacterPromptMarkdownSections(
        characterContent,
        CHARACTER_PROMPT_REQUIRED_SECTIONS,
      );
      if (missingSections.length > 0) {
        const zhLabels = missingSections.map(
          (key) => CHARACTER_PROMPT_SECTION_CANONICAL_ZH[key],
        );
        errors.push({
          code: 'SCENE_DESIGN_CHARACTER_PROMPTS_MISSING_SECTIONS',
          level: 'error',
          message: `角色提示词缺少角色说明书板必备分区：${zhLabels.join('、')}`,
          suggestion:
            '请按角色说明书板重写 character_prompts，至少补齐多视角、表情系统、动作姿态、关键道具交互、比例对照和边界约束。',
        });
      }

      const chineseChars = (characterContent.match(/[\u4e00-\u9fff]/g) ?? []).length;
      const asciiLetters = (characterContent.match(/[A-Za-z]/g) ?? []).length;
      if (chineseChars < 80 || chineseChars * 1.2 < asciiLetters) {
        errors.push({
          code: 'SCENE_DESIGN_CHARACTER_PROMPTS_NOT_CHINESE_LED',
          level: 'error',
          message: '角色提示词必须中文主导，当前文本英文占比过高或中文结构过轻。',
          suggestion:
            '请用中文承担结构、描述、约束和 copy-ready 主体，英文仅保留为少量锚词或板式名词。',
        });
      }

      const lowerContent = characterContent.toLowerCase();
      const forbiddenMarkers = DESIGN_FORBIDDEN_POSTER_MARKERS.filter((marker) =>
        lowerContent.includes(marker),
      );
      if (forbiddenMarkers.length > 0) {
        errors.push({
          code: 'SCENE_DESIGN_CHARACTER_PROMPTS_POSTER_DRIFT',
          level: 'error',
          message: `角色提示词出现海报/肖像导向词：${forbiddenMarkers.join('、')}`,
          suggestion:
            '请把 primary target 改回角色说明书板 / character bible sheet，而不是 single portrait 或 poster。',
        });
      }
    }

    if (artifactKey === 'design_prompts') {
      const designContent = normalizeDesignPromptsMarkdown(content);
      const missingSections = listMissingDesignPromptMarkdownSections(
        designContent,
        DESIGN_PROMPTS_REQUIRED_SECTIONS,
      );
      if (missingSections.length > 0) {
        const zhLabels = missingSections.map((key) => DESIGN_PROMPT_SECTION_CANONICAL_ZH[key]);
        errors.push({
          code: 'SCENE_DESIGN_PROMPTS_MISSING_SYSTEM_MARKERS',
          level: 'error',
          message: `设定总览提示词缺少关键设计系统小节：${zhLabels.join('、')}`,
          suggestion:
            '请用中文 ## 小节补齐：视觉语言、角色设计、场景设计、道具设计、空间连续性、道具状态机、场面调度、节奏契约、分段节奏配置、镜头密度期望、边界规则。',
        });
      }

      if (
        !/segment_duration_seconds\s*:\s*(5|6|8|10|15)\b/i.test(designContent) &&
        !/段长\s*[:：]\s*(5|6|8|10|15)\s*秒?/i.test(designContent) &&
        !/单段时长\s*[:：]\s*(5|6|8|10|15)/i.test(designContent)
      ) {
        errors.push({
          code: 'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_SEGMENT_DURATION',
          level: 'error',
          message: '设定总览提示词缺少正式段长约束，必须显式写出段长（如 segment_duration_seconds 或「段长：10秒」）。',
          suggestion:
            '请在「节奏契约」中明确填写段长，并与 topic_gate 选定的 5 / 6 / 8 / 10 / 15 秒段长保持一致。',
        });
      }

      if (
        !/5s|5秒/.test(designContent) ||
        !/6s|6秒/.test(designContent) ||
        !/8s|8秒/.test(designContent) ||
        !/10s|10秒/.test(designContent) ||
        !/15s|15秒/.test(designContent)
      ) {
        errors.push({
          code: 'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_DENSITY_TABLE',
          level: 'error',
          message: '设定总览提示词缺少覆盖 5 / 6 / 8 / 10 / 15 秒的镜头密度期望表。',
          suggestion:
            '请在「镜头密度期望」中为 5 秒、6 秒、8 秒、10 秒、15 秒段分别写明镜头密度区间与节奏建议。',
        });
      }

      if (
        !/shots_must_not_cross_segment_boundary|镜头不得跨\s*segment\s*边界|镜头不得跨段/i.test(
          designContent,
        )
      ) {
        errors.push({
          code: 'SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_BOUNDARY_RULE',
          level: 'error',
          message: '设定总览提示词缺少“镜头不得跨 segment 边界”的正式规则。',
          suggestion:
            '请在「边界规则」中明确写出镜头不得跨段（可写 shots_must_not_cross_segment_boundary 或等价中文规则）。',
        });
      }
    }

    if (artifactKey === 'scene_prompts') {
      const missingMarkers = SCENE_PROMPTS_REQUIRED_MARKERS.filter(
        (marker) => !content.includes(marker),
      );
      if (missingMarkers.length > 0) {
        errors.push({
          code: 'SCENE_DESIGN_SCENE_PROMPTS_MISSING_LAYOUT_MARKERS',
          level: 'error',
          message: `全场景资产总参考图提示词缺少关键空间/站位 marker：${missingMarkers.join('、')}`,
          suggestion:
            '请按全场景资产总参考图重写 scene_prompts，至少补齐主场景空间布局、角色默认站位、核心道具位置、道具状态矩阵、出入口与运动轴线。',
        });
      }
    }
  }

  return errors;
}
