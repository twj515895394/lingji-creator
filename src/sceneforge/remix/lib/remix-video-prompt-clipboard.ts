/**
 * 渲染进程可用的剪贴板格式化（勿从 electron 主进程 schema 直接 import，避免 node:crypto 打进客户端）。
 */
export function formatClipboardVideoPrompt(positive: string, negative?: string): string {
  const pos = positive.trim();
  const neg = negative?.trim();
  if (!neg) {
    return pos;
  }
  return `${pos}\n\n【负向约束】\n${neg}`;
}