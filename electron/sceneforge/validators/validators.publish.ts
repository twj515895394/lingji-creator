import { readSceneArtifact } from '../artifacts/scene-artifact-store';
import { parseSceneCopyBlocks } from '../../../src/sceneforge/lib/scene-copy-blocks';
import type { SceneValidationError } from './scene-validator';
import { validateSingleArtifactSupportStage } from './validators.support-prep';

const REQUIRED_COPY_BLOCK_IDS = [
  'cover-landscape-4x3',
  'cover-portrait-3x4',
  'publish-title',
  'publish-description',
  'publish-tags',
] as const;

const COPY_BLOCK_LABELS: Record<(typeof REQUIRED_COPY_BLOCK_IDS)[number], string> = {
  'cover-landscape-4x3': '横版封面提示词（4:3）',
  'cover-portrait-3x4': '竖版封面提示词（3:4）',
  'publish-title': '发布标题',
  'publish-description': '发布简介',
  'publish-tags': '发布标签',
};

/** 封面块常为短提示词，阈值略低于 audio 长文。 */
function hasChineseLedCoverBody(content: string): boolean {
  const chineseChars = (content.match(/[一-鿿]/g) ?? []).length;
  const asciiLetters = (content.match(/[A-Za-z]/g) ?? []).length;
  if (chineseChars < 12) {
    return false;
  }
  if (asciiLetters === 0) {
    return true;
  }
  return chineseChars >= asciiLetters * 0.35;
}

const CHINESE_LED_COVER_BLOCK_IDS = [
  'cover-landscape-4x3',
  'cover-portrait-3x4',
] as const;

function hasMinimalChinese(text: string): boolean {
  return /[一-鿿]/.test(text);
}

export async function validatePublishStage(projectDir: string): Promise<SceneValidationError[]> {
  const errors = await validateSingleArtifactSupportStage(projectDir, 'publish');
  if (errors.some((error) => error.level === 'error')) {
    return errors;
  }

  const { content } = await readSceneArtifact(projectDir, 'publish.publish_notes');
  const parsed = parseSceneCopyBlocks(content);

  for (const warning of parsed.warnings) {
    errors.push({
      code: warning.code,
      level: 'warning',
      message: warning.message,
      suggestion: '请检查 publish_notes 中的 copy-block 标签是否成对且属性完整。',
    });
  }

  if (!parsed.hasCopyBlockMarkup) {
    errors.push({
      code: 'SCENE_PUBLISH_MISSING_COPY_BLOCKS',
      level: 'error',
      message: '发布说明未使用 copy-block 协议，无法提供分块复制。',
      suggestion:
        '请为横版/竖版封面提示词、标题、简介、标签分别使用 <copy-block type="..." id="..." label="..."> 包裹正文。',
    });
    return errors;
  }

  if (parsed.blocks.length === 0) {
    errors.push({
      code: 'SCENE_PUBLISH_COPY_BLOCKS_UNPARSED',
      level: 'error',
      message: '检测到 copy-block 标签，但未解析出可用复制块。',
      suggestion: '确认每个 copy-block 均包含 type、id、label 属性且正文非空。',
    });
    return errors;
  }

  const byId = new Map(parsed.blocks.map((block) => [block.id, block]));
  for (const id of REQUIRED_COPY_BLOCK_IDS) {
    const block = byId.get(id);
    if (!block || !block.body.trim()) {
      errors.push({
        code: `SCENE_PUBLISH_MISSING_${id.toUpperCase().replace(/-/g, '_')}`,
        level: 'error',
        message: `发布说明缺少复制块：${COPY_BLOCK_LABELS[id]}（id=${id}）。`,
        suggestion: `在 publish_notes 中添加 id 为 ${id} 的 copy-block，并写入可直接复制的正文。`,
      });
    }
  }

  for (const id of CHINESE_LED_COVER_BLOCK_IDS) {
    const block = byId.get(id);
    if (!block?.body.trim()) {
      continue;
    }
    if (!hasChineseLedCoverBody(block.body)) {
      const slug = id.toUpperCase().replace(/-/g, '_');
      errors.push({
        code: `SCENE_PUBLISH_${slug}_NOT_CHINESE_LED`,
        level: 'error',
        message: `${COPY_BLOCK_LABELS[id]}不是中文主导正文，当前英文占比过高或缺少中文结构。`,
        suggestion:
          '请用中文分条描述画幅、场景、人物与光线；英文仅保留少量风格锚词（如 Pixar-style、4:3）。',
      });
    }
  }

  for (const id of ['publish-title', 'publish-description', 'publish-tags'] as const) {
    const block = byId.get(id);
    if (!block?.body.trim()) {
      continue;
    }
    if (!hasMinimalChinese(block.body)) {
      const slug = id.toUpperCase().replace(/-/g, '_');
      errors.push({
        code: `SCENE_PUBLISH_${slug}_NOT_CHINESE`,
        level: 'error',
        message: `${COPY_BLOCK_LABELS[id]}须包含中文，勿整段英文。`,
        suggestion: '请用中文撰写标题、简介或标签。',
      });
    }
  }

  return errors;
}