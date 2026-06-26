import path from 'node:path';
import type { RemixKeyframeRole } from '../../../src/sceneforge/remix/types';

const REMIX_ROOT = 'sceneforge/remix';
const SOURCE_ASSETS_DIR = 'source-assets';
const VARIANTS_DIR = 'variants';
const ANALYSIS_DIR = 'analysis';
const DEBUG_DIR = 'debug';
const SEGMENTS_DIR = 'source_segments';
const EDITED_KEYFRAMES_DIR = 'edited_keyframes';
const SEGMENT_ADAPTATIONS_DIR = 'segment_adaptations';
const SEGMENT_DESIGN_OVERRIDES_DIR = 'segment_design_overrides';
const KEYFRAME_PROMPTS_DIR = 'keyframe_prompts';
const SEEDANCE_PROMPTS_DIR = 'seedance_prompts';
const PROMPT_BUNDLE_DIR = 'prompt_bundle';

function assertSafeId(kind: string, value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw new Error(`Invalid Remix ${kind}: ${value}`);
  }
}

function joinRemixPath(...parts: string[]): string {
  return path.posix.join(...parts);
}

function getFrameFileName(frameRole: RemixKeyframeRole): string {
  return frameRole === 'middle' ? 'middle_frame.png' : `${frameRole}_frame.png`;
}

function getEditedFrameFileName(frameRole: RemixKeyframeRole): string {
  return frameRole === 'middle'
    ? 'middle_frame_edited.png'
    : `${frameRole}_frame_edited.png`;
}

export function getRemixRootDir(): string {
  return REMIX_ROOT;
}

export function getRemixSourceAssetsDir(): string {
  return joinRemixPath(REMIX_ROOT, SOURCE_ASSETS_DIR);
}

export function getRemixSourceAssetDir(sourceAssetId: string): string {
  assertSafeId('sourceAssetId', sourceAssetId);
  return joinRemixPath(getRemixSourceAssetsDir(), sourceAssetId);
}

export function getRemixSourceManifestPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), 'source_manifest.json');
}

export function getRemixSourceProcessingJobsPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), 'processing_jobs.json');
}

export function getRemixSourceOverviewMarkdownPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), ANALYSIS_DIR, 'source_overview.md');
}

export function getRemixSourceOverviewJsonPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), ANALYSIS_DIR, 'source_overview.json');
}

export function getRemixSegmentAnalysisMarkdownPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), ANALYSIS_DIR, 'segment_analysis.md');
}

export function getRemixSegmentAnalysisJsonPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), ANALYSIS_DIR, 'segment_analysis.json');
}

export function getRemixDebugDir(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), DEBUG_DIR);
}

export function getRemixShotDetectionReportPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixDebugDir(sourceAssetId), 'shot_detection_result.json');
}

export function getRemixClipGenerationReportPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixDebugDir(sourceAssetId), 'clip_generation_report.json');
}

export function getRemixKeyframeReportPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixDebugDir(sourceAssetId), 'keyframe_report.json');
}

export function getRemixRuntimeDiagnosticsPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixDebugDir(sourceAssetId), 'runtime_diagnostics.json');
}

export function getRemixSourceSegmentsDir(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), SEGMENTS_DIR);
}

export function getRemixSegmentDir(sourceAssetId: string, segmentId: string): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(getRemixSourceSegmentsDir(sourceAssetId), segmentId);
}

export function getRemixSegmentManifestPath(sourceAssetId: string, segmentId: string): string {
  return joinRemixPath(getRemixSegmentDir(sourceAssetId, segmentId), 'segment_manifest.json');
}

export function getRemixSegmentManifestIndexPath(sourceAssetId: string): string {
  return joinRemixPath(getRemixSourceAssetDir(sourceAssetId), SEGMENTS_DIR, 'segment_manifest_index.json');
}

export function getRemixSegmentClipPath(sourceAssetId: string, segmentId: string): string {
  return joinRemixPath(getRemixSegmentDir(sourceAssetId, segmentId), 'source_clip.mp4');
}

export function getRemixSegmentKeyframePath(
  sourceAssetId: string,
  segmentId: string,
  frameRole: RemixKeyframeRole,
): string {
  return joinRemixPath(
    getRemixSegmentDir(sourceAssetId, segmentId),
    getFrameFileName(frameRole),
  );
}

export function getRemixVariantsDir(): string {
  return joinRemixPath(REMIX_ROOT, VARIANTS_DIR);
}

export function getRemixVariantDir(variantId: string): string {
  assertSafeId('variantId', variantId);
  return joinRemixPath(getRemixVariantsDir(), variantId);
}

export function getRemixVariantManifestPath(variantId: string): string {
  return joinRemixPath(getRemixVariantDir(variantId), 'variant_manifest.json');
}

export function getRemixVariantStrategyMarkdownPath(variantId: string): string {
  return joinRemixPath(getRemixVariantDir(variantId), 'remix_strategy.md');
}

export function getRemixVariantStrategyJsonPath(variantId: string): string {
  return joinRemixPath(getRemixVariantDir(variantId), 'remix_strategy.json');
}

export function getRemixVariantSegmentAdaptationMarkdownPath(
  variantId: string,
  segmentId: string,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    SEGMENT_ADAPTATIONS_DIR,
    `${segmentId}.md`,
  );
}

export function getRemixVariantSegmentAdaptationJsonPath(
  variantId: string,
  segmentId: string,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    SEGMENT_ADAPTATIONS_DIR,
    `${segmentId}.json`,
  );
}

export function getRemixVariantDesignMarkdownPath(variantId: string): string {
  return joinRemixPath(getRemixVariantDir(variantId), 'global_design.md');
}

export function getRemixVariantDesignJsonPath(variantId: string): string {
  return joinRemixPath(getRemixVariantDir(variantId), 'global_design.json');
}

export function getRemixVariantSegmentDesignOverridePath(
  variantId: string,
  segmentId: string,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    SEGMENT_DESIGN_OVERRIDES_DIR,
    `${segmentId}.json`,
  );
}

export function getRemixVariantKeyframePromptPath(
  variantId: string,
  segmentId: string,
  frameRole: RemixKeyframeRole,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    KEYFRAME_PROMPTS_DIR,
    segmentId,
    `${frameRole}.md`,
  );
}

export function getRemixVariantEditedKeyframePath(
  variantId: string,
  segmentId: string,
  frameRole: RemixKeyframeRole,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    EDITED_KEYFRAMES_DIR,
    segmentId,
    getEditedFrameFileName(frameRole),
  );
}

export function getRemixVariantSeedancePromptPath(
  variantId: string,
  segmentId: string,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    SEEDANCE_PROMPTS_DIR,
    `${segmentId}.md`,
  );
}

export function getRemixVariantSeedancePromptJsonPath(
  variantId: string,
  segmentId: string,
): string {
  assertSafeId('segmentId', segmentId);
  return joinRemixPath(
    getRemixVariantDir(variantId),
    SEEDANCE_PROMPTS_DIR,
    `${segmentId}.json`,
  );
}
