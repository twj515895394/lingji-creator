/** 判断 Markdown 是否包含指定 section（## / ### 标题，可选编号前缀） */
export function hasMarkdownSection(content: string, sectionName: string): boolean {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^#{2,3}\\s+(?:\\d+[.)]?\\s*)?${escaped}\\s*$`,
    'im',
  );
  return pattern.test(content);
}

export function listMissingMarkdownSections(
  content: string,
  sectionNames: readonly string[],
): string[] {
  return sectionNames.filter((name) => !hasMarkdownSection(content, name));
}