import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../electron/sceneforge/remix/remix-understanding-gate', () => ({
  validateRemixUnderstandingArtifacts: vi.fn(async () => ({
    ok: true,
    isPlaceholder: false,
    isStale: false,
    errors: [],
  })),
}));

import { evaluateRemixUnderstandingApproval } from '../electron/sceneforge/remix/remix-understanding-approval';
import { RemixTranscriptCorrectionService } from '../electron/sceneforge/remix/remix-transcript-correction-service';
import { getRemixSegmentTranscriptCorrectionJsonPath, getRemixSourceManifestPath } from '../electron/sceneforge/remix/remix-artifact-paths';
import type { SourceAsset } from '../src/sceneforge/remix/types';

describe('evaluateRemixUnderstandingApproval', () => {
  let projectDir: string;

  afterEach(async () => {
    if (projectDir) {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  it('returns canApprove when artifacts ok, fresh, and transcripts confirmed', async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remix-approve-'));
    const sourceAssetId = 'src-approve-1';
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

    const base = path.join(projectDir, `sceneforge/remix/source-assets/${sourceAssetId}`);
    await fs.mkdir(base, { recursive: true });
    const corrRel = getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, segmentId);
    const manifestRel = getRemixSourceManifestPath(sourceAssetId);
    await fs.mkdir(path.dirname(path.join(projectDir, manifestRel)), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, manifestRel),
      JSON.stringify({
        schema: 'sceneforge-remix-stored-source-asset',
        version: 1,
        sourceAsset: {
          ...sourceAsset,
          sourceManifestPath: manifestRel,
          segments: [
            {
              ...(sourceAsset.segments[0] as object),
              transcriptCorrectionPath: corrRel,
            },
          ],
        },
        processingStageStates: { remix_understanding: 'ready_for_review' },
      }),
      'utf8',
    );

    sourceAsset.sourceManifestPath = manifestRel;

    const overview = {
      artifactKind: 'source_understanding_rollup',
      sourceAssetId,
      segmentCount: 1,
      understoodSegmentCount: 1,
      segmentRefs: [{ segmentId, understandingPath: 'x' }],
      overall: { storyContent: '故事', summary: '摘要' },
      quality: { segmentCount: 1, understoodSegmentCount: 1 },
    };
    await fs.writeFile(path.join(base, 'source_overview.json'), JSON.stringify(overview), 'utf8');
    await fs.writeFile(
      path.join(base, 'segment_analysis.json'),
      JSON.stringify([
        {
          segmentId,
          understandingPath: `sceneforge/remix/source-assets/${sourceAssetId}/segments/${segmentId}/understanding.json`,
          title: 's1',
          generatedAt: new Date().toISOString(),
          inputHash: 'h1',
        },
      ]),
      'utf8',
    );

    await fs.mkdir(path.dirname(path.join(projectDir, corrRel)), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, corrRel),
      JSON.stringify({
        schema: 'sceneforge-remix-segment-transcript-correction',
        version: 1,
        sourceAssetId,
        segmentId,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inputRefs: {},
        transcript: {
          asrText: 'a',
          correctedText: 'a',
          effectiveText: 'a',
          correctionStatus: 'confirmed',
        },
        dialogueLines: [],
        quality: { needsHumanReview: false, warnings: [] },
      }),
      'utf8',
    );

    const understandingService = {
      validateUnderstandingFreshness: vi.fn(async () => ({
        sourceAssetId,
        isStale: false,
        staleSegmentIds: [],
        staleReasons: [],
        segmentReports: [],
        checkedAt: new Date().toISOString(),
      })),
    };

    const result = await evaluateRemixUnderstandingApproval(projectDir, sourceAssetId, {
      understandingService,
      transcriptCorrectionService: new RemixTranscriptCorrectionService(),
    });

    expect(result.canApprove).toBe(true);
    expect(result.nextStageStatus).toBe('approved');
  });
});