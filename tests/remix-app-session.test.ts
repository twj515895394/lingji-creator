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
        remixRoute: REMIX_DEFAULT_ROUTE,
      }),
    ).toEqual({
      projectKind: 'remix',
      remixEntryIntent: 'asset-ingestion',
      remixRoutePath: '/remix/assets',
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
