import fs from 'node:fs/promises';
import path from 'node:path';
import { getRemixVariantSegmentDesignOverridePath } from './remix-artifact-paths';
import { readStoredSourceAsset, readStoredVariant, writeStoredVariant } from './remix-store';
import { resolveProjectFile } from './remix-validators';

export class RemixDesignService {
  async run(projectDir: string, variantId: string) {
    const variantDocument = await readStoredVariant(projectDir, variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);
    const asset = sourceDocument.sourceAsset;

    const sections = [
      {
        id: 'global-cast',
        title: '全局人物与关系',
        body: `${variantDocument.variant.name} 保留原片攻防关系，但统一替换为新的身份设定。`,
      },
      {
        id: 'global-space',
        title: '场景与光线',
        body: `围绕「${variantDocument.variant.concept}」统一空间氛围，保持原片压迫感。`,
      },
      {
        id: 'global-style',
        title: '视觉风格',
        body: `引用强度采用 ${variantDocument.variant.referenceStrength}，避免偏离原始镜头结构。`,
      },
    ];

    const markdown = [
      '# Remix Design',
      '',
      ...sections.flatMap((section) => [`## ${section.title}`, section.body, '']),
    ].join('\n');
    const markdownPath = resolveProjectFile(projectDir, variantDocument.variant.designMarkdownPath ?? '');
    const jsonPath = resolveProjectFile(projectDir, variantDocument.variant.designJsonPath ?? '');
    await fs.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.writeFile(markdownPath, markdown, 'utf8');
    await fs.writeFile(jsonPath, `${JSON.stringify(sections, null, 2)}\n`, 'utf8');

    for (const segment of asset.segments) {
      const overridePath = resolveProjectFile(
        projectDir,
        getRemixVariantSegmentDesignOverridePath(variantId, segment.id),
      );
      await fs.mkdir(path.dirname(overridePath), { recursive: true });
      await fs.writeFile(
        overridePath,
        `${JSON.stringify(
          {
            segmentId: segment.id,
            title: segment.title,
            designIntent: `延续 ${variantDocument.variant.name} 的整体风格，并保持 ${segment.title} 的镜头边界。`,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }

    variantDocument.variant.currentStage = 'remix_design';
    variantDocument.variant.updatedAt = new Date().toISOString();
    variantDocument.variant.stageStatuses = {
      ...variantDocument.variant.stageStatuses,
      remix_strategy: 'approved',
      remix_design: 'approved',
      remix_keyframe_edit_prompts: 'ready_for_review',
    };
    variantDocument.creationStageStates = {
      ...variantDocument.creationStageStates,
      remix_strategy: 'approved',
      remix_design: 'approved',
      remix_keyframe_edit_prompts: 'ready_for_review',
    };
    await writeStoredVariant(projectDir, variantDocument);
    return variantDocument;
  }
}
