import type {
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingStageId,
  RemixProcessingJob,
  RemixProcessingJobStepId,
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
import { RemixAudioExtractionService } from './remix-audio-extraction-service';
import { RemixTranscriptService } from './remix-transcript-service';
import { RemixUnderstandingService, type RemixUnderstandingServiceOptions } from './remix-understanding-service';
import { RemixVariantService } from './remix-variant-service';
import { RemixStrategyService } from './remix-strategy-service';
import { RemixDesignService } from './remix-design-service';
import { RemixKeyframePromptService } from './remix-keyframe-prompt-service';
import { RemixEditedKeyframeService } from './remix-edited-keyframe-service';
import { RemixSeedancePromptService } from './remix-seedance-prompt-service';
import { markRemixUnderstandingStale } from './remix-understanding-gate';
import { assertPublishReady } from './remix-validators';
import { loadRemixUnderstandingWorkbench } from './remix-understanding-workbench';
import { RemixUnderstandingOrchestrator } from './remix-understanding-orchestrator';
import { RemixTranscriptCorrectionService } from './remix-transcript-correction-service';
import { RemixFrameVisionService } from './remix-frame-vision-service';
import { RemixUnderstandingReportExportService } from './remix-understanding-report-export-service';

export interface RemixServiceOptions extends RemixSourceAssetServiceOptions {
  transcriptService?: RemixTranscriptService;
  understandingService?: RemixUnderstandingService;
  understandingServiceOptions?: RemixUnderstandingServiceOptions;
  understandingConcurrency?: number;
}

export class RemixService {
  private readonly activeLocalJobIds = new Set<string>();
  private readonly sourceAssetService;

  private readonly segmentationService;

  private readonly keyframeService;

  private readonly mediaValidationService;

  private readonly audioExtractionService;

  private readonly transcriptService;

  private readonly understandingService;

  private readonly variantService;

  private readonly strategyService;

  private readonly designService;

  private readonly keyframePromptService;

  private readonly editedKeyframeService;

  private readonly seedancePromptService;

  private readonly understandingOrchestrator: RemixUnderstandingOrchestrator;
  private readonly transcriptCorrectionService: RemixTranscriptCorrectionService;
  private readonly frameVisionService: RemixFrameVisionService;
  private readonly reportExportService: RemixUnderstandingReportExportService;

  constructor(options: RemixServiceOptions = {}) {
    this.sourceAssetService = new RemixSourceAssetService(options);
    this.segmentationService = new RemixSegmentationService();
    this.keyframeService = new RemixKeyframeService();
    this.mediaValidationService = new RemixMediaValidationService(options);
    this.audioExtractionService = new RemixAudioExtractionService();
    this.transcriptService = options.transcriptService ?? new RemixTranscriptService();
    this.understandingService = options.understandingService ?? new RemixUnderstandingService(options.understandingServiceOptions);
    this.variantService = new RemixVariantService(options);
    this.strategyService = new RemixStrategyService();
    this.designService = new RemixDesignService();
    this.keyframePromptService = new RemixKeyframePromptService();
    this.editedKeyframeService = new RemixEditedKeyframeService();
    this.seedancePromptService = new RemixSeedancePromptService();
    this.understandingOrchestrator = new RemixUnderstandingOrchestrator({
      audioExtractionService: this.audioExtractionService,
      transcriptService: this.transcriptService,
      understandingService: this.understandingService,
      understandingConcurrency: options.understandingConcurrency ?? 2,
    });
    this.transcriptCorrectionService = new RemixTranscriptCorrectionService();
    this.frameVisionService = new RemixFrameVisionService();
    this.reportExportService = new RemixUnderstandingReportExportService();
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

    let hasZombie = false;
    for (const job of jobsDocument.jobs) {
      if ((job.status === 'running' || job.status === 'queued') && !this.activeLocalJobIds.has(job.id)) {
        job.status = 'failed';
        job.finishedAt = new Date().toISOString();
        job.error = '系统已重启，该任务已自动终止。';
        job.message = '任务被中断或终止';
        hasZombie = true;
      }
    }
    if (hasZombie) {
      await writeStoredSourceAssetJobs(projectDir, jobsDocument);
    }

    return buildSourceAssetSnapshot(document, jobsDocument.jobs);
  }

  private async runProcessingStage(
    input: RunSourceAssetStageInput,
    stepId: RemixAssetProcessingStageId | RemixProcessingJobStepId,
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
    this.activeLocalJobIds.add(jobId);

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
    } finally {
      this.activeLocalJobIds.delete(jobId);
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

  async runSourceAudio(input: RunSourceAssetStageInput) {
    return this.runProcessingStage(
      input,
      'remix_audio_extraction',
      () => this.audioExtractionService.run(input.projectDir, input.sourceAssetId),
      '音频抽取任务',
    );
  }

  async runSourceTranscript(input: RunSourceAssetStageInput) {
    return this.runProcessingStage(
      input,
      'remix_transcript',
      () =>
        this.transcriptService.run(input.projectDir, input.sourceAssetId, {
          preferredEngine: input.preferredAsrEngine ?? null,
        }),
      '台词识别任务',
    );
  }


  async rerunSegmentUnderstanding(input: SegmentKeyframeActionInput) {
    return this.runProcessingStage(
      input,
      'remix_understanding',
      () =>
        this.understandingService.run(input.projectDir, input.sourceAssetId, {
          segmentIds: [input.segmentId],
        }),
      '单段原片理解任务',
    );
  }

  async rerunSegmentTranscript(input: SegmentKeyframeActionInput) {
    const document = await this.transcriptService.rerunSegment(
      input.projectDir,
      input.sourceAssetId,
      input.segmentId,
      {
        preferredEngine: input.preferredAsrEngine ?? null,
      },
    );
    await this.mediaValidationService.validate(input.projectDir, document);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const snapshot = buildSourceAssetSnapshot(document, jobsDocument.jobs);
    snapshot.variants = await this.variantService.listForSourceAsset(input.projectDir, input.sourceAssetId);
    return snapshot;
  }

  async rerunOriginalStoryRollup(input: RemixSourceAssetRefInput) {
    return this.runProcessingStage(
      input,
      'remix_understanding',
      () => this.understandingService.rerunRollupOnly(input.projectDir, input.sourceAssetId),
      '重跑全片故事串联任务',
    );
  }

  async validateUnderstandingFreshness(input: RemixSourceAssetRefInput) {
    return this.understandingService.validateUnderstandingFreshness(input.projectDir, input.sourceAssetId);
  }

  async rerunStaleSegmentUnderstandings(input: RemixSourceAssetRefInput) {
    return this.runProcessingStage(
      input,
      'remix_understanding',
      () => this.understandingService.rerunStaleSegmentUnderstandings(input.projectDir, input.sourceAssetId),
      '只重跑过期原片理解任务',
    );
  }

  async getSourceUnderstandingWorkbench(input: RemixSourceAssetRefInput) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    return loadRemixUnderstandingWorkbench(input.projectDir, document.sourceAsset);
  }

  async getSegmentTranscriptCorrection(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
  }) {
    return this.transcriptCorrectionService.getSegmentTranscriptCorrection(
      input.projectDir,
      input.sourceAssetId,
      input.segmentId,
    );
  }

  async updateSegmentTranscriptCorrection(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
    correctedText: string;
    markConfirmed?: boolean;
  }) {
    return this.transcriptCorrectionService.updateSegmentTranscriptCorrection(
      input.projectDir,
      input.sourceAssetId,
      input.segmentId,
      input.correctedText,
      input.markConfirmed,
    );
  }

  async confirmAllSegmentTranscripts(input: {
    projectDir: string;
    sourceAssetId: string;
  }) {
    return this.transcriptCorrectionService.confirmAllSegmentTranscripts(
      input.projectDir,
      input.sourceAssetId,
    );
  }

  private async patchUnderstandingJob(
    projectDir: string,
    sourceAssetId: string,
    jobId: string,
    jobsDocument: Awaited<ReturnType<typeof readStoredSourceAssetJobs>>,
    patch: Partial<RemixProcessingJob>,
  ): Promise<RemixProcessingJob> {
    const existing = jobsDocument.jobs.find((job) => job.id === jobId);
    const nextJob: RemixProcessingJob = {
      ...(existing ?? {
        id: jobId,
        sourceAssetId,
        stepId: 'remix_understanding',
        status: 'running',
        startedAt: new Date().toISOString(),
        finishedAt: null,
      }),
      ...patch,
    } as RemixProcessingJob;
    jobsDocument.jobs = [nextJob, ...jobsDocument.jobs.filter((job) => job.id !== jobId)];
    await writeStoredSourceAssetJobs(projectDir, jobsDocument);
    return nextJob;
  }

  async runSourceUnderstanding(input: RunSourceAssetStageInput) {
    const sourceDocument = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    const jobsDocument = await readStoredSourceAssetJobs(input.projectDir, input.sourceAssetId);
    const startedAt = new Date().toISOString();
    const jobId = `remix_understanding-${startedAt.replace(/[:.]/g, '-')}`;

    sourceDocument.sourceAsset.status = 'processing';
    sourceDocument.sourceAsset.updatedAt = startedAt;
    await writeStoredSourceAsset(input.projectDir, sourceDocument);

    await this.patchUnderstandingJob(input.projectDir, input.sourceAssetId, jobId, jobsDocument, {
      id: jobId,
      sourceAssetId: input.sourceAssetId,
      stepId: 'remix_understanding',
      status: 'running',
      message: '正在生成原片理解',
      progress: 0,
      startedAt,
      finishedAt: null,
      understandingProgress: {
        phase: 'transcript',
        total: 1,
        completed: 0,
        message: '正在准备全片台词…',
      },
    });
    this.activeLocalJobIds.add(jobId);

    try {
      const document = await this.understandingOrchestrator.run(
        input.projectDir,
        input.sourceAssetId,
        {
          onJobUpdate: async (patch) => {
            await this.patchUnderstandingJob(
              input.projectDir,
              input.sourceAssetId,
              jobId,
              jobsDocument,
              patch,
            );
          },
        },
        {
          preferredAsrEngine: input.preferredAsrEngine ?? null,
        },
      );
      await this.mediaValidationService.validate(input.projectDir, document);
      const finishedAt = new Date().toISOString();
      await this.patchUnderstandingJob(input.projectDir, input.sourceAssetId, jobId, jobsDocument, {
        status: 'succeeded',
        message: '原片理解任务完成',
        progress: 1,
        finishedAt,
      });
      return buildSourceAssetSnapshot(document, jobsDocument.jobs);
    } catch (error) {
      const finishedAt = new Date().toISOString();
      await this.patchUnderstandingJob(input.projectDir, input.sourceAssetId, jobId, jobsDocument, {
        status: 'failed',
        error: error instanceof Error ? error.message : '执行失败。',
        message: '原片理解任务失败',
        finishedAt,
      });
      const failedDocument = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
      failedDocument.sourceAsset.status = 'failed';
      failedDocument.sourceAsset.updatedAt = finishedAt;
      await writeStoredSourceAsset(input.projectDir, failedDocument);
      throw error;
    } finally {
      this.activeLocalJobIds.delete(jobId);
    }
  }

  async publishSourceAssetToLibrary(
    input: RemixSourceAssetRefInput,
  ) {
    const document = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    await assertPublishReady(input.projectDir, document);
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
    markRemixUnderstandingStale(document);
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

  async runSegmentFrameVision(input: {
    projectDir: string;
    sourceAssetId: string;
    segmentId: string;
  }): Promise<import('./remix-frame-vision-service').RemixSegmentFrameVisionDocument> {
    const doc = await readStoredSourceAsset(input.projectDir, input.sourceAssetId);
    if (!doc) {
      throw new Error(`未找到源资产：${input.sourceAssetId}`);
    }
    const segment = doc.sourceAsset.segments.find((s) => s.id === input.segmentId);
    if (!segment) {
      throw new Error(`未找到片段：${input.segmentId}`);
    }
    const settings = await this.understandingService.getAISettings();
    if (!settings) {
      throw new Error('未配置 LLM，无法生成片段视觉先验。请在应用设置中配置 AI 后再试。');
    }
    return this.frameVisionService.runSegmentFrameVision({
      projectDir: input.projectDir,
      sourceAssetId: input.sourceAssetId,
      segment,
      settings,
    });
  }

  async exportUnderstandingReport(input: {
    projectDir: string;
    sourceAssetId: string;
    format?: 'markdown';
  }): Promise<{ reportPath: string }> {
    return this.reportExportService.exportReport(input.projectDir, input.sourceAssetId);
  }
}
