import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getRemixVariantSegmentAdaptationJsonPath,
  getRemixVariantSegmentAdaptationMarkdownPath,
} from './remix-artifact-paths';
import { readStoredSourceAsset, readStoredVariant, writeStoredVariant } from './remix-store';
import { resolveProjectFile } from './remix-validators';

export class RemixStrategyService {
  async run(projectDir: string, variantId: string) {
    const variantDocument = await readStoredVariant(projectDir, variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);
    const asset = sourceDocument.sourceAsset;
    const strategyItems = asset.segments.map((segment) => ({
      segmentId: segment.id,
      title: segment.title,
      keep:
        segment.index === 1
          ? '保留原片逼近和停顿结构。'
          : '保留原片攻防轮次与反打节奏。',
      change:
        segment.index === 1
          ? `将人物身份改为${variantDocument.variant.name}主题的核心角色。`
          : `围绕「${variantDocument.variant.concept}」重写对白与场景细节。`,
      risk:
        segment.boundaryType === 'long_segment'
          ? '长镜头容易拖慢节奏，需要靠动作节点稳住。'
          : '改写过猛会破坏构图和节奏连续性。',
    }));

    const markdown = [
      '# Remix Strategy',
      '',
      `- Variant：${variantDocument.variant.name}`,
      `- Concept：${variantDocument.variant.concept}`,
      '',
      ...strategyItems.flatMap((item) => [
        `## ${item.title}`,
        `- Keep：${item.keep}`,
        `- Change：${item.change}`,
        `- Risk：${item.risk}`,
        '',
      ]),
    ].join('\n');

    const markdownPath = resolveProjectFile(projectDir, variantDocument.variant.strategyMarkdownPath ?? '');
    const jsonPath = resolveProjectFile(projectDir, variantDocument.variant.strategyJsonPath ?? '');
    await fs.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.writeFile(markdownPath, markdown, 'utf8');
    await fs.writeFile(jsonPath, `${JSON.stringify(strategyItems, null, 2)}\n`, 'utf8');

    for (const item of strategyItems) {
      const itemMarkdownPath = resolveProjectFile(
        projectDir,
        getRemixVariantSegmentAdaptationMarkdownPath(variantId, item.segmentId),
      );
      const itemJsonPath = resolveProjectFile(
        projectDir,
        getRemixVariantSegmentAdaptationJsonPath(variantId, item.segmentId),
      );
      await fs.mkdir(path.dirname(itemMarkdownPath), { recursive: true });
      await fs.writeFile(
        itemMarkdownPath,
        `# ${item.title}\n\n- Keep：${item.keep}\n- Change：${item.change}\n- Risk：${item.risk}\n`,
        'utf8',
      );
      await fs.writeFile(itemJsonPath, `${JSON.stringify(item, null, 2)}\n`, 'utf8');
    }

    variantDocument.variant.currentStage = 'remix_strategy';
    variantDocument.variant.updatedAt = new Date().toISOString();
    variantDocument.variant.stageStatuses = {
      ...variantDocument.variant.stageStatuses,
      remix_strategy: 'approved',
      remix_design: 'ready_for_review',
    };
    variantDocument.creationStageStates = {
      ...variantDocument.creationStageStates,
      remix_strategy: 'approved',
      remix_design: 'ready_for_review',
    };
    await writeStoredVariant(projectDir, variantDocument);
    return variantDocument;
  }
}
