import { describe, expect, it } from 'vitest';
import { formatCompactPath, truncateMiddle } from '../src/sceneforge/remix/lib/remix-display-text';

describe('remix display text', () => {
  it('truncates long strings in the middle', () => {
    expect(truncateMiddle('abcdefghijklmnop', 10)).toMatch(/…/);
  });

  it('formats long paths with filename emphasis', () => {
    const path = '/Users/demo/very/long/folder/name/source-video-final-cut.mp4';
    expect(formatCompactPath(path).length).toBeLessThanOrEqual(36);
    expect(formatCompactPath(path)).toContain('source');
  });
});
