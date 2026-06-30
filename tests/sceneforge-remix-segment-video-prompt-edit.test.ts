import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getRemixSegmentUnderstandingJsonPath } from '../electron/sceneforge/remix/remix-artifact-paths';
import { RemixSegmentVideoPromptEditService } from '../electron/sceneforge/remix/remix-segment-video-prompt-edit-service';
import { getRemixSourceManifestPath } from '../electron/sceneforge/remix/remix-artifact-paths';
import type { SourceAsset } from '../src/sceneforge/remix/types';

describe('RemixSegmentVideoPromptEditService', () => {
  let projectDir: string;

  afterEach(async () => {
    if (projectDir) {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('persists manual positive prompt override', async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remix-vp-edit-'));
    const sourceAssetId = 'src-vp-1';
    const segmentId = 'seg-1';
    const sourceAsset = {
      id: sourceAssetId,
      title: 't',
      status: 'processing',
      segments: [
        {
          id: segmentId,
          index: 1,
          title: 's1',
          sourceAssetId,
          boundaryType: 'source_shot',
          timeRange: { startMs: 0, endMs: 1000, durationMs: 1000 },
          keyframes: [],
          reviewStatus: 'approved',
        },
      ],
      sourceOverviewJsonPath: `sceneforge/remix/source-assets/${sourceAssetId}/source_overview.json`,
      segmentAnalysisJsonPath: `sceneforge/remix/source-assets/${sourceAssetId}/segment_analysis.json`,
      updatedAt: new Date().toISOString(),
    } as unknown as SourceAsset;

    const manifestRel = getRemixSourceManifestPath(sourceAssetId);
    const analysisRel = getRemixSegmentUnderstandingJsonPath(sourceAssetId, segmentId);
    await fs.mkdir(path.dirname(path.join(projectDir, manifestRel)), { recursive: true });
    await fs.mkdir(path.dirname(path.join(projectDir, analysisRel)), { recursive: true });

    await fs.writeFile(
      path.join(projectDir, analysisRel),
      JSON.stringify({
        schema: 'sceneforge-remix-segment-understanding',
        version: 2,
        segmentId,
        sourceAssetId,
        title: 's1',
        mode: 'balanced',
        promptVersion: 'balanced-mvp-v2.2',
        inputHash: 'h1',
        generatedAt: new Date().toISOString(),
        visual: { sceneSummary: 'x', mainAction: 'a', characters: [], environmentDetails: 'e', lighting: 'l', colorTone: 'c' },
        camera: { shotSize: '中景', angle: '平视', movement: '固定', composition: '居中', focus: '人', editingRole: '叙事' },
        audio: { speechSummary: '', dialogue: [], ambient: '', music: '', silenceOrPause: '' },
        story: { plotFunction: 'p', emotion: '', conflict: '', beforeAfterRelation: '' },
        remix: { keepElements: [], replaceableElements: [], rewriteIdeas: [], reuseScenarios: [], riskNotes: [] },
        videoPrompt: {
          language: 'zh-CN',
          fullChinesePrompt: '旧文案',
          subjectPrompt: '主体',
          scenePrompt: '场景',
          actionPrompt: '动作',
          performancePrompt: '表演',
          cameraPrompt: '镜头',
          lightingPrompt: '光',
          colorPrompt: '色',
          emotionPrompt: '情',
          rhythmPrompt: '节奏',
          dialoguePrompt: '对白',
          soundPrompt: '声',
          stylePrompt: '风',
          continuityPrompt: '连',
          remixControlPrompt: '控',
          negativePrompt: '负',
        },
        quality: { confidence: 1, missingInputs: [], needsHumanReview: false, warnings: [] },
        videoPromptText: '旧文案',
      }),
      'utf8',
    );

    await fs.writeFile(
      path.join(projectDir, manifestRel),
      JSON.stringify({
        schema: 'sceneforge-remix-stored-source-asset',
        version: 1,
        sourceAsset: {
          ...sourceAsset,
          sourceManifestPath: manifestRel,
          segments: [{ ...sourceAsset.segments[0], analysisJsonPath: analysisRel }],
        },
        processingStageStates: {},
      }),
      'utf8',
    );

    const service = new RemixSegmentVideoPromptEditService();
    const workbench = await service.updateSegmentPositiveVideoPrompt(
      projectDir,
      sourceAssetId,
      segmentId,
      '【人物主体】人工修订后的完整正向提示',
    );

    expect(workbench.segments[0].videoPrompt.fullChinesePrompt).toContain('人工修订');

    const saved = JSON.parse(await fs.readFile(path.join(projectDir, analysisRel), 'utf8'));
    expect(saved.videoPrompt.manualPositivePromptOverride).toBe(true);
    expect(saved.videoPrompt.fullChinesePrompt).toContain('人工修订');
  });
});