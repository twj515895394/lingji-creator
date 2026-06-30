import fs from 'node:fs/promises';
import type { SourceSegment } from '../../../src/sceneforge/remix/types';
import { getRemixSegmentUnderstandingJsonPath } from './remix-artifact-paths';
import { loadRemixUnderstandingWorkbench, type RemixUnderstandingWorkbenchSnapshot } from './remix-understanding-workbench';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';
import { resolveProjectFile } from './remix-validators';
import type { RemixSegmentUnderstandingDocument } from './remix-segment-understanding-schema';

async function readSegmentUnderstanding(
  projectDir: string,
  segment: SourceSegment,
): Promise<{ doc: RemixSegmentUnderstandingDocument; absPath: string } | null> {
  const relPath =
    segment.analysisJsonPath?.trim() ||
    getRemixSegmentUnderstandingJsonPath(segment.sourceAssetId, segment.id);
  const absPath = resolveProjectFile(projectDir, relPath);
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    const doc = JSON.parse(raw) as RemixSegmentUnderstandingDocument;
    if (doc.schema !== 'sceneforge-remix-segment-understanding') {
      return null;
    }
    return { doc, absPath };
  } catch {
    return null;
  }
}

export class RemixSegmentVideoPromptEditService {
  async updateSegmentPositiveVideoPrompt(
    projectDir: string,
    sourceAssetId: string,
    segmentId: string,
    positiveText: string,
    negativeText?: string | null,
  ): Promise<RemixUnderstandingWorkbenchSnapshot> {
    const stored = await readStoredSourceAsset(projectDir, sourceAssetId);
    const segment = stored.sourceAsset.segments.find((s) => s.id === segmentId);
    if (!segment) {
      throw new Error(`未找到片段：${segmentId}`);
    }

    const existing = await readSegmentUnderstanding(projectDir, segment);
    if (!existing) {
      throw new Error('本段尚无理解产物，请先生成或重跑本段理解。');
    }

    const trimmed = positiveText.trim();
    if (!trimmed) {
      throw new Error('正向 Video Prompt 不能为空。');
    }

    const now = new Date().toISOString();
    existing.doc.videoPrompt.fullChinesePrompt = trimmed;
    existing.doc.videoPrompt.manualPositivePromptOverride = true;
    if (negativeText !== undefined && negativeText !== null) {
      existing.doc.videoPrompt.negativePrompt = negativeText.trim();
    }
    existing.doc.videoPromptText = trimmed;
    existing.doc.generatedAt = now;
    const warnings = new Set(existing.doc.quality?.warnings ?? []);
    warnings.add('正向 Video Prompt 已人工修订');
    existing.doc.quality = {
      ...existing.doc.quality,
      warnings: Array.from(warnings),
      needsHumanReview: false,
    };

    await fs.writeFile(existing.absPath, `${JSON.stringify(existing.doc, null, 2)}\n`, 'utf8');

    segment.analysisJsonPath =
      segment.analysisJsonPath?.trim() ||
      getRemixSegmentUnderstandingJsonPath(sourceAssetId, segmentId);
    stored.sourceAsset.updatedAt = now;
    await writeStoredSourceAsset(projectDir, stored);

    return loadRemixUnderstandingWorkbench(projectDir, stored.sourceAsset);
  }
}