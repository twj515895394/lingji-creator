import type {
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingStageId,
  RemixProcessingJob,
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
  readStoredSourceAssetJobs,
  writeStoredSourceAsset,
  writeStoredSourceAssetJobs,
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

  private normalizeStatuses(
    statuses?: ListSourceAssetsInput['statuses'],
  ): Set<RemixAssetLibrarySnapshot['sourceAssets'][number]['status']> | null {
    if (!statuses) {
      return null;
    }

    return new Set(Array.isArray(statuses) ? statuses : [statuses]);
  }

  private async buildProcessingSnapshot(projectDir: string, sourceAssetId: string) {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const jobsDocument = await readStoredSourceAssetJobs(projectDir, sourceAssetId);
    return buildSourceAssetSnapshot(document, jobsDocument.jobs);
  }

  private async runProcessingStage(
    input: RunSourceAssetStageInput,
    stepId: RemixAssetProcessingStageId,
    runner: () => Promise<Awaited<ReturnType<RemixSegmentationService['run']>>>,
    message: string,
  ) {
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const startedAt = new Date().toISOString();
    const jobId = `${stepId}-${startedAt.replace(/[:.]/g, '-')}`;
    const runningJob: RemixProcessingJob = {
      id: jobId,
      sourceAssetId: input.sourceAssetId,
      stepId,
      status: 'running',
      message,
      startedAt,
      finishedAt: null,
    };

    jobsDocument.jobs = [runningJob, ...jobsDocument.jobs.filter((job) => job.id !== jobId)];
    await writeStoredSourceAssetJobs(input.projectDir, jobsDocument);

    try {
      const document = await runner();
      const finishedAt = new Date().toISOString();
      jobsDocument.jobs = jobsDocument.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: 'succeeded',
              message: `${message}完成`,
              finishedAt,
            }
          : job,
      );
      await writeStoredSourceAssetJobs(input.projectDir, jobsDocument);
      return buildSourceAssetSnapshot(document, jobsDocument.jobs);
    } catch (error) {
      const finishedAt = new Date().toISOString();
      jobsDocument.jobs = jobsDocument.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: 'failed',
              error: error instanceof Error ? error.message : '执行失败。',
              finishedAt,
            }
          : job,
      );
      await writeStoredSourceAssetJobs(input.projectDir, jobsDocument);
      throw error;
    }
  }

  async listSourceAssets(input: ListSourceAssetsInput): Promise<RemixAssetLibrarySnapshot> {
    const statusFilter = this.normalizeStatuses(input.statuses);
    const sourceAssetIds = await listStoredSourceAssetIds(input.projectDir);
    const sourceAssets = await Promise.all(
      sourceAssetIds.map(async (sourceAssetId) => {
        const document = await readStoredSourceAsset(input.projectDir, sourceAssetId);
        return buildSourceAssetSummary(document.sourceAsset);
      }),
    );
    return {
      sourceAssets: sourceAssets
        .filter((sourceAsset) => (statusFilter ? statusFilter.has(sourceAsset.status) : true))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    };
  }

  async getSourceAsset(input: RemixSourceAssetRefInput) {
    const snapshot = await this.buildProcessingSnapshot(input.projectDir, input.sourceAssetId);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async updateSourceAssetMetadata(input: UpdateSourceAssetMetadataInput) {
    const document = await this.sourceAssetService.updateMetadata(input);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const snapshot = buildSourceAssetSnapshot(document, jobsDocument.jobs);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async createSourceAssetFromImport(
    input: CreateSourceAssetFromImportInput,
  ) {
    const { document } = await this.sourceAssetService.createFromImport(input);
    return buildSourceAssetSnapshot(document, []);
  }

  async runSourceSegmentation(input: RunSourceAssetStageInput) {
    return this.runProcessingStage(
      input,
      'remix_segmentation',
      () => this.segmentationService.run(input.projectDir, input.sourceAssetId),
      '切片任务',
    );
  }

  async runSourceKeyframes(input: RunSourceAssetStageInput) {
    return this.runProcessingStage(
      input,
      'remix_keyframes',
      () => this.keyframeService.run(input.projectDir, input.sourceAssetId),
      '关键帧任务',
    );
  }

  async runSourceUnderstanding(
    input: RunSourceAssetStageInput,
  ) {
    return this.runProcessingStage(
      input,
      'remix_understanding',
      () => this.understandingService.run(input.projectDir, input.sourceAssetId),
      '原片理解任务',
    );
  }

  async publishSourceAssetToLibrary(
    input: RemixSourceAssetRefInput,
  ) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    assertPublishReady(document);
    document.sourceAsset.status = 'published_to_library';
    document.sourceAsset.updatedAt = new Date().toISOString();
    await writeStoredSourceAsset(input.projectDir, document);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    return buildSourceAssetSnapshot(document, jobsDocument.jobs);
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
