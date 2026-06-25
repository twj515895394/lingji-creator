import { describe, expect, it } from 'vitest';
import {
  REMIX_DEFAULT_ROUTE,
  resolveRemixRecentProjectIdentity,
} from '../src/lib/remix-app-session';

describe('remix app session helpers', () => {
  it('builds remix recent identity for asset library and creation pages', () => {
    expect(
      resolveRemixRecentProjectIdentity({
        page: 'sceneforge-remix-assets',
        remixEntryIntent: 'asset-ingestion',
        remixRoute: { kind: 'asset-library', section: 'processing' },
      }),
    ).toEqual({
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
      remixRoutePath: '/remix/assets?section=processing',
    });

    expect(
      resolveRemixRecentProjectIdentity({
        page: 'sceneforge-remix-creation',
        remixEntryIntent: 'asset-ingestion',
        remixRoute: { kind: 'creation', variantId: 'variant-001' },
      }),
    ).toEqual({
      projectKind: 'remix',
      remixEntryIntent: 'creation',
      remixRoutePath: '/remix/projects/variant-001',
    });
  });

  it('returns null for pages that should not persist remix route', () => {
    expect(
      resolveRemixRecentProjectIdentity({
        page: 'welcome',
        remixEntryIntent: 'asset-ingestion',
        remixRoute: REMIX_DEFAULT_ROUTE,
      }),
    ).toBeNull();
  });
});

import {
  buildRecentProjectIdentityForOpen,
  shouldRejectRemixOpenOnProject,
} from '../src/lib/remix-app-session';

describe('remix open project helpers', () => {
  it('builds remix identity when opening with remix route', () => {
    expect(
      buildRecentProjectIdentityForOpen(
        { remixRoute: { kind: 'asset-library' }, remixEntryIntent: 'asset-ingestion' },
        { type: 'sceneforge' } as import('../src/lib/project-persistence').ProjectData,
      ),
    ).toEqual({
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
      remixRoutePath: null,
    });
  });

  it('rejects remix open on script projects', () => {
    expect(shouldRejectRemixOpenOnProject({} as import('../src/lib/project-persistence').ProjectData)).toBe(true);
    expect(shouldRejectRemixOpenOnProject({ type: 'sceneforge' } as import('../src/lib/project-persistence').ProjectData)).toBe(false);
  });
});
