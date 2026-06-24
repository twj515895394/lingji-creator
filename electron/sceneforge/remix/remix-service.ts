import type {
  RemixAssetLibrarySnapshot,
  RemixCreationWorkspaceSnapshot,
} from '../../../src/sceneforge/remix/types';
import type {
  CreateSourceAssetFromImportInput,
  CreateVariantFromSourceAssetInput,
  DeleteVariantInput,
  DuplicateVariantInput,
  ExportPromptBundleInput,
  ExportPromptBundleResult,
  ListVariantsForSourceAssetInput,
  ListSourceAssetsInput,
  RegisterEditedKeyframeInput,
  RenameVariantInput,
  RemixSourceAssetRefInput,
  RemixVariantRefInput,
  RunSourceAssetStageInput,
  UpdateSourceAssetMetadataInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
} from './remix-ipc-types';
import { RemixKeyframeService } from './remix-keyframe-service';
import {
  buildSourceAssetSnapshot,
  buildSourceAssetSummary,
  listStoredSourceAssetIds,
  readStoredSourceAsset,
  writeStoredSourceAsset,
} from './remix-store';
import { RemixSegmentationService } from './remix-segmentation-service';
import { RemixSourceAssetService, type RemixSourceAssetServiceOptions } from './remix-source-asset-service';
import { RemixUnderstandingService } from './remix-understanding-service';
import { RemixVariantService } from './remix-variant-service';
import { RemixStrategyService } from './remix-strategy-service';
import { RemixDesignService } from './remix-design-service';
import { RemixKeyframePromptService } from './remix-keyframe-prompt-service';
import { RemixEditedKeyframeService } from './remix-edited-keyframe-service';
import { RemixSeedancePromptService } from './remix-seedance-prompt-service';
import { assertPublishReady } from './remix-validators';

export class RemixService {
  private readonly sourceAssetService;

  private readonly segmentationService;

  private readonly keyframeService;

  private readonly understandingService;

  private readonly variantService;

  private readonly strategyService;

  private readonly designService;

  private readonly keyframePromptService;

  private readonly editedKeyframeService;

  private readonly seedancePromptService;

  constructor(options: RemixSourceAssetServiceOptions = {}) {
    this.sourceAssetService = new RemixSourceAssetService(options);
    this.segmentationService = new RemixSegmentationService();
    this.keyframeService = new RemixKeyframeService();
    this.understandingService = new RemixUnderstandingService();
    this.variantService = new RemixVariantService(options);
    this.strategyService = new RemixStrategyService();
    this.designService = new RemixDesignService();
    this.keyframePromptService = new RemixKeyframePromptService();
    this.editedKeyframeService = new RemixEditedKeyframeService();
    this.seedancePromptService = new RemixSeedancePromptService();
  }

  async listSourceAssets(input: ListSourceAssetsInput): Promise<RemixAssetLibrarySnapshot> {
    const sourceAssetIds = await listStoredSourceAssetIds(input.projectDir);
    const sourceAssets = await Promise.all(
      sourceAssetIds.map(async (sourceAssetId) => {
        const document = await readStoredSourceAsset(input.projectDir, sourceAssetId);
        return buildSourceAssetSummary(document.sourceAsset);
      }),
    );
    return { sourceAssets: sourceAssets.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) };
  }

  async getSourceAsset(input: RemixSourceAssetRefInput) {
    const snapshot = buildSourceAssetSnapshot(await readStoredSourceAsset(input.projectDir, input.sourceAssetId));
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async updateSourceAssetMetadata(input: UpdateSourceAssetMetadataInput) {
    const document = await this.sourceAssetService.updateMetadata(input);
    const snapshot = buildSourceAssetSnapshot(document);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async createSourceAssetFromImport(
    input: CreateSourceAssetFromImportInput,
  ) {
    const { document } = await this.sourceAssetService.createFromImport(input);
    return buildSourceAssetSnapshot(document);
  }

  async runSourceSegmentation(input: RunSourceAssetStageInput) {
    return buildSourceAssetSnapshot(await this.segmentationService.run(input.projectDir, input.sourceAssetId));
  }

  async runSourceKeyframes(input: RunSourceAssetStageInput) {
    return buildSourceAssetSnapshot(await this.keyframeService.run(input.projectDir, input.sourceAssetId));
  }

  async runSourceUnderstanding(
    input: RunSourceAssetStageInput,
  ) {
    return buildSourceAssetSnapshot(await this.understandingService.run(input.projectDir, input.sourceAssetId));
  }

  async publishSourceAssetToLibrary(
    input: RemixSourceAssetRefInput,
  ) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    assertPublishReady(document);
    document.sourceAsset.status = 'published_to_library';
    document.sourceAsset.updatedAt = new Date().toISOString();
    await writeStoredSourceAsset(input.projectDir, document);
    return buildSourceAssetSnapshot(document);
  }

  async createVariantFromSourceAsset(
    input: CreateVariantFromSourceAssetInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    const document = await this.variantService.create(input.projectDir, input);
    return this.variantService.getWorkspace(input.projectDir, document.variant.id);
  }

  async listVariantsForSourceAsset(input: ListVariantsForSourceAssetInput) {
    return this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
  }

  async renameVariant(input: RenameVariantInput) {
    return this.variantService.rename(input.projectDir, input);
  }

  async duplicateVariant(input: DuplicateVariantInput) {
    return this.variantService.duplicate(input.projectDir, input);
  }

  async deleteVariant(input: DeleteVariantInput) {
    return this.variantService.delete(input.projectDir, input);
  }

  async getCreationWorkspace(
    input: RemixVariantRefInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async updateVariantConfig(
    input: UpdateVariantConfigInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    await this.variantService.update(input.projectDir, input);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async runRemixStrategy(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot> {
    await this.strategyService.run(input.projectDir, input.variantId);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async runRemixDesign(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot> {
    await this.designService.run(input.projectDir, input.variantId);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async runKeyframeEditPrompts(
    input: RemixVariantRefInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    await this.keyframePromptService.run(input.projectDir, input.variantId);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async registerEditedKeyframe(
    input: RegisterEditedKeyframeInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    await this.editedKeyframeService.register(input.projectDir, input);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async updateEditedKeyframeStatus(
    input: UpdateEditedKeyframeStatusInput,
  ): Promise<RemixCreationWorkspaceSnapshot> {
    await this.editedKeyframeService.updateStatus(input.projectDir, input);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async runSeedancePrompts(input: RemixVariantRefInput): Promise<RemixCreationWorkspaceSnapshot> {
    await this.seedancePromptService.run(input.projectDir, input.variantId);
    return this.variantService.getWorkspace(input.projectDir, input.variantId);
  }

  async exportPromptBundle(input: ExportPromptBundleInput): Promise<ExportPromptBundleResult> {
    return this.seedancePromptService.exportBundle(input.projectDir, input.variantId, input.outputPath);
  }
}
