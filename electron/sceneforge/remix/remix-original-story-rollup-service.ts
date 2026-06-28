import fs from 'node:fs/promises';
import path from 'node:path';
import { generateStructuredData } from '../../../src/lib/llm';
import type { AISettings } from '../../../src/types/ai';
import {
  readStoredSourceAsset,
  writeStoredSourceAsset,
} from './remix-store';
import { resolveProjectFile } from './remix-validators';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
  getRemixSegmentFrameVisionJsonPath,
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
    const warnings: string[] = [];

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

          // 校验是否缺失 V2 特有的大块字段，若缺失则记入 warnings 并作为 V1 fallback 处理
          const isV1 = !understanding.visual || !understanding.audio || !understanding.story;
          if (isV1) {
            const hasMarked = warnings.some(w => w.includes('使用旧版 V1 数据'));
            if (!hasMarked) {
              warnings.push(`片段 ${segment.id} 缺少 V2 细粒度描述，已退化为 V1 数据汇总`);
            }
          }
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

    let logline = '';
    let storySummaryShort = '';
    let storyContent = '';
    let eventChain: string[] = [];
    let characterMap: Array<{ nameOrRole: string; description: string; relation?: string | null }> = [];
    let mainConflict = '';
    let keyTurns: string[] = [];
    let emotionCurve = '';
    let visualStyle = '';
    let dialogueStyle = '';

    // remixStrategy 字段
    let keepMust: string[] = [];
    let canReplace: string[] = [];
    let rewriteDirections: Array<{
      title: string;
      idea: string;
      suitableStyle: string;
      requiredSegments: string[];
      risk: string;
    }> = [];
    let suggestedTags: string[] = [];

    let rollupFallbackUsed = false;
    const errors: string[] = [];

    if (failures.length > 0) {
      errors.push(...failures.map((f) => `[片段 ${f.segmentId}] ${f.error}`));
    }

    if (orderedDocuments.length === 0) {
      rollupFallbackUsed = true;
      errors.push('没有找到任何有效的片段理解 JSON 数据，无法运行全片故事汇总。');
    } else {
      try {
        const segmentLines: string[] = [];
        for (let i = 0; i < orderedDocuments.length; i++) {
          const doc = orderedDocuments[i];
          const segment = document.sourceAsset.segments.find((s) => s.id === doc.segmentId);
          const segmentIndex = segment ? segment.index : i + 1;

          // 获取这一段的 frame_vision (如果存在的话)
          let fvDesc = '';
          if (segment) {
            const fvPath = resolveProjectFile(
              projectDir,
              getRemixSegmentFrameVisionJsonPath(sourceAssetId, segment.id),
            );
            try {
              const fvContent = await fs.readFile(fvPath, 'utf8');
              const fv = JSON.parse(fvContent);
              if (fv?.segmentVisualSummary) {
                fvDesc = `关键帧视觉：${fv.segmentVisualSummary}`;
              }
            } catch {
              // 忽略
            }
          }

          const action = doc.visual?.mainAction || (doc as any).mainAction || '（无）';
          const env = doc.visual?.environmentDetails || '（无）';
          const speech = doc.audio?.speechSummary || (doc.audio as any)?.speechSummary || '（无）';
          const functionStr = doc.story?.plotFunction || doc.story?.plotFunction || '（无）';
          const conflict = doc.story?.conflict || '（无）';
          const emotion = doc.story?.emotion || '（无）';

          segmentLines.push([
            `片段 ${segmentIndex} (ID: ${doc.segmentId}, 标题: ${doc.title}):`,
            `- 画面环境: ${env}`,
            `- 主要动作: ${action}`,
            fvDesc ? `- ${fvDesc}` : '',
            `- 台词摘要: ${speech}`,
            `- 剧情功能: ${functionStr}`,
            `- 戏剧冲突: ${conflict}`,
            `- 情绪基调: ${emotion}`,
          ].filter(Boolean).join('\n'));
        }

        const systemPrompt = `你是一个专业的影视剧理解与剪辑专家。
你现在拿到了一个视频中所有片段的结构化分析数据（包含环境、镜头、动作、台词、情绪冲突、剧情功能等）。
请不要对每个片段进行简单的流水账式摘要，而是要将这些片段的内容和发展脉络有机地串联起来，重新整理成一个连贯的、讲得清清楚楚的整体故事，并且评估出合理的二创剪辑策略。

请输出以下格式的 JSON 对象：
{
  "logline": "一句话故事核心梗概（50字以内）",
  "storySummaryShort": "300字以内的剧情摘要（侧重核心起因、经过和结局）",
  "storyContent": "600-1200字完整视频故事解说内容（要求戏剧因果关系强，结构连贯，包含主要情节和情绪走向，不能使用“片段1做了什么，片段2做了什么”这种断裂结构）",
  "eventChain": ["核心事件轴节点 1", "核心事件轴节点 2", "核心事件轴节点 3"],
  "characterMap": [
    { "nameOrRole": "人物名称或特征角色", "description": "在此片中的主要地位和特征", "relation": "与其他角色的冲突或关联关系" }
  ],
  "mainConflict": "全片核心戏剧冲突归纳",
  "keyTurns": ["关键转折点 1", "关键转折点 2"],
  "emotionCurve": "情绪起伏走向（例如：平缓推进 -> 爆发 -> 舒缓）",
  "visualStyle": "画面色调与风格归纳",
  "dialogueStyle": "人物对话与旁白台词特色",
  "remixStrategy": {
    "keepMust": ["二创剪辑时建议必须保留的镜头或情节点 1", "二创剪辑时建议必须保留的镜头或情节点 2"],
    "canReplace": ["可供替换或删减的无用过渡片段/台词 1", "可供替换或删减的无用过渡片段/台词 2"],
    "rewriteDirections": [
      {
        "title": "二创解说/剪辑方向名称",
        "idea": "脑洞大开的二创方向构想描述",
        "suitableStyle": "推荐二创视频风格",
        "requiredSegments": ["此方向需引用的片段ID 1", "此方向需引用的片段ID 2"],
        "risk": "剪辑或内容上可能遇到的版权/穿帮风险"
      }
    ],
    "suggestedTags": ["二创推荐标签1", "二创推荐标签2"]
  }
}

要求：
1. 绝对不要在 storyContent 中包含“共 X 段，已完成 X 段”这类状态字眼。
2. 所有自然语言字段必须使用中文。
3. 只返回合法的 JSON，不要包含任何前言、后记或 Markdown 标记。`;

        const userPrompt = `原片标题: ${document.sourceAsset.title}
片段详细列表:
${segmentLines.join('\n\n')}

请将以上片段重新梳理串联，输出完整连贯的故事内容与二创策略：`;

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

        const rs = rollupPayload.remixStrategy || (rollupPayload as any).remixStrategy;
        if (rs && typeof rs === 'object') {
          if (Array.isArray(rs.keepMust)) {
            keepMust = rs.keepMust.map(String).filter(Boolean);
          }
          if (Array.isArray(rs.canReplace)) {
            canReplace = rs.canReplace.map(String).filter(Boolean);
          }
          if (Array.isArray(rs.rewriteDirections)) {
            rewriteDirections = rs.rewriteDirections.filter(
              (item: any) => item && typeof item === 'object' && item.title,
            );
          }
          if (Array.isArray(rs.suggestedTags)) {
            suggestedTags = rs.suggestedTags.map(String).filter(Boolean);
          }
        }
      } catch (err) {
        rollupFallbackUsed = true;
        errors.push(`AI 故事串联执行失败: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Failed to generate AI rollup summary, using fallback:', err);
      }
    }

    const realFingerprint = buildRemixUnderstandingInputFingerprint(document);
    const rollupInputHash = `${realFingerprint.segments}_${realFingerprint.keyframes}`;

    const originalUnderstanding = buildOriginalUnderstandingDocument({
      document,
      segmentDocuments: orderedDocuments,
      generatedAt,
      inputHash: rollupInputHash,
      failedSegmentCount: failures.length,
      sourceOverviewPath: sourceOverviewRel,
      segmentAnalysisPath: segmentAnalysisRel,
      logline,
      storySummaryShort,
      storyContent,
      eventChain,
      characterMap,
      mainConflict,
      keyTurns,
      emotionCurve,
      visualStyle,
      dialogueStyle,
      keepMust,
      canReplace,
      rewriteDirections,
      suggestedTags,
      rollupFallbackUsed,
      errors,
      warnings,
    });

    const overviewIndex = buildSourceOverviewIndexDocument({
      original: originalUnderstanding,
      originalUnderstandingPath: originalUnderstandingRel,
      inputHash: realFingerprint,
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
    document.sourceAsset.status = failures.length > 0 ? 'processing' : 'ready_for_review';
    document.processingStageStates.remix_understanding =
      failures.length > 0 ? 'needs_input' : 'ready_for_review';
    await writeStoredSourceAsset(projectDir, document);

    return document;
  }
}
