import type { SourceAsset } from '../types';
import type { AssetLibraryStatusFilter } from '../components/AssetFilterBar';

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
    const matchesStatus = status === 'all' ? true : asset.status === status;
    const matchesTag = tag === null ? true : asset.tags.includes(tag);
    return matchesStatus && matchesTag;
  });
}
