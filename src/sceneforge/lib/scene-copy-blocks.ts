export interface SceneCopyBlock {
  type: string;
  id: string;
  label: string;
  body: string;
}

export interface SceneCopyBlockWarning {
  code: string;
  message: string;
}

export interface ParsedSceneCopyBlocks {
  blocks: SceneCopyBlock[];
  warnings: SceneCopyBlockWarning[];
  hasCopyBlockMarkup: boolean;
}

const COPY_BLOCK_TAG_RE = /<copy-block\b([^>]*)>([\s\S]*?)<\/copy-block>/gi;
const COPY_BLOCK_OPEN_RE = /<copy-block\b/gi;
const COPY_BLOCK_CLOSE_RE = /<\/copy-block>/gi;

function readAttribute(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
  return match?.[1]?.trim() || null;
}

export function parseSceneCopyBlocks(content: string): ParsedSceneCopyBlocks {
  const warnings: SceneCopyBlockWarning[] = [];
  const blocks: SceneCopyBlock[] = [];
  const hasCopyBlockMarkup = content.includes('<copy-block');

  for (const match of content.matchAll(COPY_BLOCK_TAG_RE)) {
    const attrs = match[1] ?? '';
    const body = (match[2] ?? '').trim();
    const type = readAttribute(attrs, 'type');
    const id = readAttribute(attrs, 'id');
    const label = readAttribute(attrs, 'label');

    if (!type || !id || !label) {
      warnings.push({
        code: 'SCENE_COPY_BLOCK_INVALID',
        message: '检测到 copy-block，但缺少 type / id / label 属性，已忽略该块。',
      });
      continue;
    }

    blocks.push({ type, id, label, body });
  }

  if (!hasCopyBlockMarkup) {
    return { blocks, warnings, hasCopyBlockMarkup };
  }

  const openCount = [...content.matchAll(COPY_BLOCK_OPEN_RE)].length;
  const closeCount = [...content.matchAll(COPY_BLOCK_CLOSE_RE)].length;
  if (openCount !== closeCount) {
    warnings.push({
      code: 'SCENE_COPY_BLOCK_UNBALANCED',
      message: 'copy-block 起始/结束标签不平衡，已回退到旧复制块解析。',
    });
  } else if (blocks.length === 0) {
    warnings.push({
      code: 'SCENE_COPY_BLOCK_PARSE_FAILED',
      message: '检测到 copy-block 标签，但未成功解析出可用复制块，已回退到旧复制块解析。',
    });
  }

  return { blocks, warnings, hasCopyBlockMarkup };
}
