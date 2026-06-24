export function truncateMiddle(text: string, maxLength = 28): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  const head = Math.ceil((maxLength - 1) / 2);
  const tail = Math.floor((maxLength - 1) / 2);
  return `${trimmed.slice(0, head)}…${trimmed.slice(trimmed.length - tail)}`;
}

export function formatCompactPath(path: string, maxLength = 36): string {
  const normalized = path.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() ?? normalized;
  if (filename.length >= maxLength - 4) {
    return truncateMiddle(filename, maxLength);
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `…/${truncateMiddle(filename, maxLength - 2)}`;
}
