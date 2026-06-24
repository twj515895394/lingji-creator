import { describe, expect, it } from 'vitest';
import {
  getRecentProjectDisplayLabel,
  normalizeRecentProjectIdentity,
  resolveRecentProjectOpenOptions,
} from '../src/lib/recent-project-identity';

describe('recent project identity helpers', () => {
  it('renders display labels for script, SceneForge and Remix projects', () => {
    expect(
      getRecentProjectDisplayLabel({ path: '/tmp/a', name: 'a', lastOpenedAt: 1, projectKind: 'script' }),
    ).toBe('普通剪辑');
    expect(
      getRecentProjectDisplayLabel({ path: '/tmp/b', name: 'b', lastOpenedAt: 1, projectKind: 'sceneforge' }),
    ).toBe('SceneForge');
    expect(
      getRecentProjectDisplayLabel({
        path: '/tmp/c',
        name: 'c',
        lastOpenedAt: 1,
        projectKind: 'remix',
        remixEntryIntent: 'asset-ingestion',
      }),
    ).toBe('Remix·资产入库');
    expect(
      getRecentProjectDisplayLabel({
        path: '/tmp/d',
        name: 'd',
        lastOpenedAt: 1,
        projectKind: 'remix',
        remixEntryIntent: 'creation',
      }),
    ).toBe('Remix·二次创作');
  });

  it('normalizes identity defaults safely', () => {
    expect(normalizeRecentProjectIdentity()).toEqual({
      projectKind: 'script',
      remixEntryIntent: null,
      remixRoutePath: null,
    });
    expect(normalizeRecentProjectIdentity({ projectKind: 'remix' })).toEqual({
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
      remixRoutePath: null,
    });
    expect(
      normalizeRecentProjectIdentity({
        projectKind: 'remix',
        remixEntryIntent: 'creation',
        remixRoutePath: '/remix/projects/variant-001',
      }),
    ).toEqual({
      projectKind: 'remix',
      remixEntryIntent: 'creation',
      remixRoutePath: '/remix/projects/variant-001',
    });
  });

  it('resolves recent project open options for remix entries', () => {
    expect(
      resolveRecentProjectOpenOptions({
        path: '/tmp/remix',
        name: 'remix',
        lastOpenedAt: 1,
        projectKind: 'remix',
        remixEntryIntent: 'creation',
        remixRoutePath: '/remix/projects/variant-001',
      }),
    ).toEqual({
      remixRoute: { kind: 'creation', variantId: 'variant-001' },
      remixEntryIntent: 'creation',
    });
    expect(
      resolveRecentProjectOpenOptions({
        path: '/tmp/script',
        name: 'script',
        lastOpenedAt: 1,
        projectKind: 'script',
      }),
    ).toEqual({});
  });

  it('falls back to asset library when remix route path is invalid', () => {
    expect(
      resolveRecentProjectOpenOptions({
        path: '/tmp/remix',
        name: 'remix',
        lastOpenedAt: 1,
        projectKind: 'remix',
        remixEntryIntent: 'asset-ingestion',
        remixRoutePath: '/remix/not-a-real-route',
      }),
    ).toEqual({
      remixRoute: { kind: 'asset-library' },
      remixEntryIntent: 'asset-ingestion',
    });
  });
});
