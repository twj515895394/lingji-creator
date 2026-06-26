import type {
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingStageId,
  RemixProcessingJob,
  RemixCreationWorkspaceSnapshot,
  SourceSegment,
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
  DeleteSourceAssetInput,
  RemixSourceAssetRefInput,
  RemixVariantRefInput,
  RunSourceSegmentationInput,
  RunSourceAssetStageInput,
  UpdateSourceSegmentsInput,
  UpdateSourceAssetMetadataInput,
  UpdateEditedKeyframeStatusInput,
  UpdateVariantConfigInput,
  SegmentKeyframeActionInput,
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
import {
  getRemixSegmentAnalysisJsonPath,
  getRemixSegmentAnalysisMarkdownPath,
} from './remix-artifact-paths';
import { RemixMediaValidationService } from './remix-media-validation-service';
import { RemixSegmentationService, writeSegmentArtifacts } from './remix-segmentation-service';
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

  private readonly mediaValidationService;

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
    this.mediaValidationService = new RemixMediaValidationService(options);
    this.understandingService = new RemixUnderstandingService();
    this.variantService = new RemixVariantService(options);
    this.strategyService = new RemixStrategyService();
    this.designService = new RemixDesignService();
    this.keyframePromptService = new RemixKeyframePromptService();
    this.editedKeyframeService = new RemixEditedKeyframeService();
    this.seedancePromptService = new RemixSeedancePromptService();
  }

  private withCompleteSegmentBoundary(segment: SourceSegment): SourceSegment {
    return {
      ...segment,
      boundary: {
        startConfidence: segment.boundary?.startConfidence ?? 1,
        endConfidence: segment.boundary?.endConfidence ?? 1,
        startSources: segment.boundary?.startSources ?? ['manual_override'],
        endSources: segment.boundary?.endSources ?? ['manual_override'],
        boundaryType: segment.boundary?.boundaryType ?? 'manual',
      },
      reviewStatus:
        segment.reviewStatus === 'approved' || segment.reviewStatus === 'needs_review'
          ? segment.reviewStatus
          : 'manual_adjusted',
      semantic: segment.semantic ?? null,
    };
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
    await this.mediaValidationService.validate(projectDir, document);
    const jobsDocument = await readStoredSourceAssetJobs(projectDir, sourceAssetId);
    return buildSourceAssetSnapshot(document, jobsDocument.jobs);
  }

  private async runProcessingStage(
    input: RunSourceAssetStageInput,
    stepId: RemixAssetProcessingStageId,
    runner: () => Promise<Awaited<ReturnType<RemixSegmentationService['run']>>>,
    message: string,
  ) {
    const sourceDocument = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
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

    sourceDocument.sourceAsset.status = 'processing';
    sourceDocument.sourceAsset.updatedAt = startedAt;
    await writeStoredSourceAsset(input.projectDir, sourceDocument);

    jobsDocument.jobs = [runningJob, ...jobsDocument.jobs.filter((job) => job.id !== jobId)];
    await writeStoredSourceAssetJobs(input.projectDir, jobsDocument);

    try {
      const document = await runner();
      await this.mediaValidationService.validate(input.projectDir, document);
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
              message: `${message}失败`,
              finishedAt,
            }
          : job,
      );
      await writeStoredSourceAssetJobs(input.projectDir, jobsDocument);
      const failedDocument = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
      failedDocument.sourceAsset.status = 'failed';
      failedDocument.sourceAsset.updatedAt = finishedAt;
      await writeStoredSourceAsset(input.projectDir, failedDocument);
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

  async deleteSourceAsset(input: DeleteSourceAssetInput) {
    await this.sourceAssetService.delete(input.projectDir, input.sourceAssetId);
    return { deletedSourceAssetId: input.sourceAssetId };
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
    await this.mediaValidationService.validate(input.projectDir, document);
    return buildSourceAssetSnapshot(document, []);
  }

  async runSourceSegmentation(input: RunSourceSegmentationInput) {
    return this.runProcessingStage(
      input,
      'remix_segmentation',
      () => this.segmentationService.run(input.projectDir, input.sourceAssetId, input as RunSourceSegmentationInput),
      '切片任务',
    );
  }

  async runSourceKeyframes(input: RunSourceAssetStageInput) {
    return this.runProcessingStage(
      input,
      'remix_keyframes',
      () => this.keyframeService.run(input.projectDir, input.sourceAssetId, {
        minDurationForMiddleFrameSec: input.minDurationForMiddleFrameSec,
      }),
      '关键帧任务',
    );
  }

  async addSegmentMiddleKeyframe(input: SegmentKeyframeActionInput) {
    const document = await this.keyframeService.addSegmentMiddleKeyframe(
      input.projectDir,
      input.sourceAssetId,
      input.segmentId,
    );
    await this.mediaValidationService.validate(input.projectDir, document);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const snapshot = buildSourceAssetSnapshot(document, jobsDocument.jobs);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async deleteSegmentMiddleKeyframe(input: SegmentKeyframeActionInput) {
    const document = await this.keyframeService.deleteSegmentMiddleKeyframe(
      input.projectDir,
      input.sourceAssetId,
      input.segmentId,
    );
    await this.mediaValidationService.validate(input.projectDir, document);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const snapshot = buildSourceAssetSnapshot(document, jobsDocument.jobs);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
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

  async updateSourceSegments(input: UpdateSourceSegmentsInput) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    const normalizedSegments: SourceSegment[] = input.segments.map((segment, index) => {
      const completeSegment = this.withCompleteSegmentBoundary(segment);
      return {
        ...completeSegment,
        index: index + 1,
        sourceAssetId: input.sourceAssetId,
        analysisMarkdownPath:
          document.sourceAsset.segmentAnalysisMarkdownPath ?? getRemixSegmentAnalysisMarkdownPath(input.sourceAssetId),
        analysisJsonPath:
          document.sourceAsset.segmentAnalysisJsonPath ?? getRemixSegmentAnalysisJsonPath(input.sourceAssetId),
        reviewStatus: segment.reviewStatus === 'approved' ? 'approved' : 'manual_adjusted',
        semantic: {
          ...segment.semantic,
          mergeSuggestion: null,
        },
        boundary: {
          ...completeSegment.boundary!,
          startSources: Array.from(new Set([...(completeSegment.boundary?.startSources ?? []), 'manual_override'])),
          endSources: Array.from(new Set([...(completeSegment.boundary?.endSources ?? []), 'manual_override'])),
          boundaryType: 'manual',
        },
      };
    });

    document.sourceAsset.segments = normalizedSegments;
    document.sourceAsset.manualSegmentationOverride = {
      updatedAt: new Date().toISOString(),
      reason: input.reason,
      preserveOnRerun: input.preserveOnRerun ?? true,
      segments: normalizedSegments,
    };
    document.sourceAsset.segmentationDiagnostics = document.sourceAsset.segmentationDiagnostics
      ? {
          ...document.sourceAsset.segmentationDiagnostics,
          notes: [
            ...document.sourceAsset.segmentationDiagnostics.notes,
            `已应用人工校准：${input.reason}。`,
          ],
          preserveManualEdits: input.preserveOnRerun ?? true,
          lowConfidenceSegmentIds: normalizedSegments
            .filter((segment) => segment.reviewStatus === 'needs_review')
            .map((segment) => segment.id),
          generatedAt: new Date().toISOString(),
        }
      : null;
    document.sourceAsset.updatedAt = new Date().toISOString();
    await writeSegmentArtifacts(
      input.projectDir,
      document.sourceAsset.sourceVideoPath,
      input.sourceAssetId,
      normalizedSegments,
    );
    await writeStoredSourceAsset(input.projectDir, document);
    await this.mediaValidationService.validate(input.projectDir, document);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const snapshot = buildSourceAssetSnapshot(document, jobsDocument.jobs);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async getSegmentationDiagnostics(input: RemixSourceAssetRefInput) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    return document.sourceAsset.segmentationDiagnostics ?? null;
  }

  async validateSourceAssetMedia(input: RemixSourceAssetRefInput) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    return this.mediaValidationService.validate(input.projectDir, document);
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
