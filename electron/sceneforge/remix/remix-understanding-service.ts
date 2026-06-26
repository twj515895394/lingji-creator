import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildRemixUnderstandingInputFingerprint,
  REMIX_UNDERSTANDING_PLACEHOLDER_KIND,
} from './remix-understanding-gate';
import { assertSourceAssetStageReady, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';

function buildSourceOverviewMarkdown(document: StoredSourceAssetDocument): string {
  const asset = document.sourceAsset;
  return [
    '# Source Overview',
    '',
    `- 标题：${asset.title}`,
    `- Source Asset：${asset.id}`,
    `- 镜头分段：${asset.segments.length}`,
    `- 总时长：${Math.round(asset.videoMetadata.durationMs / 1000)} 秒`,
    '',
    '## 处理结论',
    '',
    '这份原片已经完成切片与关键帧抽取，可以作为 Remix Variant 的引用底稿。',
  ].join('\n');
}

function buildSegmentAnalysisMarkdown(document: StoredSourceAssetDocument): string {
  return [
    '# Segment Analysis',
    '',
    ...document.sourceAsset.segments.flatMap((segment) => [
      `## ${segment.title}`,
      `- 时间范围：${segment.timeRange.startMs}ms - ${segment.timeRange.endMs}ms`,
      `- 边界类型：${segment.boundaryType}`,
      `- 关键帧数量：${segment.keyframes.length}`,
      '- 备注：保留当前段的表演节奏和动作转折。',
      '',
    ]),
  ].join('\n');
}

export class RemixUnderstandingService {
  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    assertSourceAssetStageReady(document, 'remix_keyframes');

    const overviewMarkdown = buildSourceOverviewMarkdown(document);
    const segmentAnalysisMarkdown = buildSegmentAnalysisMarkdown(document);
    const overviewMarkdownPath = resolveProjectFile(projectDir, document.sourceAsset.sourceOverviewMarkdownPath ?? '');
    const segmentAnalysisMarkdownPath = resolveProjectFile(projectDir, document.sourceAsset.segmentAnalysisMarkdownPath ?? '');
    const overviewJsonPath = resolveProjectFile(projectDir, document.sourceAsset.sourceOverviewJsonPath ?? '');
    const segmentAnalysisJsonPath = resolveProjectFile(projectDir, document.sourceAsset.segmentAnalysisJsonPath ?? '');

    await fs.mkdir(path.dirname(overviewMarkdownPath), { recursive: true });
    await fs.mkdir(path.dirname(segmentAnalysisMarkdownPath), { recursive: true });

    await fs.writeFile(
      overviewMarkdownPath,
      overviewMarkdown,
      'utf8',
    );
    await fs.writeFile(
      segmentAnalysisMarkdownPath,
      segmentAnalysisMarkdown,
      'utf8',
    );
    const inputHash = buildRemixUnderstandingInputFingerprint(document);
    await fs.writeFile(
      overviewJsonPath,
      `${JSON.stringify(
        {
          artifactKind: REMIX_UNDERSTANDING_PLACEHOLDER_KIND,
          artifactStatus: 'placeholder',
          title: document.sourceAsset.title,
          sourceAssetId: document.sourceAsset.id,
          segmentCount: document.sourceAsset.segments.length,
          durationMs: document.sourceAsset.videoMetadata.durationMs,
          inputHash,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await fs.writeFile(
      segmentAnalysisJsonPath,
      `${JSON.stringify(
        document.sourceAsset.segments.map((segment) => ({
          segmentId: segment.id,
          artifactKind: REMIX_UNDERSTANDING_PLACEHOLDER_KIND,
          artifactStatus: 'placeholder',
          title: segment.title,
          boundaryType: segment.boundaryType,
          durationMs: segment.timeRange.durationMs,
          keyframeCount: segment.keyframes.length,
        })),
        null,
        2,
      )}\n`,
      'utf8',
    );

    document.sourceAsset.status = 'ready_for_review';
    document.sourceAsset.updatedAt = new Date().toISOString();
    document.processingStageStates.remix_understanding = 'ready_for_review';
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
