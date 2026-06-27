import fs from 'node:fs/promises';
import type { RemixProcessingJob } from '../../../src/sceneforge/remix/types';
import { getRemixSourceTranscriptJsonPath } from './remix-artifact-paths';
import { RemixAudioExtractionService } from './remix-audio-extraction-service';
import { hashAudioFile } from './remix-whisper-provider';
import { RemixTranscriptService } from './remix-transcript-service';
import { RemixUnderstandingService } from './remix-understanding-service';
import type { RemixSourceTranscriptDocument } from './remix-transcript-types';
import { readStoredSourceAsset, type StoredSourceAssetDocument } from './remix-store';
import { assertSourceAssetStageReady, resolveProjectFile } from './remix-validators';

export interface RemixUnderstandingOrchestratorOptions {
  skipTranscriptIfFresh?: boolean;
  understandingConcurrency?: number;
  audioExtractionService?: RemixAudioExtractionService;
  transcriptService?: RemixTranscriptService;
  understandingService?: RemixUnderstandingService;
}

export interface RemixUnderstandingOrchestratorHooks {
  onJobUpdate: (job: Partial<RemixProcessingJob>) => Promise<void>;
}

const DEFAULT_CONCURRENCY = 2;

async function readSourceTranscript(
  projectDir: string,
  sourceAssetId: string,
): Promise<RemixSourceTranscriptDocument | null> {
  const rel = getRemixSourceTranscriptJsonPath(sourceAssetId);
  try {
    const raw = await fs.readFile(resolveProjectFile(projectDir, rel), 'utf8');
    return JSON.parse(raw) as RemixSourceTranscriptDocument;
  } catch {
    return null;
  }
}

export async function isSourceTranscriptFresh(
  projectDir: string,
  document: StoredSourceAssetDocument,
): Promise<boolean> {
  const transcript = await readSourceTranscript(projectDir, document.sourceAsset.id);
  if (!transcript) {
    return false;
  }
  const audioPath = document.sourceAsset.sourceAudioPath;
  if (!audioPath) {
    return false;
  }
  const audioSha256 = transcript.inputHash?.audioSha256;
  if (!audioSha256) {
    return false;
  }
  try {
    const current = await hashAudioFile(resolveProjectFile(projectDir, audioPath));
    return current === audioSha256;
  } catch {
    return false;
  }
}

async function ensureSourceAudio(
  projectDir: string,
  sourceAssetId: string,
  audioService: RemixAudioExtractionService,
): Promise<StoredSourceAssetDocument> {
  const document = await readStoredSourceAsset(projectDir, sourceAssetId);
  const needsAudio =
    document.sourceAsset.videoMetadata.hasAudio && !document.sourceAsset.sourceAudioPath?.trim();
  if (!needsAudio) {
    return document;
  }
  return audioService.run(projectDir, sourceAssetId);
}

export class RemixUnderstandingOrchestrator {
  private readonly skipTranscriptIfFresh: boolean;

  private readonly concurrency: number;

  private readonly audioExtractionService: RemixAudioExtractionService;

  private readonly transcriptService: RemixTranscriptService;

  private readonly understandingService: RemixUnderstandingService;

  constructor(options: RemixUnderstandingOrchestratorOptions = {}) {
    this.skipTranscriptIfFresh = options.skipTranscriptIfFresh ?? true;
    this.concurrency = Math.max(1, options.understandingConcurrency ?? DEFAULT_CONCURRENCY);
    this.audioExtractionService = options.audioExtractionService ?? new RemixAudioExtractionService();
    this.transcriptService = options.transcriptService ?? new RemixTranscriptService();
    this.understandingService = options.understandingService ?? new RemixUnderstandingService();
  }

  private async patchJob(
    hooks: RemixUnderstandingOrchestratorHooks,
    patch: Partial<RemixProcessingJob>,
  ): Promise<void> {
    await hooks.onJobUpdate(patch);
  }

  async run(
    projectDir: string,
    sourceAssetId: string,
    hooks: RemixUnderstandingOrchestratorHooks,
  ): Promise<StoredSourceAssetDocument> {
    let document = await readStoredSourceAsset(projectDir, sourceAssetId);
    assertSourceAssetStageReady(document, 'remix_keyframes');

    const segmentTotal = document.sourceAsset.segments.length;

    await this.patchJob(hooks, {
      message: '正在准备全片台词…',
      progress: 0,
      understandingProgress: {
        phase: 'transcript',
        total: 1,
        completed: 0,
        message: '正在准备全片台词…',
      },
    });

    document = await ensureSourceAudio(projectDir, sourceAssetId, this.audioExtractionService);

    const transcriptFresh =
      this.skipTranscriptIfFresh && (await isSourceTranscriptFresh(projectDir, document));

    if (!transcriptFresh) {
      document = await this.transcriptService.run(projectDir, sourceAssetId);
    }

    await this.patchJob(hooks, {
      message: transcriptFresh ? '复用已有台词，开始片段理解…' : '全片台词已完成，开始片段理解…',
      progress: transcriptFresh ? 0.15 : 0.25,
      understandingProgress: {
        phase: 'understanding',
        total: segmentTotal,
        completed: 0,
        message: transcriptFresh ? '复用已有台词，开始片段理解…' : '全片台词已完成，开始片段理解…',
        details: {
          transcriptSkipped: transcriptFresh,
          understandingConcurrency: this.concurrency,
        },
      },
    });

    document = await this.understandingService.runWithProgress(
      projectDir,
      sourceAssetId,
      {
        concurrency: this.concurrency,
        onProgress: async ({ completed, total, currentSegmentId, failedSegmentIds }) => {
          const ratio = total > 0 ? completed / total : 0;
          await this.patchJob(hooks, {
            message:
              completed < total
                ? `正在理解片段 ${completed}/${total}…`
                : '片段理解完成，正在汇总全片…',
            progress: 0.25 + ratio * 0.65,
            understandingProgress: {
              phase: completed >= total ? 'rollup' : 'understanding',
              total,
              completed,
              currentSegmentId: currentSegmentId ?? null,
              message:
                completed < total
                  ? `正在理解片段 ${completed}/${total}`
                  : '正在汇总全片…',
              details: {
                transcriptSkipped: transcriptFresh,
                understandingConcurrency: this.concurrency,
                failedSegmentIds,
              },
            },
          });
        },
      },
    );

    await this.patchJob(hooks, {
      message: '原片理解完成',
      progress: 1,
      understandingProgress: {
        phase: 'done',
        total: segmentTotal,
        completed: segmentTotal,
        message: '原片理解完成',
        details: {
          transcriptSkipped: transcriptFresh,
          understandingConcurrency: this.concurrency,
        },
      },
    });

    return document;
  }
}
