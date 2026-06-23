import type { SourceAsset } from '../types';
import { AssetCard } from './AssetCard';
import styles from './AssetLibrary.module.css';

interface AssetGridProps {
  assets: SourceAsset[];
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onCreateVariant?: (sourceAssetId: string) => void;
}

export function AssetGrid({
  assets,
  selectedAssetId,
  onSelect,
  onOpenProcessing,
  onCreateVariant,
}: AssetGridProps) {
  return (
    <div className={styles.grid} data-testid="remix-asset-grid">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          selected={selectedAssetId === asset.id}
          onSelect={onSelect}
          onOpenProcessing={onOpenProcessing}
          onCreateVariant={onCreateVariant}
        />
      ))}
    </div>
  );
}
