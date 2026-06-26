import { describe, expect, it } from 'vitest';
import {
  getRemixRootDir,
  getRemixSegmentClipPath,
  getRemixSegmentKeyframePath,
  getRemixSegmentManifestIndexPath,
  getRemixSegmentManifestPath,
  getRemixSourceManifestPath,
  getRemixSourceAudioJsonPath,
  getRemixSourceAudioWavPath,
  getRemixSegmentAudioWavPath,
  getRemixOriginalUnderstandingJsonPath,
  getRemixSourceOverviewJsonPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixVariantDesignJsonPath,
  getRemixVariantEditedKeyframePath,
  getRemixVariantKeyframePromptPath,
  getRemixVariantPromptBundlePath,
  getRemixVariantSeedancePromptPath,
  getRemixVariantSegmentAdaptationMarkdownPath,
  getRemixVariantStrategyMarkdownPath,
} from '../electron/sceneforge/remix/remix-artifact-paths';

describe('sceneforge remix artifact paths', () => {
  it('builds isolated Source Asset paths under sceneforge/remix', () => {
    expect(getRemixRootDir()).toBe('sceneforge/remix');
    expect(getRemixSourceManifestPath('source-001')).toBe(
      'sceneforge/remix/source-assets/source-001/source_manifest.json',
    );
    expect(getRemixSourceOverviewJsonPath('source-001')).toBe(
      'sceneforge/remix/source-assets/source-001/analysis/source_overview.json',
    );
    expect(getRemixOriginalUnderstandingJsonPath('source-001')).toBe(
      'sceneforge/remix/source-assets/source-001/analysis/original_understanding.json',
    );
    expect(getRemixSegmentUnderstandingJsonPath('source-001', 'segment-001')).toBe(
      'sceneforge/remix/source-assets/source-001/source_segments/segment-001/segment_understanding.json',
    );
    expect(getRemixSegmentManifestIndexPath('source-001')).toBe(
      'sceneforge/remix/source-assets/source-001/source_segments/segment_manifest_index.json',
    );
    expect(getRemixSegmentManifestPath('source-001', 'segment-001')).toBe(
      'sceneforge/remix/source-assets/source-001/source_segments/segment-001/segment_manifest.json',
    );
    expect(getRemixSourceAudioWavPath('source-001')).toBe(
      'sceneforge/remix/source-assets/source-001/audio/source_audio.wav',
    );
    expect(getRemixSourceAudioJsonPath('source-001')).toBe(
      'sceneforge/remix/source-assets/source-001/audio/source_audio.json',
    );
    expect(getRemixSegmentClipPath('source-001', 'segment-001')).toBe(
      'sceneforge/remix/source-assets/source-001/source_segments/segment-001/source_clip.mp4',
    );
    expect(getRemixSegmentAudioWavPath('source-001', 'segment-001')).toBe(
      'sceneforge/remix/source-assets/source-001/source_segments/segment-001/audio/segment_audio.wav',
    );
    expect(getRemixSegmentKeyframePath('source-001', 'segment-001', 'middle')).toBe(
      'sceneforge/remix/source-assets/source-001/source_segments/segment-001/middle_frame.png',
    );
  });

  it('builds isolated Variant paths without mutating Source Asset storage', () => {
    expect(getRemixVariantStrategyMarkdownPath('variant-001')).toBe(
      'sceneforge/remix/variants/variant-001/remix_strategy.md',
    );
    expect(getRemixVariantDesignJsonPath('variant-001')).toBe(
      'sceneforge/remix/variants/variant-001/global_design.json',
    );
    expect(getRemixVariantSegmentAdaptationMarkdownPath('variant-001', 'segment-001')).toBe(
      'sceneforge/remix/variants/variant-001/segment_adaptations/segment-001.md',
    );
    expect(getRemixVariantKeyframePromptPath('variant-001', 'segment-001', 'first')).toBe(
      'sceneforge/remix/variants/variant-001/keyframe_prompts/segment-001/first.md',
    );
    expect(getRemixVariantEditedKeyframePath('variant-001', 'segment-001', 'last')).toBe(
      'sceneforge/remix/variants/variant-001/edited_keyframes/segment-001/last_frame_edited.png',
    );
    expect(getRemixVariantSeedancePromptPath('variant-001', 'segment-001')).toBe(
      'sceneforge/remix/variants/variant-001/seedance_prompts/segment-001.md',
    );
    expect(getRemixVariantPromptBundlePath('variant-001')).toBe(
      'sceneforge/remix/variants/variant-001/prompt_bundle.zip',
    );
  });

  it('rejects unsafe ids before they can escape the project tree', () => {
    expect(() => getRemixSourceManifestPath('../escape')).toThrow(/Invalid Remix sourceAssetId/);
    expect(() => getRemixVariantStrategyMarkdownPath('variant/001')).toThrow(
      /Invalid Remix variantId/,
    );
  });
});
