import type { AppPage } from '../../../lib/electron-api';
import type { RemixAssetLibrarySection } from '../types';

export type RemixAppPage =
  | 'sceneforge-remix-assets'
  | 'sceneforge-remix-asset-processing'
  | 'sceneforge-remix-asset-details'
  | 'sceneforge-remix-creation';

export type RemixRoute =
  | { kind: 'asset-library'; section?: RemixAssetLibrarySection }
  | { kind: 'asset-processing'; sourceAssetId: string }
  | { kind: 'asset-details'; sourceAssetId: string; section?: RemixAssetLibrarySection }
  | { kind: 'creation'; variantId: string };

function normalizeAssetLibrarySection(value: string | null): RemixAssetLibrarySection | undefined {
  if (value === 'published' || value === 'processing' || value === 'failed') {
    return value;
  }
  return undefined;
}

export function isRemixAppPage(page: AppPage): page is RemixAppPage {
  return (
    page === 'sceneforge-remix-assets' ||
    page === 'sceneforge-remix-asset-processing' ||
    page === 'sceneforge-remix-asset-details' ||
    page === 'sceneforge-remix-creation'
  );
}

export function getAppPageForRemixRoute(route: RemixRoute): RemixAppPage {
  switch (route.kind) {
    case 'asset-library':
      return 'sceneforge-remix-assets';
    case 'asset-processing':
      return 'sceneforge-remix-asset-processing';
    case 'asset-details':
      return 'sceneforge-remix-asset-details';
    case 'creation':
      return 'sceneforge-remix-creation';
  }
}

export function buildRemixPath(route: RemixRoute): string {
  switch (route.kind) {
    case 'asset-library':
      return route.section && route.section !== 'published'
        ? `/remix/assets?section=${route.section}`
        : '/remix/assets';
    case 'asset-processing':
      return `/remix/assets/${route.sourceAssetId}/process`;
    case 'asset-details':
      return route.section && route.section !== 'published'
        ? `/remix/assets/${route.sourceAssetId}?section=${route.section}`
        : `/remix/assets/${route.sourceAssetId}`;
    case 'creation':
      return `/remix/projects/${route.variantId}`;
  }
}

export function parseRemixPath(pathname: string): RemixRoute | null {
  const parsed = new URL(pathname, 'https://remix.local');
  const assetLibrarySection = normalizeAssetLibrarySection(parsed.searchParams.get('section'));

  if (parsed.pathname === '/remix/assets') {
    return assetLibrarySection ? { kind: 'asset-library', section: assetLibrarySection } : { kind: 'asset-library' };
  }

  const processingMatch = parsed.pathname.match(/^\/remix\/assets\/([^/]+)\/process$/);
  if (processingMatch) {
    return { kind: 'asset-processing', sourceAssetId: decodeURIComponent(processingMatch[1]) };
  }

  const assetMatch = parsed.pathname.match(/^\/remix\/assets\/([^/]+)$/);
  if (assetMatch) {
    return assetLibrarySection
      ? { kind: 'asset-details', sourceAssetId: decodeURIComponent(assetMatch[1]), section: assetLibrarySection }
      : { kind: 'asset-details', sourceAssetId: decodeURIComponent(assetMatch[1]) };
  }

  const creationMatch = parsed.pathname.match(/^\/remix\/projects\/([^/]+)$/);
  if (creationMatch) {
    return { kind: 'creation', variantId: decodeURIComponent(creationMatch[1]) };
  }

  return null;
}

export function readRemixPathFromHash(hash: string): string | null {
  if (!hash.startsWith('#/remix/')) {
    return null;
  }
  return hash.slice(1);
}
