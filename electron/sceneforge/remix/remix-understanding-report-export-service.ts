import fs from 'node:fs/promises';
import path from 'node:path';
import { readStoredSourceAsset } from './remix-store';
import { resolveProjectFile } from './remix-validators';
import {
  getRemixOriginalUnderstandingJsonPath,
  getRemixSegmentUnderstandingJsonPath,
} from './remix-artifact-paths';
import type { RemixOriginalUnderstandingDocument } from './remix-source-understanding-rollup';
import type { RemixSegmentUnderstandingDocument } from './remix-segment-understanding-schema';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';
import { resolveSegmentTranscriptState } from './remix-transcript-correction-service';

export class RemixUnderstandingReportExportService {
  async exportReport(projectDir: string, sourceAssetId: string): Promise<{ reportPath: string }> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    if (!document) {
      throw new Error(`未找到源资产：${sourceAssetId}`);
    }

    // 1. 读取 original_understanding.json
    const rollupRel = getRemixOriginalUnderstandingJsonPath(sourceAssetId);
    const rollupAbs = resolveProjectFile(projectDir, rollupRel);
    let original: RemixOriginalUnderstandingDocument;
    try {
      const rollupContent = await fs.readFile(rollupAbs, 'utf8');
      original = JSON.parse(rollupContent);
    } catch (err) {
      throw new Error(`无法读取全片汇总理解，请先跑通原片理解流程：${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. 加载所有的片段理解 JSON 并渲染明细
    const segmentsDetailMarkdown: string[] = [];
    let hasCorrection = false;

    for (const segment of document.sourceAsset.segments) {
      const segRel = segment.analysisJsonPath?.trim() || getRemixSegmentUnderstandingJsonPath(sourceAssetId, segment.id);
      const segAbs = resolveProjectFile(projectDir, segRel);
      let segDoc: RemixSegmentUnderstandingDocument | null = null;
      try {
        const segContent = await fs.readFile(segAbs, 'utf8');
        segDoc = JSON.parse(segContent);
      } catch {
        // 忽略，容忍缺失部分片段
      }

      // 读取台词原文
      let plainText = '（无台词）';
      let transcriptEngine = 'unknown';
      let transcriptTimestampLevel = 'unknown';
      let transcriptSource = 'unknown';
      let transcriptWarnings: string[] = [];
      let transcriptDoc: RemixSegmentTranscriptDocument | null = null;
      if (segment.segmentTranscriptJsonPath) {
        try {
          const transAbs = resolveProjectFile(projectDir, segment.segmentTranscriptJsonPath);
          const transContent = await fs.readFile(transAbs, 'utf8');
          transcriptDoc = JSON.parse(transContent);
          if (transcriptDoc?.plainText) {
            plainText = transcriptDoc.plainText.trim();
          }
          transcriptEngine = transcriptDoc?.engine || 'unknown';
          transcriptTimestampLevel = transcriptDoc?.timestampLevel || 'unknown';
          transcriptSource = transcriptDoc?.source || 'unknown';
          transcriptWarnings = Array.isArray(transcriptDoc?.quality?.warnings) ? transcriptDoc.quality.warnings : [];
        } catch {}
      }

      // 读取台词修正版
      let correctedText = '（与原文一致）';
      try {
        const transcriptState = await resolveSegmentTranscriptState({
          projectDir,
          sourceAssetId,
          segmentId: segment.id,
          segmentTranscriptJsonPath: segment.segmentTranscriptJsonPath,
          transcriptCorrectionPath: segment.transcriptCorrectionPath,
          transcript: transcriptDoc,
        });
        if (transcriptState.usesCorrection && transcriptState.effectiveText.trim()) {
          correctedText = transcriptState.effectiveText.trim();
          hasCorrection = true;
        }
      } catch {}

      // 格式化时间 ms 为 00:00
      const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const sec = (totalSec % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
      };

      const timeStr = `${formatTime(segment.timeRange.startMs)} - ${formatTime(segment.timeRange.endMs)}`;
      const idxStr = (segment.index + 1).toString().padStart(2, '0');
      segmentsDetailMarkdown.push([
        `### ${idxStr} · ${timeStr}`,
        `- 画面：${segDoc?.visual?.environmentDetails || '（未知环境）'}`,
        `- 动作：${segDoc?.visual?.mainAction || '（无动作）'}`,
        `- 镜头：${segDoc?.camera?.shotSize || '中景'} / ${segDoc?.camera?.movement || '固定'}`,
        `- 台词来源：${transcriptSource}`,
        `- ASR 引擎：${transcriptEngine}`,
        `- 时间粒度：${transcriptTimestampLevel}${transcriptTimestampLevel === 'segment_range' ? '（片段范围，不是精准字幕）' : ''}`,
        `- 台词原文：${plainText}`,
        `- 台词修正版：${correctedText}`,
        ...(transcriptWarnings.length > 0 ? [`- 台词告警：${transcriptWarnings.join('；')}`] : []),
        `- 剧情功能：${segDoc?.story?.plotFunction || '剧情过渡'}`,
        `- 保留点：${segDoc?.remix?.keepElements?.join('、') || '无'}`,
        `- 替换点：${segDoc?.remix?.replaceableElements?.join('、') || '无'}`,
        `- 中文 Prompt：\`${segDoc?.videoPrompt?.fullChinesePrompt || ''}\``,
      ].join('\n'));
    }

    const eventLines = original.overall.eventChain.map((e, idx) => `${idx + 1}. ${e}`);
    const characterLines = original.overall.characterMap.map(
      (c) => `- **${c.nameOrRole}**：${c.description}${c.relation ? ` (冲突关系: ${c.relation})` : ''}`,
    );
    const directionMarkdown = original.remixStrategy.rewriteDirections.map((d) => {
      return [
        `### ${d.title}`,
        `- **构想**：${d.idea}`,
        `- **推荐风格**：${d.suitableStyle}`,
        `- **引用片段**：${d.requiredSegments.join(', ')}`,
        `- **潜在风险**：${d.risk}`,
      ].join('\n');
    });

    const reportContent = [
      `# 原片理解报告`,
      ``,
      `## 基础信息`,
      `- 标题：${original.title}`,
      `- 片段数：${original.quality.segmentCount}`,
      `- 生成时间：${original.generatedAt}`,
      `- 台词校对状态：${hasCorrection ? '部分/全部已校对' : '仅自动识别（未进行校对）'}`,
      ``,
      `## 一句话概括`,
      original.overall.logline || '（无）',
      ``,
      `## 短摘要`,
      original.overall.storySummaryShort || '（无）',
      ``,
      `## 完整视频内容`,
      original.overall.storyContent || '（无）',
      ``,
      `## 事件链`,
      eventLines.join('\n') || '（无）',
      ``,
      `## 人物与关系`,
      characterLines.join('\n') || '（无）',
      ``,
      `## 情绪曲线`,
      original.overall.emotionCurve || '（无）',
      ``,
      `## 二创方向`,
      directionMarkdown.join('\n\n') || '（无）',
      ``,
      `## 片段明细`,
      segmentsDetailMarkdown.join('\n\n'),
    ].join('\n');

    const reportRel = 'original_understanding_v2.md';
    const reportAbs = path.join(projectDir, reportRel);
    await fs.writeFile(reportAbs, reportContent, 'utf8');

    return {
      reportPath: reportAbs,
    };
  }
}
