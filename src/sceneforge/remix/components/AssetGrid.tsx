import type { RemixAssetProcessingSnapshot, SourceAsset } from '../types';
import { FailedAssetCard } from './FailedAssetCard';
import { ProcessingAssetTaskCard } from './ProcessingAssetTaskCard';
import { PublishedAssetCard } from './PublishedAssetCard';
import styles from './AssetLibrary.module.css';

interface AssetGridProps {
  assets: SourceAsset[];
  snapshotsByAssetId?: Record<string, RemixAssetProcessingSnapshot>;
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onCreateVariant?: (sourceAssetId: string) => void;
  onRetrySourceAsset?: (sourceAssetId: string) => void;
  onDeleteSourceAsset?: (sourceAssetId: string) => void;
}

export function AssetGrid({
  assets,
  snapshotsByAssetId = {},
  selectedAssetId,
  onSelect,
  onOpenProcessing,
  onCreateVariant,
  onRetrySourceAsset,
  onDeleteSourceAsset,
}: AssetGridProps) {
  return (
    <div className={styles.grid} data-testid="remix-asset-grid">
      {assets.map((asset) => {
        const snapshot = snapshotsByAssetId[asset.id];
        if ((asset.status === 'draft' || asset.status === 'processing' || asset.status === 'ready_for_review') && snapshot) {
          return (
            <ProcessingAssetTaskCard
              key={asset.id}
              snapshot={snapshot}
              selected={selectedAssetId === asset.id}
              onSelect={onSelect}
              onOpenProcessing={onOpenProcessing}
              onDeleteSourceAsset={onDeleteSourceAsset}
            />
          );
        }

        if (asset.status === 'failed' && snapshot) {
          return (
            <FailedAssetCard
              key={asset.id}
              snapshot={snapshot}
              selected={selectedAssetId === asset.id}
              onSelect={onSelect}
              onOpenProcessing={onOpenProcessing}
              onRetrySourceAsset={onRetrySourceAsset}
              onDeleteSourceAsset={onDeleteSourceAsset}
            />
          );
        }

        return (
          <PublishedAssetCard
            key={asset.id}
            asset={asset}
            selected={selectedAssetId === asset.id}
            onSelect={onSelect}
            onCreateVariant={onCreateVariant}
          />
        );
      })}
    </div>
  );
}
