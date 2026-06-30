import {
  listStoredSourceAssetIds,
  readStoredSourceAsset,
} from '../remix/remix-store';
import type {
  RebuildAssetLibraryInput,
  RebuildAssetLibraryResult,
} from './asset-library-types';
import { AssetLibraryIngestService } from './asset-library-ingest-service';

export class AssetLibraryRebuildService {
  constructor(
    private readonly ingestService: AssetLibraryIngestService = new AssetLibraryIngestService(),
  ) {}

  async rebuildPublishedAssets(
    input: RebuildAssetLibraryInput,
  ): Promise<RebuildAssetLibraryResult> {
    const candidateIds = input.sourceAssetIds?.length
      ? input.sourceAssetIds
      : await listStoredSourceAssetIds(input.projectDir);
    const rebuiltAssetIds: string[] = [];
    const skippedAssetIds: string[] = [];

    for (const sourceAssetId of candidateIds) {
      const document = await readStoredSourceAsset(input.projectDir, sourceAssetId);
      if (document.sourceAsset.status !== 'published_to_library') {
        skippedAssetIds.push(sourceAssetId);
        continue;
      }
      await this.ingestService.upsertSourceAsset(input.projectDir, document, {
        publishedAt: document.sourceAsset.updatedAt,
        status: document.sourceAsset.status,
      });
      rebuiltAssetIds.push(sourceAssetId);
    }

    return {
      rebuiltAssetIds,
      skippedAssetIds,
    };
  }
}
