import { describe, expect, it } from 'vitest';
import { getRemixProjectRootCandidate } from '../src/sceneforge/remix/lib/remix-project-dir';

describe('getRemixProjectRootCandidate', () => {
  it('returns parent project root when selecting the inner sceneforge directory', () => {
    expect(getRemixProjectRootCandidate('/tmp/demo/sceneforge')).toBe('/tmp/demo');
    expect(getRemixProjectRootCandidate('/tmp/demo/sceneforge/')).toBe('/tmp/demo');
  });

  it('supports windows style paths', () => {
    expect(getRemixProjectRootCandidate('C:\\workspace\\demo\\sceneforge')).toBe(
      'C:\\workspace\\demo',
    );
  });

  it('returns null for normal project roots or unrelated folders', () => {
    expect(getRemixProjectRootCandidate('/tmp/demo')).toBeNull();
    expect(getRemixProjectRootCandidate('/tmp/demo/remix')).toBeNull();
  });
});
