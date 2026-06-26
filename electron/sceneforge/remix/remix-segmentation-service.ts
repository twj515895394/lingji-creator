import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RemixSegmentBoundaryDetails,
  RemixSegmentationDiagnostics,
  RemixSegmentationInputProfile,
  RemixSegmentationMode,
  RemixSegmentReviewStatus,
  SourceSegment,
} from '../../../src/sceneforge/remix/types';
import {
  getRemixClipGenerationReportPath,
  getRemixRuntimeDiagnosticsPath,
  getRemixSegmentClipPath,
  getRemixSegmentManifestIndexPath,
  getRemixSegmentManifestPath,
  getRemixShotDetectionReportPath,
  getRemixSourceSegmentsDir,
} from './remix-artifact-paths';
import { writeRemixDebugJson, withDebugReportMeta } from './remix-debug-artifacts';
import { markRemixUnderstandingStale } from './remix-understanding-gate';
import { assertFileExists, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';
import { runShotDetector } from './shot-detection/shot-detector-runner';
import type { ShotDetectionResult } from './shot-detection/shot-detector-types';
import { resolveTransNetV2Assets } from './shot-detection/model-path-resolver';
import {
  SegmentClipService,
  type SegmentClipGenerationSummary,
} from './segment-clips/segment-clip-service';

interface SegmentationCandidateBoundary {
  timeMs: number;
  sources: string[];
  confidence: number;
  boundaryType: RemixSegmentBoundaryDetails['boundaryType'];
}

export interface RunSegmentationOptions {
  mode?: RemixSegmentationMode;
  preserveManualEdits?: boolean;
  minShotDurationMs?: number;
}

export interface RemixSegmentationServiceOptions {
  now?: () => Date;
}

interface SegmentationBuildResult {
  segments: SourceSegment[];
  lowConfidenceSegmentIds: string[];
  detectionResult: ShotDetectionResult | null;
  fallbackReason: string | null;
}

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function processResourcesPath(): string {
  return (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? process.cwd();
}

function withCompleteBoundary(segment: SourceSegment): SourceSegment {
  return {
    ...segment,
    boundary: {
      startConfidence: segment.boundary?.startConfidence ?? 1,
      endConfidence: segment.boundary?.endConfidence ?? 1,
      startSources: segment.boundary?.startSources ?? ['manual_override'],
      endSources: segment.boundary?.endSources ?? ['manual_override'],
      boundaryType: segment.boundary?.boundaryType ?? 'manual',
    },
    reviewStatus: segment.reviewStatus ?? 'manual_adjusted',
    semantic: segment.semantic ?? null,
  };
}

function nowIso(now: () => Date): string {
  return now().toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundConfidence(value: number): number {
  return Math.round(clamp(value, 0, 1) * 100) / 100;
}

function buildInputProfile(
  document: StoredSourceAssetDocument,
  mode: RemixSegmentationMode,
): RemixSegmentationInputProfile {
  const fps = document.sourceAsset.videoMetadata.fps ?? 25;
  const analysisFps = mode === 'accurate' ? Math.min(fps, 12) : Math.min(fps, 8);
  return {
    durationMs: document.sourceAsset.videoMetadata.durationMs,
    fps,
    analysisFps,
    width: document.sourceAsset.videoMetadata.width,
    height: document.sourceAsset.videoMetadata.height,
    frameCount: Math.max(1, Math.round((document.sourceAsset.videoMetadata.durationMs / 1000) * analysisFps)),
  };
}

function mergeCloseBoundaries(
  candidates: SegmentationCandidateBoundary[],
  mergeDistanceMs: number,
): SegmentationCandidateBoundary[] {
  const sorted = [...candidates].sort((left, right) => left.timeMs - right.timeMs);
  const merged: SegmentationCandidateBoundary[] = [];

  for (const candidate of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && Math.abs(previous.timeMs - candidate.timeMs) <= mergeDistanceMs) {
      const sources = Array.from(new Set([...previous.sources, ...candidate.sources]));
      previous.timeMs = Math.round((previous.timeMs + candidate.timeMs) / 2);
      previous.sources = sources;
      previous.confidence = roundConfidence(Math.max(previous.confidence, candidate.confidence) + 0.08);
      previous.boundaryType =
        previous.boundaryType === 'manual' || candidate.boundaryType === 'manual'
          ? 'manual'
          : previous.boundaryType === 'gradual' || candidate.boundaryType === 'gradual'
            ? 'gradual'
            : 'hard_cut';
      continue;
    }
    merged.push({ ...candidate, sources: [...candidate.sources] });
  }

  return merged;
}

function buildCandidateBoundaries(
  profile: RemixSegmentationInputProfile,
  mode: RemixSegmentationMode,
): SegmentationCandidateBoundary[] {
  const durationMs = profile.durationMs;
  const baseStepMs = mode === 'accurate' ? 3200 : 4200;
  const denseStepMs = mode === 'accurate' ? 2400 : 3600;
  const adaptive: SegmentationCandidateBoundary[] = [];
  const ffmpegLike: SegmentationCandidateBoundary[] = [];
  const accurateRefiner: SegmentationCandidateBoundary[] = [];

  for (let timeMs = baseStepMs; timeMs < durationMs - 1200; timeMs += baseStepMs) {
    adaptive.push({
      timeMs,
      sources: ['adaptive_fallback'],
      confidence: mode === 'accurate' ? 0.72 : 0.64,
      boundaryType: 'hard_cut',
    });
  }

  for (let timeMs = denseStepMs - 400; timeMs < durationMs - 1200; timeMs += denseStepMs) {
    ffmpegLike.push({
      timeMs,
      sources: ['ffmpeg_scene_fallback'],
      confidence: mode === 'accurate' ? 0.61 : 0.53,
      boundaryType: timeMs % (denseStepMs * 2) === 0 ? 'gradual' : 'hard_cut',
    });
  }

  if (mode === 'accurate') {
    for (let timeMs = 2600; timeMs < durationMs - 900; timeMs += 2800) {
      accurateRefiner.push({
        timeMs,
        sources: ['accurate_refiner_fallback'],
        confidence: 0.78,
        boundaryType: 'hard_cut',
      });
    }
  }

  return mergeCloseBoundaries([...adaptive, ...ffmpegLike, ...accurateRefiner], 300);
}

function confidenceFromSources(sources: string[], baseConfidence: number): number {
  const isRealDetector = sources.includes('pyscenedetect_adaptive') || sources.includes('transnetv2_single_frame');
  const boosted =
    baseConfidence +
    (sources.some((source) => source.includes('adaptive')) ? 0.08 : 0) +
    (sources.some((source) => source.includes('ffmpeg_scene')) ? 0.05 : 0) +
    (sources.some((source) => source.includes('accurate_refiner')) ? 0.1 : 0) +
    (sources.includes('pyscenedetect_adaptive') ? 0.08 : 0) +
    (sources.includes('transnetv2_single_frame') ? 0.08 : 0) -
    (sources.length === 1 && !isRealDetector ? 0.12 : 0);
  return roundConfidence(boosted);
}

function buildSemanticDetails(segment: SourceSegment): SourceSegment['semantic'] {
  const durationSeconds = Math.max(1, Math.round(segment.timeRange.durationMs / 1000));
  const shotType =
    durationSeconds >= 8 ? '长段保留' : durationSeconds >= 5 ? '中景推进' : '短切反应';
  const motion =
    segment.boundaryType === 'split_long_shot'
      ? '人物或镜头持续推进'
      : segment.boundaryType === 'merged_short_shots'
        ? '多次短反打已合并'
        : '动作节奏相对稳定';
  const mergeSuggestion =
    segment.reviewStatus === 'needs_review' && segment.timeRange.durationMs < 2200
      ? '这段时长偏短，若语义连续可考虑与相邻镜头合并。'
      : null;

  return {
    visualSummary: `${segment.title}，时长约 ${durationSeconds} 秒，当前按 ${shotType} 处理。`,
    shotType,
    motion,
    mergeSuggestion,
  };
}

function buildSegmentTitle(index: number, durationMs: number, reviewStatus: RemixSegmentReviewStatus): string {
  const energyLabel =
    durationMs >= 8000 ? '长段观察' : durationMs >= 4500 ? '节奏推进' : '快速反应';
  const reviewLabel = reviewStatus === 'needs_review' ? '待校准' : '已检测';
  return `片段 ${String(index).padStart(2, '0')} · ${energyLabel} · ${reviewLabel}`;
}

function boundaryTypeFromDuration(
  durationMs: number,
  nextBoundary: SegmentationCandidateBoundary | null,
): SourceSegment['boundaryType'] {
  return nextBoundary?.boundaryType === 'gradual'
    ? 'merged_short_shots'
    : durationMs >= 9000
      ? 'long_segment'
      : durationMs >= 6000
        ? 'split_long_shot'
        : 'source_shot';
}

function buildSegmentsFromCandidates(
  sourceAssetId: string,
  durationMs: number,
  candidates: SegmentationCandidateBoundary[],
  minShotDurationMs: number,
): { segments: SourceSegment[]; lowConfidenceSegmentIds: string[] } {
  const filtered: SegmentationCandidateBoundary[] = [];

  for (const candidate of candidates) {
    const previous = filtered[filtered.length - 1];
    const previousTimeMs = previous?.timeMs ?? 0;
    if (candidate.timeMs - previousTimeMs < minShotDurationMs && candidate.confidence < 0.86) {
      if (previous) {
        previous.sources = Array.from(new Set([...previous.sources, ...candidate.sources]));
        previous.confidence = roundConfidence(Math.max(previous.confidence, candidate.confidence));
      }
      continue;
    }
    filtered.push({
      ...candidate,
      confidence: confidenceFromSources(candidate.sources, candidate.confidence),
    });
  }

  const boundaries = [0, ...filtered.map((candidate) => candidate.timeMs), durationMs];
  const segments: SourceSegment[] = [];
  const lowConfidenceSegmentIds: string[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMs = boundaries[index]!;
    const endMs = boundaries[index + 1]!;
    const previousBoundary = filtered[index - 1] ?? null;
    const nextBoundary = filtered[index] ?? null;
    const startConfidence = previousBoundary?.confidence ?? 1;
    const endConfidence = nextBoundary?.confidence ?? 1;
    const reviewStatus: RemixSegmentReviewStatus =
      startConfidence < 0.7 || endConfidence < 0.7 ? 'needs_review' : 'auto';
    const segmentId = `segment-${String(index + 1).padStart(3, '0')}`;
    const segment: SourceSegment = {
      id: segmentId,
      sourceAssetId,
      index: index + 1,
      title: buildSegmentTitle(index + 1, endMs - startMs, reviewStatus),
      boundaryType: boundaryTypeFromDuration(endMs - startMs, nextBoundary),
      timeRange: { startMs, endMs, durationMs: endMs - startMs },
      boundary: {
        startConfidence,
        endConfidence,
        startSources: previousBoundary?.sources ?? ['timeline_start'],
        endSources: nextBoundary?.sources ?? ['timeline_end'],
        boundaryType: nextBoundary?.boundaryType ?? 'inferred',
      },
      reviewStatus,
      sourceClipPath: getRemixSegmentClipPath(sourceAssetId, segmentId),
      keyframes: [],
      semantic: null,
      analysisMarkdownPath: null,
      analysisJsonPath: null,
    };
    segment.semantic = buildSemanticDetails(segment);
    if (reviewStatus === 'needs_review') lowConfidenceSegmentIds.push(segmentId);
    segments.push(segment);
  }

  return { segments, lowConfidenceSegmentIds };
}

function candidatesFromDetectionResult(detectionResult: ShotDetectionResult): SegmentationCandidateBoundary[] {
  return detectionResult.boundaries.map((boundary) => ({
    timeMs: boundary.timeMs,
    sources: boundary.sources,
    confidence: boundary.confidence,
    boundaryType: boundary.boundaryType,
  }));
}

function fallbackSegments(
  sourceAssetId: string,
  document: StoredSourceAssetDocument,
  inputProfile: RemixSegmentationInputProfile,
  mode: RemixSegmentationMode,
  minShotDurationMs: number,
  fallbackReason: string,
): SegmentationBuildResult {
  const built = buildSegmentsFromCandidates(
    sourceAssetId,
    document.sourceAsset.videoMetadata.durationMs,
    buildCandidateBoundaries(inputProfile, mode),
    minShotDurationMs,
  );
  return { ...built, detectionResult: null, fallbackReason };
}

function buildRuntimeResolutionOptions() {
  return {
    appPath: process.cwd(),
    resourcesPath: (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? process.cwd(),
    cwd: process.cwd(),
    moduleDir: currentModuleDir(),
    env: process.env,
  };
}

async function runDetectorAndBuildSegments(
  projectDir: string,
  sourceAssetId: string,
  document: StoredSourceAssetDocument,
  mode: RemixSegmentationMode,
  minShotDurationMs: number,
  modelPath?: string | null,
  modelVendorDir?: string | null,
): Promise<SegmentationBuildResult> {
  const detectionResult = await runShotDetector({
    projectDir,
    sourceAssetId,
    videoPath: document.sourceAsset.sourceVideoPath,
    mode,
    minShotDurationMs,
    durationMs: document.sourceAsset.videoMetadata.durationMs,
    fps: document.sourceAsset.videoMetadata.fps ?? 25,
    width: document.sourceAsset.videoMetadata.width,
    height: document.sourceAsset.videoMetadata.height,
    modelPath,
    modelVendorDir,
  });
  const built = buildSegmentsFromCandidates(
    sourceAssetId,
    document.sourceAsset.videoMetadata.durationMs,
    candidatesFromDetectionResult(detectionResult),
    minShotDurationMs,
  );
  return { ...built, detectionResult, fallbackReason: null };
}

async function buildSegmentsForMode(
  projectDir: string,
  sourceAssetId: string,
  document: StoredSourceAssetDocument,
  mode: RemixSegmentationMode,
  inputProfile: RemixSegmentationInputProfile,
  minShotDurationMs: number,
): Promise<SegmentationBuildResult> {
  if (mode === 'fast') {
    try {
      return await runDetectorAndBuildSegments(
        projectDir,
        sourceAssetId,
        document,
        mode,
        minShotDurationMs,
      );
    } catch (error) {
      return fallbackSegments(
        sourceAssetId,
        document,
        inputProfile,
        mode,
        minShotDurationMs,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const transNetV2Assets = resolveTransNetV2Assets(buildRuntimeResolutionOptions());
  if (!transNetV2Assets.ready) {
    return fallbackSegments(
      sourceAssetId,
      document,
      inputProfile,
      mode,
      minShotDurationMs,
      `TransNetV2 assets missing: ${transNetV2Assets.missing.join(', ')}${transNetV2Assets.warnings.length > 0 ? `; ${transNetV2Assets.warnings.join('; ')}` : ''}`,
    );
  }

  try {
    return await runDetectorAndBuildSegments(
      projectDir,
      sourceAssetId,
      document,
      mode,
      minShotDurationMs,
      transNetV2Assets.modelPath,
      transNetV2Assets.vendorDir,
    );
  } catch (error) {
    return fallbackSegments(
      sourceAssetId,
      document,
      inputProfile,
      mode,
      minShotDurationMs,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function writeSegmentArtifacts(
  projectDir: string,
  sourceVideoPath: string,
  sourceAssetId: string,
  segments: SourceSegment[],
): Promise<SegmentClipGenerationSummary> {
  await fs.rm(resolveProjectFile(projectDir, getRemixSourceSegmentsDir(sourceAssetId)), {
    recursive: true,
    force: true,
  });

  for (const segment of segments) {
    const clipPath = resolveProjectFile(projectDir, segment.sourceClipPath);
    await fs.mkdir(path.dirname(clipPath), { recursive: true });
    await fs.writeFile(
      resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
      `${JSON.stringify(segment, null, 2)}\n`,
      'utf8',
    );
  }

  const clipSummary = await new SegmentClipService().generateClips({
    projectDir,
    sourceVideoPath,
    sourceAssetId,
    segments,
    mode: 'reencode_accurate',
    overwrite: true,
  });

  await writeRemixDebugJson({
    projectDir,
    relativePath: getRemixClipGenerationReportPath(sourceAssetId),
    payload: withDebugReportMeta({
      sourceAssetId,
      sourceVideoPath,
      segmentCount: segments.length,
      clipGeneration: clipSummary,
    }),
  });

  await fs.writeFile(
    resolveProjectFile(projectDir, getRemixSegmentManifestIndexPath(sourceAssetId)),
    `${JSON.stringify({ segmentIds: segments.map((segment) => segment.id) }, null, 2)}\n`,
    'utf8',
  );

  return clipSummary;
}

function detectionNote(mode: RemixSegmentationMode, detectionResult: ShotDetectionResult | null): string {
  if (detectionResult?.detector === 'pyscenedetect_adaptive') {
    return 'fast 模式已接入 PySceneDetect AdaptiveDetector 真实镜头检测。';
  }
  if (detectionResult?.detector === 'transnetv2') {
    return 'accurate 模式已接入 TransNetV2 高精镜头检测。';
  }
  return mode === 'fast'
    ? 'fast 模式检测 Worker 不可用，已使用规则候选边界 fallback。'
    : 'accurate 模式 TransNetV2 不可用，已使用规则候选边界 fallback。';
}

function buildDiagnostics(
  profile: RemixSegmentationInputProfile,
  mode: RemixSegmentationMode,
  lowConfidenceSegmentIds: string[],
  preserveManualEdits: boolean,
  now: () => Date,
  detectionResult: ShotDetectionResult | null,
  fallbackReason: string | null,
  clipSummary: SegmentClipGenerationSummary | null,
): RemixSegmentationDiagnostics {
  const usedFallback = Boolean(fallbackReason) || detectionResult?.usedFallback === true;
  const notes = [
    detectionNote(mode, detectionResult),
    lowConfidenceSegmentIds.length > 0
      ? `检测到 ${lowConfidenceSegmentIds.length} 个低置信度镜头段，建议人工校准。`
      : '当前没有低置信度镜头段。',
  ];

  if (fallbackReason) notes.push(`fallback 原因：${fallbackReason}`);
  if (preserveManualEdits) notes.push('本次重跑保留了已有人工校准覆盖项。');
  if (clipSummary) notes.push(`已生成 ${clipSummary.successCount}/${clipSummary.totalCount} 个真实分镜视频片段。`);
  if (detectionResult?.notes?.length) notes.push(...detectionResult.notes);

  return {
    mode,
    detector: detectionResult?.detector ?? (usedFallback ? 'hybrid_fallback' : mode === 'accurate' ? 'hybrid' : 'adaptive'),
    inputProfile: profile,
    lowConfidenceSegmentIds,
    notes,
    usedFallback,
    fallbackReason,
    preserveManualEdits,
    generatedAt: nowIso(now),
    detectionMetrics: detectionResult?.metrics ?? null,
    clipGeneration: clipSummary
      ? {
          mode: clipSummary.mode,
          totalCount: clipSummary.totalCount,
          successCount: clipSummary.successCount,
          failedCount: clipSummary.failedCount,
          elapsedMs: clipSummary.elapsedMs,
        }
      : null,
  };
}

function buildRuntimeDiagnosticsPayload(sourceAssetId: string) {
  const runtimeOptions = buildRuntimeResolutionOptions();
  const transNetV2Assets = resolveTransNetV2Assets(runtimeOptions);
  return withDebugReportMeta({
    sourceAssetId,
    cwd: process.cwd(),
    resourcesPath: runtimeOptions.resourcesPath,
    env: {
      hasLingjiShotPython: Boolean(process.env.LINGJI_SHOT_PYTHON),
      hasTransNetV2ModelPath: Boolean(process.env.LINGJI_TRANSNETV2_MODEL_PATH),
      hasTransNetV2VendorDir: Boolean(process.env.LINGJI_TRANSNETV2_VENDOR_DIR),
    },
    transNetV2Assets,
  });
}

export class RemixSegmentationService {
  private readonly now;

  constructor(options: RemixSegmentationServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  private applyManualOverrideIfNeeded(
    document: StoredSourceAssetDocument,
    preserveManualEdits: boolean,
  ): SourceSegment[] | null {
    if (!preserveManualEdits) return null;
    const override = document.sourceAsset.manualSegmentationOverride;
    if (!override?.preserveOnRerun || override.segments.length === 0) return null;

    return override.segments.map((segment, index) => ({
      ...withCompleteBoundary(segment),
      index: index + 1,
      reviewStatus: 'manual_adjusted',
      boundary: {
        ...withCompleteBoundary(segment).boundary!,
        startSources: Array.from(new Set([...(withCompleteBoundary(segment).boundary?.startSources ?? []), 'manual_override'])),
        endSources: Array.from(new Set([...(withCompleteBoundary(segment).boundary?.endSources ?? []), 'manual_override'])),
      },
      semantic: {
        ...segment.semantic,
        mergeSuggestion: null,
      },
    }));
  }

  async run(
    projectDir: string,
    sourceAssetId: string,
    options: RunSegmentationOptions = {},
  ): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    await assertFileExists(document.sourceAsset.sourceVideoPath, '原片视频');

    const mode = options.mode ?? 'fast';
    const preserveManualEdits = options.preserveManualEdits ?? true;
    const minShotDurationMs = Math.max(600, options.minShotDurationMs ?? (mode === 'accurate' ? 1200 : 1800));
    const inputProfile = buildInputProfile(document, mode);
    const preservedSegments = this.applyManualOverrideIfNeeded(document, preserveManualEdits);

    const buildResult: SegmentationBuildResult = preservedSegments
      ? {
          segments: preservedSegments,
          lowConfidenceSegmentIds: preservedSegments
            .filter((segment) => segment.reviewStatus === 'needs_review')
            .map((segment) => segment.id),
          detectionResult: null,
          fallbackReason: null,
        }
      : await buildSegmentsForMode(
          projectDir,
          sourceAssetId,
          document,
          mode,
          inputProfile,
          minShotDurationMs,
        );

    const clipSummary = await writeSegmentArtifacts(
      projectDir,
      document.sourceAsset.sourceVideoPath,
      sourceAssetId,
      buildResult.segments,
    );

    document.sourceAsset.segments = buildResult.segments.map((segment) => ({
      ...segment,
      analysisMarkdownPath: document.sourceAsset.segmentAnalysisMarkdownPath ?? null,
      analysisJsonPath: document.sourceAsset.segmentAnalysisJsonPath ?? null,
    }));
    document.sourceAsset.segmentationMode = mode;
    document.sourceAsset.segmentationDiagnostics = buildDiagnostics(
      inputProfile,
      mode,
      buildResult.lowConfidenceSegmentIds,
      preserveManualEdits,
      this.now,
      buildResult.detectionResult,
      buildResult.fallbackReason,
      clipSummary,
    );

    await writeRemixDebugJson({
      projectDir,
      relativePath: getRemixShotDetectionReportPath(sourceAssetId),
      payload: withDebugReportMeta({
        sourceAssetId,
        mode,
        minShotDurationMs,
        inputProfile,
        usedManualOverride: Boolean(preservedSegments),
        lowConfidenceSegmentIds: buildResult.lowConfidenceSegmentIds,
        fallbackReason: buildResult.fallbackReason,
        detectionResult: buildResult.detectionResult,
        segmentCount: buildResult.segments.length,
      }),
    });
    await writeRemixDebugJson({
      projectDir,
      relativePath: getRemixRuntimeDiagnosticsPath(sourceAssetId),
      payload: buildRuntimeDiagnosticsPayload(sourceAssetId),
    });

    if (!preservedSegments) {
      document.sourceAsset.manualSegmentationOverride = null;
    }
    document.sourceAsset.updatedAt = nowIso(this.now);
    document.processingStageStates.remix_segmentation = 'approved';
    document.processingStageStates.remix_keyframes = 'ready_for_review';
    markRemixUnderstandingStale(document);
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
