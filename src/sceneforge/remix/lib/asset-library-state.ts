import type { RemixAssetLibrarySection, RemixSourceAssetStatus, SourceAsset } from '../types';
import type { AssetLibraryStatusFilter } from '../components/AssetFilterBar';

export function getStatusesForAssetLibrarySection(
  section: RemixAssetLibrarySection,
): RemixSourceAssetStatus[] {
  switch (section) {
    case 'published':
      return ['published_to_library'];
    case 'processing':
      return ['draft', 'processing', 'ready_for_review'];
    case 'failed':
      return ['failed'];
    default:
      return ['published_to_library'];
  }
}

export function getAssetLibraryAvailableTags(assets: SourceAsset[]): string[] {
  return Array.from(new Set(assets.flatMap((asset) => asset.tags))).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function filterAssetLibraryAssets(
  assets: SourceAsset[],
  status: AssetLibraryStatusFilter,
  tag: string | null,
): SourceAsset[] {
  return assets.filter((asset) => {
    const matchesStatus = getStatusesForAssetLibrarySection(status).includes(asset.status);
    const matchesTag = tag === null ? true : asset.tags.includes(tag);
    return matchesStatus && matchesTag;
  });
}
