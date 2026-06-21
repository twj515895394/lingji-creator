import type {
  SceneArtifactCopyBlock,
  SceneArtifactDisplayModel,
  SceneArtifactDisplaySection,
  SceneArtifactCopyTarget,
} from '../../../src/types/sceneforge';
import { parseSceneCopyBlocks } from '../../../src/sceneforge/lib/scene-copy-blocks';
import type { SceneArtifact } from './scene-artifact-store';

function extractSectionByHeading(content: string, headingPatterns: RegExp[]): string {
  const lines = content.split('\n');
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;
    const title = match[2];
    if (headingPatterns.some((re) => re.test(title))) {
      start = i + 1;
      level = match[1].length;
      break;
    }
  }
  if (start < 0) return '';
  const body: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^(#{1,3})\s+/);
    if (heading && heading[1].length <= level) break;
    body.push(line);
  }
  return body.join('\n').trim();
}

function extractSegmentPrompts(content: string): Array<{ id: string; title: string; text: string }> {
  const lines = content.split('\n');
  const segments: Array<{ id: string; title: string; text: string }> = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let index = 0;

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (!currentTitle && !text) return;
    index += 1;
    const title = currentTitle || `Segment ${String(index).padStart(2, '0')}`;
    const id = `segment-${String(index).padStart(2, '0')}`;
    if (text) segments.push({ id, title, text });
    currentLines = [];
  };

  for (const line of lines) {
    const seg = line.match(/^#{1,3}\s+(Segment\s*\d+|分段\s*\d+|第\s*\d+\s*段)/i);
    if (seg) {
      flush();
      currentTitle = seg[1];
      continue;
    }
    if (currentTitle || segments.length > 0 || line.trim()) {
      currentLines.push(line);
    }
  }
  flush();
  return segments;
}

function makeFullBlock(artifactId: string, label: string, text: string): SceneArtifactCopyBlock {
  return {
    id: `${artifactId}.full`,
    label,
    target: 'full',
    format: 'plain_text',
    text,
  };
}

function truncateExcerpt(text: string, maxChars?: number): string {
  const trimmed = text.trim();
  if (!maxChars || trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}\n…`;
}

function buildFromBlocks(
  artifact: SceneArtifact,
  summary: string,
  blocks: Array<{ id: string; label: string; target: SceneArtifactCopyTarget; text: string }>,
  rawContent: string,
  warnings: SceneArtifactDisplayModel['warnings'],
): SceneArtifactDisplayModel {
  const copyBlocks: SceneArtifactCopyBlock[] = [];
  const sections: SceneArtifactDisplaySection[] = [];

  if (rawContent.trim()) {
    copyBlocks.push(makeFullBlock(artifact.id, '复制全文', rawContent.trim()));
  } else {
    warnings.push({ code: 'SCENE_DISPLAY_EMPTY_CONTENT', message: '产物内容为空，仅提供空复制块。' });
    copyBlocks.push(makeFullBlock(artifact.id, '复制全文', ''));
  }

  for (const block of blocks) {
    if (!block.text.trim()) {
      warnings.push({
        code: 'SCENE_DISPLAY_EMPTY_BLOCK',
        message: `复制块为空：${block.label}`,
      });
    }
    copyBlocks.push({
      id: block.id,
      label: block.label,
      target: block.target,
      format: 'plain_text',
      text: block.text,
    });
    sections.push({
      id: block.id,
      title: block.label,
      kind: block.target === 'prompt' ? 'prompt' : block.target === 'full' ? 'overview' : 'section',
      copyBlockIds: [block.id],
    });
  }

  if (sections.length === 0 && rawContent.trim()) {
    sections.push({
      id: `${artifact.id}.overview`,
      title: '概览',
      kind: 'overview',
      copyBlockIds: [`${artifact.id}.full`],
    });
  }

  return {
    artifactId: artifact.id,
    displayModelVersion: 1,
    title: artifact.title,
    summary,
    sections,
    copyBlocks,
    warnings,
  };
}

function parseDesignArtifact(artifact: SceneArtifact, content: string): SceneArtifactDisplayModel {
  const warnings: SceneArtifactDisplayModel['warnings'] = [];
  const [, artifactKey] = artifact.id.split('.');

  if (artifactKey === 'design_prompts') {
    const blocks = [
      {
        id: `${artifact.id}.character`,
        label: '角色提示词',
        target: 'section' as const,
        text:
          extractSectionByHeading(content, [/角色/i, /character/i]) ||
          extractSectionByHeading(content, [/人物/i]),
      },
      {
        id: `${artifact.id}.scene`,
        label: '场景提示词',
        target: 'section' as const,
        text: extractSectionByHeading(content, [/场景/i, /scene/i, /环境/i]),
      },
      {
        id: `${artifact.id}.prop`,
        label: '道具提示词',
        target: 'section' as const,
        text: extractSectionByHeading(content, [/道具/i, /prop/i]),
      },
      {
        id: `${artifact.id}.master_reference`,
        label: '总参考图提示词',
        target: 'section' as const,
        text: extractSectionByHeading(content, [/总参考/i, /master/i, /reference/i]),
      },
    ];
    if (blocks.every((b) => !b.text.trim())) {
      warnings.push({
        code: 'SCENE_DISPLAY_MISSING_SECTIONS',
        message: '未识别到角色/场景/道具/总参考章节，已回退为全文复制。',
      });
    }
    return buildFromBlocks(
      artifact,
      '设定图提示词包，含角色、场景、道具与总参考图片段。',
      blocks,
      content,
      warnings,
    );
  }

  const keyToBlock: Record<string, { label: string; blockKey: string }> = {
    character_prompts: { label: '角色提示词', blockKey: 'character' },
    scene_prompts: { label: '场景提示词', blockKey: 'scene' },
    prop_prompts: { label: '道具提示词', blockKey: 'prop' },
    master_reference_prompt: { label: '总参考图提示词', blockKey: 'master_reference' },
  };
  const spec = keyToBlock[artifactKey ?? ''];
  if (spec) {
    return buildFromBlocks(
      artifact,
      spec.label,
      [
        {
          id: `${artifact.id}.${spec.blockKey}`,
          label: spec.label,
          target: 'section',
          text: content.trim(),
        },
      ],
      content,
      warnings,
    );
  }

  warnings.push({ code: 'SCENE_DISPLAY_UNKNOWN_ARTIFACT', message: '未知 Design 产物，使用全文复制。' });
  return buildFromBlocks(artifact, artifact.title, [], content, warnings);
}

function parseStoryboardArtifact(artifact: SceneArtifact, content: string): SceneArtifactDisplayModel {
  const warnings: SceneArtifactDisplayModel['warnings'] = [];
  const [, artifactKey] = artifact.id.split('.');

  if (artifactKey === 'storyboard_prompt_pack') {
    const parsedCopyBlocks = parseSceneCopyBlocks(content);
    warnings.push(...parsedCopyBlocks.warnings);
    if (parsedCopyBlocks.blocks.length > 0) {
      return buildFromBlocks(
        artifact,
        '故事板提示词包。',
        parsedCopyBlocks.blocks.map((block) => ({
          id: `${artifact.id}.${block.id}`,
          label: `复制${block.label}`,
          target: 'prompt' as const,
          text: block.body,
        })),
        content,
        warnings,
      );
    }

    const segments = extractSegmentPrompts(content);
    const blocks: Array<{ id: string; label: string; target: 'section' | 'prompt'; text: string }> = [
      {
        id: `${artifact.id}.pack_overview`,
        label: '故事板包概览',
        target: 'section',
        text:
          extractSectionByHeading(content, [/概览/i, /overview/i, /pack/i]) ||
          content.split('\n').slice(0, 12).join('\n').trim(),
      },
    ];
    for (const seg of segments) {
      blocks.push({
        id: `${artifact.id}.${seg.id}`,
        label: `复制 ${seg.title}`,
        target: 'prompt',
        text: seg.text,
      });
    }
    if (segments.length === 0) {
      warnings.push({
        code: 'SCENE_DISPLAY_MISSING_SEGMENTS',
        message: '未识别 Segment 章节，segment 复制块可能为空。',
      });
    }
    return buildFromBlocks(artifact, '故事板提示词包。', blocks, content, warnings);
  }

  const keyToBlock: Record<string, { label: string; blockKey: string }> = {
    control_board_prompts: { label: '控制板提示词', blockKey: 'control_board' },
    style_board_prompts: { label: '风格板提示词', blockKey: 'style_board' },
    master_board_prompt: { label: '总故事板提示词', blockKey: 'master_board' },
  };
  const spec = keyToBlock[artifactKey ?? ''];
  if (spec) {
    if (artifactKey === 'control_board_prompts' || artifactKey === 'style_board_prompts') {
      const parsedCopyBlocks = parseSceneCopyBlocks(content);
      warnings.push(...parsedCopyBlocks.warnings);
      if (parsedCopyBlocks.blocks.length > 0) {
        return buildFromBlocks(
          artifact,
          spec.label,
          parsedCopyBlocks.blocks.map((block) => ({
            id: `${artifact.id}.${block.id}`,
            label: `复制${block.label}`,
            target: 'prompt' as const,
            text: block.body,
          })),
          content,
          warnings,
        );
      }
    }
    return buildFromBlocks(
      artifact,
      spec.label,
      [
        {
          id: `${artifact.id}.${spec.blockKey}`,
          label: spec.label,
          target: 'section',
          text: content.trim(),
        },
      ],
      content,
      warnings,
    );
  }

  warnings.push({ code: 'SCENE_DISPLAY_UNKNOWN_ARTIFACT', message: '未知 Storyboard 产物，使用全文复制。' });
  return buildFromBlocks(artifact, artifact.title, [], content, warnings);
}

function parseVideoPromptsArtifact(artifact: SceneArtifact, content: string): SceneArtifactDisplayModel {
  const warnings: SceneArtifactDisplayModel['warnings'] = [];
  const [, artifactKey] = artifact.id.split('.');

  if (artifactKey === 'video_prompt_pack_en') {
    if (!content.trim()) {
      warnings.push({
        code: 'SCENE_DISPLAY_OPTIONAL_EN_MISSING',
        message: '英文视频提示词包为空或未提供。',
      });
    }
    return buildFromBlocks(
      artifact,
      '英文视频提示词包（可选）。',
      [
        {
          id: `${artifact.id}.video_pack_en`,
          label: '英文视频提示词包',
          target: 'section',
          text: content.trim(),
        },
      ],
      content,
      warnings,
    );
  }

  if (artifactKey === 'video_prompt_pack_cn') {
    const parsedCopyBlocks = parseSceneCopyBlocks(content);
    warnings.push(...parsedCopyBlocks.warnings);
    if (parsedCopyBlocks.blocks.length > 0) {
      return buildFromBlocks(
        artifact,
        '中文视频分段提示词包。',
        parsedCopyBlocks.blocks.map((block) => ({
          id: `${artifact.id}.${block.id}`,
          label: `复制${block.label}`,
          target: 'prompt' as const,
          text: block.body,
        })),
        content,
        warnings,
      );
    }

    const segments = extractSegmentPrompts(content);
    const blocks: Array<{ id: string; label: string; target: 'section' | 'prompt'; text: string }> = [
      {
        id: `${artifact.id}.video_pack_cn`,
        label: '中文视频提示词包',
        target: 'section',
        text: content.trim(),
      },
    ];
    for (const seg of segments) {
      blocks.push({
        id: `${artifact.id}.${seg.id}`,
        label: `复制 ${seg.title}`,
        target: 'prompt',
        text: seg.text,
      });
    }
    return buildFromBlocks(artifact, '中文视频分段提示词包。', blocks, content, warnings);
  }

  if (artifactKey === 'video_prompt_pack') {
    const segments = extractSegmentPrompts(content);
    const blocks: Array<{ id: string; label: string; target: 'section' | 'prompt'; text: string }> = [];
    for (const seg of segments) {
      blocks.push({
        id: `${artifact.id}.${seg.id}`,
        label: `复制 ${seg.title}`,
        target: 'prompt',
        text: seg.text,
      });
    }
    if (segments.length === 0) {
      warnings.push({
        code: 'SCENE_DISPLAY_MISSING_SEGMENTS',
        message: '未识别 Segment 结构，已保留全文复制。',
      });
    }
    return buildFromBlocks(artifact, '完整视频提示词包。', blocks, content, warnings);
  }

  warnings.push({ code: 'SCENE_DISPLAY_UNKNOWN_ARTIFACT', message: '未知 Video 产物，使用全文复制。' });
  return buildFromBlocks(artifact, artifact.title, [], content, warnings);
}

function parsePublishArtifact(artifact: SceneArtifact, content: string): SceneArtifactDisplayModel {
  const warnings: SceneArtifactDisplayModel['warnings'] = [];
  const parsedCopyBlocks = parseSceneCopyBlocks(content);
  warnings.push(...parsedCopyBlocks.warnings);

  if (parsedCopyBlocks.blocks.length > 0) {
    return buildFromBlocks(
      artifact,
      '发布说明：封面提示词与平台元数据分块复制。',
      parsedCopyBlocks.blocks.map((block) => ({
        id: `${artifact.id}.${block.id}`,
        label: `复制${block.label}`,
        target: (block.type === 'cover_prompt' ? 'prompt' : 'section') as SceneArtifactCopyTarget,
        text: block.body,
      })),
      content,
      warnings,
    );
  }

  warnings.push({
    code: 'SCENE_PUBLISH_DISPLAY_NO_COPY_BLOCKS',
    message: '未解析到 copy-block，已保留全文复制。',
  });
  return buildFromBlocks(
    artifact,
    '发布说明',
    [makeFullBlock(artifact.id, '全文', content.trim())],
    content,
    warnings,
  );
}

export function buildSceneArtifactDisplayModel(
  artifact: SceneArtifact,
  content: string,
): SceneArtifactDisplayModel | null {
  if (artifact.kind !== 'final') {
    return null;
  }

  if (artifact.stage === 'publish' && artifact.id === 'publish.publish_notes') {
    return parsePublishArtifact(artifact, content);
  }

  if (!artifact.coreAsset) {
    return null;
  }

  try {
    if (artifact.stage === 'design') {
      return parseDesignArtifact(artifact, content);
    }
    if (artifact.stage === 'storyboard') {
      return parseStoryboardArtifact(artifact, content);
    }
    if (artifact.stage === 'video_prompts') {
      return parseVideoPromptsArtifact(artifact, content);
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Display model parse failed';
    return buildFromBlocks(
      artifact,
      artifact.title,
      [],
      content,
      [{ code: 'SCENE_DISPLAY_PARSE_FAILED', message }],
    );
  }
}

export function buildSceneArtifactDisplayExcerpt(
  displayModel: SceneArtifactDisplayModel,
  maxChars?: number,
): string {
  const richBlocks = displayModel.copyBlocks.filter(
    (block) => block.target !== 'full' && block.text.trim(),
  );

  if (richBlocks.length > 0) {
    return truncateExcerpt(
      richBlocks
        .map((block) => `## ${block.label}\n\n${block.text.trim()}`)
        .join('\n\n'),
      maxChars,
    );
  }

  return truncateExcerpt(displayModel.summary.trim(), maxChars);
}

export function defaultCoreArtifactCopyMetadata(): {
  displayModelVersion: 1;
  copyTargets: SceneArtifactCopyTarget[];
  primaryCopyTarget: 'full';
} {
  return {
    displayModelVersion: 1,
    copyTargets: ['full', 'section', 'prompt'],
    primaryCopyTarget: 'full',
  };
}
