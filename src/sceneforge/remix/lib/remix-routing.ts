import type { AppPage } from '../../../lib/electron-api';

export type RemixAppPage =
  | 'sceneforge-remix-assets'
  | 'sceneforge-remix-asset-processing'
  | 'sceneforge-remix-asset-details'
  | 'sceneforge-remix-creation';

export type RemixRoute =
  | { kind: 'asset-library' }
  | { kind: 'asset-processing'; sourceAssetId: string }
  | { kind: 'asset-details'; sourceAssetId: string }
  | { kind: 'creation'; variantId: string };

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
      return '/remix/assets';
    case 'asset-processing':
      return `/remix/assets/${route.sourceAssetId}/process`;
    case 'asset-details':
      return `/remix/assets/${route.sourceAssetId}`;
    case 'creation':
      return `/remix/projects/${route.variantId}`;
  }
}

export function parseRemixPath(pathname: string): RemixRoute | null {
  if (pathname === '/remix/assets') {
    return { kind: 'asset-library' };
  }

  const processingMatch = pathname.match(/^\/remix\/assets\/([^/]+)\/process$/);
  if (processingMatch) {
    return { kind: 'asset-processing', sourceAssetId: decodeURIComponent(processingMatch[1]) };
  }

  const assetMatch = pathname.match(/^\/remix\/assets\/([^/]+)$/);
  if (assetMatch) {
    return { kind: 'asset-details', sourceAssetId: decodeURIComponent(assetMatch[1]) };
  }

  const creationMatch = pathname.match(/^\/remix\/projects\/([^/]+)$/);
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
