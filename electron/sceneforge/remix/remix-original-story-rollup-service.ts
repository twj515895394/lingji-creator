import fs from 'node:fs/promises';
import path from 'node:path';
import { generateStructuredData } from '../../../src/lib/llm';
import type { AISettings } from '../../../src/types/ai';
import {
  readStoredSourceAsset,
  readStoredSourceAssetJobs,
  writeStoredSourceAsset,
} from './remix-store';
import { resolveProjectFile } from './remix-validators';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
} from './remix-artifact-paths';
import {
  buildOriginalUnderstandingDocument,
  buildOriginalUnderstandingSummaryMarkdown,
  buildSourceOverviewIndexDocument,
} from './remix-source-understanding-rollup';
import {
  toGateSegmentUnderstandingItem,
  type RemixSegmentUnderstandingDocument,
} from './remix-segment-understanding-schema';
import { buildRemixUnderstandingInputFingerprint } from './remix-understanding-gate';
import type {
  RemixUnderstandingGateSegmentItem,
} from './remix-understanding-gate';

export interface RemixOriginalStoryRollupServiceOptions {
  generateStructuredData?: typeof generateStructuredData;
}

export class RemixOriginalStoryRollupService {
  private readonly generateStructured: typeof generateStructuredData;

  constructor(options: RemixOriginalStoryRollupServiceOptions = {}) {
    this.generateStructured = options.generateStructuredData ?? generateStructuredData;
  }

  async runStoryRollup(
    projectDir: string,
    sourceAssetId: string,
    settings: AISettings,
  ) {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const generatedAt = new Date().toISOString();

    const overviewMarkdownPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.sourceOverviewMarkdownPath ?? '',
    );
    const segmentAnalysisMarkdownPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.segmentAnalysisMarkdownPath ?? '',
    );
    const overviewJsonPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.sourceOverviewJsonPath ?? '',
    );
    const segmentAnalysisJsonPath = resolveProjectFile(
      projectDir,
      document.sourceAsset.segmentAnalysisJsonPath ?? '',
    );

    await fs.mkdir(path.dirname(overviewMarkdownPath), { recursive: true });
    await fs.mkdir(path.dirname(segmentAnalysisMarkdownPath), { recursive: true });

    // 加载并读取所有已经生成的片段理解 JSON 文件
    const orderedDocuments: RemixSegmentUnderstandingDocument[] = [];
    const failures: Array<{ segmentId: string; error: string }> = [];

    for (const segment of document.sourceAsset.segments) {
      const relPath =
        segment.analysisJsonPath?.trim() ||
        getRemixSegmentUnderstandingJsonPath(sourceAssetId, segment.id);
      const absPath = resolveProjectFile(projectDir, relPath);
      try {
        const content = await fs.readFile(absPath, 'utf8');
        const parsed = JSON.parse(content);
        let understanding: RemixSegmentUnderstandingDocument | null = null;

        if (Array.isArray(parsed)) {
          const matched = parsed.find(
            (item: any) => item && (item.segmentId === segment.id || item.id === segment.id),
          );
          if (matched) {
            understanding = matched as RemixSegmentUnderstandingDocument;
          }
        } else if (parsed && typeof parsed === 'object') {
          understanding = parsed as RemixSegmentUnderstandingDocument;
        }

        if (understanding) {
          if (!understanding.segmentId) {
            understanding.segmentId = segment.id;
          }
          orderedDocuments.push(understanding);
        } else {
          failures.push({
            segmentId: segment.id,
            error: '未找到该片段对应的片段理解数据',
          });
        }
      } catch (err) {
        failures.push({
          segmentId: segment.id,
          error: `读取或解析片段理解失败: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const sourceOverviewRel = document.sourceAsset.sourceOverviewJsonPath ?? '';
    const segmentAnalysisRel = document.sourceAsset.segmentAnalysisJsonPath ?? '';
    const originalUnderstandingRel = getRemixOriginalUnderstandingJsonPath(sourceAssetId);
    const originalUnderstandingPath = resolveProjectFile(projectDir, originalUnderstandingRel);

    let storyContent = '';
    let storySummaryShort = '';
    let logline = '';
    let eventChain: string[] = [];
    let characterMap: Array<{ nameOrRole: string; description: string; relation?: string | null }> = [];
    let mainConflict = '轻度戏剧张力';
    let emotionCurve = '情绪平稳推进';
    let visualStyle = '写实中性影像风格';
    let dialogueStyle = '日常口语风格';
    let keyTurns: string[] = [];
    let remixIdeas: string[] = [];
    let rollupFallbackUsed = false;
    const errors: string[] = [];

    // 若有片段未生成成功，直接记入错误但允许跑 Rollup (可能以空值兜底或仅对已成功片段做串联)
    if (failures.length > 0) {
      errors.push(...failures.map((f) => `[片段 ${f.segmentId}] ${f.error}`));
    }

    if (orderedDocuments.length === 0) {
      rollupFallbackUsed = true;
      errors.push('没有找到任何有效的片段理解 JSON 数据，无法运行全片串联。');
    } else {
      try {
        const segmentLines = orderedDocuments
          .map((doc, idx) => {
            const segment = document.sourceAsset.segments.find((s) => s.id === doc.segmentId);
            const segmentIndex = segment ? segment.index : idx + 1;
            return `片段 ${segmentIndex} (标题: ${doc.title}):
- 动作: ${doc.visual?.mainAction || '（无）'}
- 台词: ${(doc.audio as { speechSummary?: string })?.speechSummary || '（无）'}
- 功能: ${doc.story?.plotFunction || '（无）'}`;
          })
          .join('\n\n');

        const systemPrompt = `你是一个专业的影视与剪辑内容理解大师。
你现在拿到了一个视频中所有片段的结构化分析数据（包含画面动作、镜头规格、台词摘要、剧情功能等）。
请不要对每个片段进行简单的摘要或流水账式罗列，而是将这些片段的内容和发展脉络有机地串联起来，重新整理成一个连贯的、讲得清清楚楚的整体故事内容。

请输出以下格式的 JSON 对象：
{
  "logline": "一句话故事核心梗概（50字以内）",
  "storySummaryShort": "300字以内的剧情摘要（用于快速扫读，侧重核心起因、经过和结局）",
  "storyContent": "600-1200字完整视频故事解说内容（要求戏剧因果关系强，结构连贯，包含主要情节和情绪走向）",
  "eventChain": ["核心事件轴节点 1", "核心事件轴节点 2", "核心事件轴节点 3"],
  "characterMap": [
    { "nameOrRole": "主要人物名称或特征角色", "description": "在此原片中的人物特征和定位", "relation": "与其他人物或冲突的关系" }
  ],
  "mainConflict": "全片最核心的戏剧冲突",
  "keyTurns": ["关键转折点 1", "关键转折点 2"],
  "emotionCurve": "情绪起伏走向（例如：平缓推进 -> 爆发 -> 舒缓）",
  "visualStyle": "全片画面色调与镜头风格归纳",
  "dialogueStyle": "全片人物对话或旁白台词特色",
  "remixPotential": ["建议的二创剪辑方向 1", "建议的二创剪辑方向 2", "建议的二创剪辑方向 3"]
}

要求：
1. storyContent 必须讲清楚发生了什么事，不要使用“片段1做了什么，片段2做了什么”这种断裂的结构，而要作为一个连贯的故事进行叙述。
2. 所有自然语言字段必须使用中文。
3. 只返回合法的 JSON，不要包含任何前言、后记或 Markdown 标记。`;

        const userPrompt = `原片标题: ${document.sourceAsset.title}
片段详细列表:
${segmentLines}

请将以上片段重新梳理串联，输出完整连贯的故事内容与二创建议：`;

        const rollupPayload = await this.generateStructured(
          settings,
          systemPrompt,
          userPrompt,
          undefined,
          { label: `remix-source-understanding-rollup:${sourceAssetId}` },
        );

        if (typeof rollupPayload.storyContent === 'string' && rollupPayload.storyContent.trim()) {
          storyContent = rollupPayload.storyContent.trim();
        }
        if (typeof rollupPayload.storySummaryShort === 'string' && rollupPayload.storySummaryShort.trim()) {
          storySummaryShort = rollupPayload.storySummaryShort.trim();
        }
        if (typeof rollupPayload.logline === 'string' && rollupPayload.logline.trim()) {
          logline = rollupPayload.logline.trim();
        }
        if (Array.isArray(rollupPayload.eventChain)) {
          eventChain = rollupPayload.eventChain.map(String).filter(Boolean);
        }
        if (Array.isArray(rollupPayload.characterMap)) {
          characterMap = rollupPayload.characterMap.filter(
            (item: any) => item && typeof item === 'object' && item.nameOrRole,
          );
        }
        if (typeof rollupPayload.mainConflict === 'string') {
          mainConflict = rollupPayload.mainConflict.trim();
        }
        if (typeof rollupPayload.emotionCurve === 'string') {
          emotionCurve = rollupPayload.emotionCurve.trim();
        }
        if (typeof rollupPayload.visualStyle === 'string') {
          visualStyle = rollupPayload.visualStyle.trim();
        }
        if (typeof rollupPayload.dialogueStyle === 'string') {
          dialogueStyle = rollupPayload.dialogueStyle.trim();
        }
        if (Array.isArray(rollupPayload.keyTurns)) {
          keyTurns = rollupPayload.keyTurns.map(String).filter(Boolean);
        }
        if (Array.isArray(rollupPayload.remixPotential) && rollupPayload.remixPotential.length > 0) {
          remixIdeas = rollupPayload.remixPotential.map(String).filter(Boolean);
        }
      } catch (err) {
        rollupFallbackUsed = true;
        errors.push(`AI 故事串联执行失败: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Failed to generate AI rollup summary, using fallback:', err);
      }
    }

    const originalUnderstanding = buildOriginalUnderstandingDocument({
      document,
      segmentDocuments: orderedDocuments,
      generatedAt,
      failedSegmentCount: failures.length,
      sourceOverviewPath: sourceOverviewRel,
      segmentAnalysisPath: segmentAnalysisRel,
      logline,
      storySummaryShort,
      storyContent,
      eventChain,
      characterMap,
      remixIdeas,
      rollupFallbackUsed,
      errors,
    });

    const realHash = buildRemixUnderstandingInputFingerprint(document);
    const overviewIndex = buildSourceOverviewIndexDocument({
      original: originalUnderstanding,
      originalUnderstandingPath: originalUnderstandingRel,
      inputHash: realHash,
      partialFailures: failures,
    });

    const segmentAnalysisIndex = orderedDocuments.map((doc) => ({
      ...toGateSegmentUnderstandingItem(doc),
      understandingPath:
        document.sourceAsset.segments.find((segment) => segment.id === doc.segmentId)?.analysisJsonPath ??
        getRemixSegmentUnderstandingJsonPath(sourceAssetId, doc.segmentId),
      title: doc.title,
      generatedAt: doc.generatedAt,
      inputHash: doc.inputHash,
    }));

    await fs.mkdir(path.dirname(originalUnderstandingPath), { recursive: true });
    await fs.writeFile(
      overviewMarkdownPath,
      buildOriginalUnderstandingSummaryMarkdown(originalUnderstanding),
      'utf8',
    );
    await fs.writeFile(
      originalUnderstandingPath,
      `${JSON.stringify(originalUnderstanding, null, 2)}\n`,
      'utf8',
    );
    await fs.writeFile(overviewJsonPath, `${JSON.stringify(overviewIndex, null, 2)}\n`, 'utf8');

    // 重新输出片段聚合清单以保证数据完整
    await fs.writeFile(
      segmentAnalysisJsonPath,
      `${JSON.stringify(segmentAnalysisIndex, null, 2)}\n`,
      'utf8',
    );

    // 更新 project.json 状态
    document.sourceAsset.updatedAt = generatedAt;
    // 即使 Rollup 失败，片段级也是全部完成了的，因此可以标记为 ready_for_review
    document.sourceAsset.status = failures.length > 0 ? 'processing' : 'ready_for_review';
    document.processingStageStates.remix_understanding =
      failures.length > 0 ? 'needs_input' : 'ready_for_review';
    await writeStoredSourceAsset(projectDir, document);

    return document;
  }
}
