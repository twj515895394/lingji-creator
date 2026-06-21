import {
  REFERENCE_SECTION_CANONICAL_ZH,
  resolveReferenceSectionFromHeading,
} from './reference-section-headings';

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

/** 提交前整理 reference_notes：统一为中文 ## 小节标题，不改成英文 snake_case。 */
export function normalizeReferenceNotesMarkdown(raw: string): string {
  const text = normalizeNewlines(raw);
  if (!text) return text;

  const lines = text.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (!headingMatch) {
      out.push(line);
      continue;
    }

    const title = headingMatch[2] ?? '';
    const canonical = resolveReferenceSectionFromHeading(title);
    out.push(
      canonical ? `## ${REFERENCE_SECTION_CANONICAL_ZH[canonical]}` : line,
    );
  }

  let result = out.join('\n');

  const hasBoundaryHeading =
    /(^|\n)#{2,4}\s+参考边界\s*$/m.test(result) ||
    /(^|\n)#{2,4}\s+reference_boundary\s*$/im.test(result);
  if (!hasBoundaryHeading) {
    if (/主参考|primary_reference/i.test(result) && /辅助参考|secondary_reference/i.test(result)) {
      result +=
        '\n\n## 参考边界\n\n（由草案正文归纳；提交前请核对主参考与辅助参考角色。）\n';
    }
  }

  return result.trim();
}
