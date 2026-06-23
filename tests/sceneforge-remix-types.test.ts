import { describe, expect, it } from 'vitest';
import {
  REMIX_CREATION_STAGE_IDS,
  REMIX_IPC_NAMESPACE,
  REMIX_PIPELINE_ID,
  REMIX_ROUTE_PATTERNS,
  REMIX_STAGE_IDS,
  REMIX_TARGET_PLATFORM,
  type RemixAssetLibrarySnapshot,
  type RemixCreationWorkspaceSnapshot,
  type SourceAsset,
} from '../src/sceneforge/remix/types';

describe('sceneforge remix domain types', () => {
  it('defines the Remix pipeline, namespace and routes', () => {
    expect(REMIX_PIPELINE_ID).toBe('remix_reference');
    expect(REMIX_IPC_NAMESPACE).toBe('sceneForgeRemix');
    expect(REMIX_TARGET_PLATFORM).toBe('seedance_2_0');
    expect(REMIX_ROUTE_PATTERNS).toEqual({
      assetLibrary: '/remix/assets',
      assetProcessing: '/remix/assets/:sourceAssetId/process',
      assetDetails: '/remix/assets/:sourceAssetId',
      creationWorkspace: '/remix/projects/:variantId',
    });
  });

  it('locks the long-running Remix stage chain in order', () => {
    expect(REMIX_STAGE_IDS).toEqual([
      'remix_source_import',
      'remix_segmentation',
      'remix_keyframes',
      'remix_understanding',
      'remix_strategy',
      'remix_design',
      'remix_keyframe_edit_prompts',
      'edited_keyframes_review',
      'remix_video_prompts',
      'remix_publish',
    ]);
    expect(REMIX_CREATION_STAGE_IDS).toEqual([
      'remix_strategy',
      'remix_design',
      'remix_keyframe_edit_prompts',
      'edited_keyframes_review',
      'remix_video_prompts',
      'remix_publish',
    ]);
  });

  it('allows snapshots to carry frozen Remix domain objects', () => {
    const sourceAsset: SourceAsset = {
      id: 'source-001',
      title: '买瓜原片',
      status: 'published_to_library',
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
      sourceVideoPath: 'sceneforge/remix/source-assets/source-001/source.mp4',
      sourceManifestPath: 'sceneforge/remix/source-assets/source-001/source_manifest.json',
      transcriptPath: 'sceneforge/remix/source-assets/source-001/transcript.txt',
      srtPath: 'sceneforge/remix/source-assets/source-001/source.srt',
      videoMetadata: {
        durationMs: 12000,
        width: 1920,
        height: 1080,
        fps: 25,
        audioChannels: 2,
        hasAudio: true,
      },
      sourceOverviewMarkdownPath:
        'sceneforge/remix/source-assets/source-001/analysis/source_overview.md',
      sourceOverviewJsonPath:
        'sceneforge/remix/source-assets/source-001/analysis/source_overview.json',
      segmentAnalysisMarkdownPath:
        'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.md',
      segmentAnalysisJsonPath:
        'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.json',
      segments: [
        {
          id: 'segment-001',
          sourceAssetId: 'source-001',
          index: 1,
          title: '对峙开场',
          boundaryType: 'source_shot',
          timeRange: { startMs: 0, endMs: 6000, durationMs: 6000 },
          sourceClipPath:
            'sceneforge/remix/source-assets/source-001/source_segments/segment-001/source_clip.mp4',
          keyframes: [
            {
              id: 'frame-001',
              sourceAssetId: 'source-001',
              segmentId: 'segment-001',
              frameRole: 'first',
              timestampMs: 0,
              imagePath:
                'sceneforge/remix/source-assets/source-001/source_segments/segment-001/first_frame.png',
            },
          ],
          analysisMarkdownPath:
            'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.md',
          analysisJsonPath:
            'sceneforge/remix/source-assets/source-001/analysis/segment_analysis.json',
        },
      ],
      variantCount: 1,
      tags: ['经典片段'],
    };

    const library: RemixAssetLibrarySnapshot = {
      sourceAssets: [
        {
          id: sourceAsset.id,
          title: sourceAsset.title,
          status: sourceAsset.status,
          durationMs: sourceAsset.videoMetadata.durationMs,
          segmentCount: sourceAsset.segments.length,
          keyframeCount: sourceAsset.segments[0].keyframes.length,
          variantCount: sourceAsset.variantCount,
          updatedAt: sourceAsset.updatedAt,
        },
      ],
    };

    const workspace: RemixCreationWorkspaceSnapshot = {
      sourceAsset: library.sourceAssets[0],
      variant: {
        id: 'variant-001',
        sourceAssetId: sourceAsset.id,
        name: '动物拟人版',
        concept: '保持原片压迫感，改成动物黑帮对峙',
        referenceStrength: 'strong',
        retentionMatrix: {
          plotStructure: 'keep',
          characterRelationship: 'replace_identity',
          dialogueMeaning: 'rewrite',
          dialogueRhythm: 'keep',
          performanceAction: 'keep',
          cameraComposition: 'soft_keep',
          sceneEnvironment: 'replace',
          visualStyle: 'new_style',
          memeMechanism: 'enhance',
        },
        defaultGenerationMode: 'keyframes_plus_source_clip',
        segmentGenerationModeOverrides: { 'segment-001': 'keyframes_only' },
        createdAt: '2026-06-23T00:00:00.000Z',
        updatedAt: '2026-06-23T00:00:00.000Z',
        currentStage: 'remix_design',
        stageStatuses: {
          remix_strategy: 'approved',
          remix_design: 'running',
        },
        strategyMarkdownPath: 'sceneforge/remix/variants/variant-001/remix_strategy.md',
        strategyJsonPath: 'sceneforge/remix/variants/variant-001/remix_strategy.json',
        designMarkdownPath: 'sceneforge/remix/variants/variant-001/global_design.md',
        designJsonPath: 'sceneforge/remix/variants/variant-001/global_design.json',
      },
      keyframeEditPrompts: [
        {
          id: 'prompt-001',
          variantId: 'variant-001',
          sourceAssetId: sourceAsset.id,
          segmentId: 'segment-001',
          sourceKeyframeId: 'frame-001',
          frameRole: 'first',
          promptPath: 'sceneforge/remix/variants/variant-001/keyframe_prompts/segment-001/first.md',
          promptVersion: 1,
          createdAt: '2026-06-23T00:00:00.000Z',
        },
      ],
      editedKeyframes: [
        {
          id: 'edited-001',
          variantId: 'variant-001',
          segmentId: 'segment-001',
          frameRole: 'first',
          sourceFramePath:
            'sceneforge/remix/source-assets/source-001/source_segments/segment-001/first_frame.png',
          promptPath:
            'sceneforge/remix/variants/variant-001/keyframe_prompts/segment-001/first.md',
          editedFramePath:
            'sceneforge/remix/variants/variant-001/edited_keyframes/segment-001/first_frame_edited.png',
          status: 'approved',
          qualityChecks: [{ code: 'consistency', label: '角色一致性', passed: true }],
          createdAt: '2026-06-23T00:00:00.000Z',
          updatedAt: '2026-06-23T00:00:00.000Z',
        },
      ],
      seedancePrompts: [
        {
          id: 'seedance-001',
          variantId: 'variant-001',
          segmentId: 'segment-001',
          generationMode: 'keyframes_plus_source_clip',
          targetPlatform: 'seedance_2_0',
          structuredFields: {
            visual: '动物黑帮摊位对峙',
            motion: '保持压迫式前压',
            camera: '中近景缓推',
            performance: '克制到爆发',
            dialogue: '保留质问节奏，改成动物黑帮语气',
            voice: '低沉威胁感男声',
            soundEffects: '摊位碰撞和脚步声',
            ambientAudio: '街市环境底噪',
            negative: '避免现代电子屏和科幻灯光',
          },
          copyablePrompt: '【生成任务】动物黑帮摊位对峙',
          audioPlanPath: 'sceneforge/remix/variants/variant-001/audio_plan.json',
        },
      ],
      creationStageStates: {
        remix_strategy: 'approved',
        remix_design: 'running',
      },
    };

    expect(workspace.variant.referenceStrength).toBe('strong');
    expect(workspace.seedancePrompts[0].targetPlatform).toBe('seedance_2_0');
    expect(library.sourceAssets[0].segmentCount).toBe(1);
  });
});
