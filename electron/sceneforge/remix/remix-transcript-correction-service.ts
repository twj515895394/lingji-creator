import fs from 'node:fs/promises';
import path from 'node:path';
import { getRemixSegmentTranscriptCorrectionJsonPath, getRemixSegmentTranscriptJsonPath, getRemixSegmentUnderstandingJsonPath } from './remix-artifact-paths';
import { resolveProjectFile } from './remix-validators';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';
import { loadRemixUnderstandingWorkbench, type RemixUnderstandingWorkbenchSnapshot } from './remix-understanding-workbench';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';

export interface RemixSegmentTranscriptCorrectionDocument {
  schema: 'sceneforge-remix-segment-transcript-correction';
  version: number;
  sourceAssetId: string;
  segmentId: string;
  generatedAt: string;
  updatedAt: string;

  inputRefs: {
    sourceTranscriptPath: string | null;
    segmentTranscriptPath: string | null;
  };

  transcript: {
    asrText: string;
    correctedText: string;
    effectiveText: string;
    correctionStatus: 'raw' | 'edited' | 'confirmed';
    language: 'zh-CN' | 'unknown';
    notes: string[];
  };

  dialogueLines: Array<{
    lineId: string;
    startMs?: number | null;
    endMs?: number | null;
    speaker?: string | null;
    asrText: string;
    correctedText?: string | null;
    effectiveText: string;
    tone?: string | null;
    confidence?: number | null;
  }>;

  quality: {
    needsHumanReview: boolean;
    warnings: string[];
  };
}

export class RemixTranscriptCorrectionService {
  async getSegmentTranscriptCorrection(
    projectDir: string,
    sourceAssetId: string,
    segmentId: string,
  ): Promise<RemixSegmentTranscriptCorrectionDocument> {
    const correctionRelPath = getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, segmentId);
    const correctionAbsPath = resolveProjectFile(projectDir, correctionRelPath);

    try {
      const raw = await fs.readFile(correctionAbsPath, 'utf8');
      return JSON.parse(raw) as RemixSegmentTranscriptCorrectionDocument;
    } catch {
      // 找不到已存文件，尝试读取原始转写进行封装
      const transcriptRelPath = getRemixSegmentTranscriptJsonPath(sourceAssetId, segmentId);
      const transcriptAbsPath = resolveProjectFile(projectDir, transcriptRelPath);
      let asrText = '';
      let dialogueLines: RemixSegmentTranscriptCorrectionDocument['dialogueLines'] = [];
      let sourceTranscriptPath: string | null = null;
      let needsReview = true;

      try {
        const rawAsr = await fs.readFile(transcriptAbsPath, 'utf8');
        const asrDoc = JSON.parse(rawAsr) as RemixSegmentTranscriptDocument;
        asrText = asrDoc.plainText ?? '';
        sourceTranscriptPath = asrDoc.sourceTranscriptPath ?? null;
        needsReview = asrDoc.quality?.needsReview ?? true;
        dialogueLines = (asrDoc.utterances ?? []).map((utterance) => ({
          lineId: utterance.sourceUtteranceId,
          startMs: utterance.relativeStartMs,
          endMs: utterance.relativeEndMs,
          asrText: utterance.text,
          effectiveText: utterance.text,
          confidence: utterance.confidence,
        }));
      } catch {
        // 片段转写不存在
      }

      const now = new Date().toISOString();
      return {
        schema: 'sceneforge-remix-segment-transcript-correction',
        version: 1,
        sourceAssetId,
        segmentId,
        generatedAt: now,
        updatedAt: '', // 空字符串表示从未被实际人工编辑保存过
        inputRefs: {
          sourceTranscriptPath,
          segmentTranscriptPath: transcriptRelPath,
        },
        transcript: {
          asrText,
          correctedText: '',
          effectiveText: asrText,
          correctionStatus: 'raw',
          language: 'zh-CN',
          notes: [],
        },
        dialogueLines,
        quality: {
          needsHumanReview: needsReview,
          warnings: [],
        },
      };
    }
  }

  async updateSegmentTranscriptCorrection(
    projectDir: string,
    sourceAssetId: string,
    segmentId: string,
    correctedText: string,
    markConfirmed?: boolean,
  ): Promise<RemixUnderstandingWorkbenchSnapshot> {
    const current = await this.getSegmentTranscriptCorrection(projectDir, sourceAssetId, segmentId);
    const now = new Date().toISOString();

    const previousEffectiveText = current.transcript.effectiveText;
    const severity = evaluateTextChangeSeverity(previousEffectiveText, correctedText);

    // 更新字段
    current.updatedAt = now;
    current.transcript.correctedText = correctedText;
    current.transcript.effectiveText = correctedText;
    current.transcript.correctionStatus = markConfirmed ? 'confirmed' : 'edited';
    if (markConfirmed) {
      current.quality.needsHumanReview = false;
    }

    // 落盘
    const correctionRelPath = getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, segmentId);
    const correctionAbsPath = resolveProjectFile(projectDir, correctionRelPath);
    await fs.mkdir(path.dirname(correctionAbsPath), { recursive: true });
    await fs.writeFile(correctionAbsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

    // 绑定至 project.json
    const doc = await readStoredSourceAsset(projectDir, sourceAssetId);
    const segment = doc.sourceAsset.segments.find((s) => s.id === segmentId);
    if (segment) {
      segment.transcriptCorrectionPath = correctionRelPath;
      await writeStoredSourceAsset(projectDir, doc);
    }

    // 若判定为 major 剧烈修改，则进行物理清空
    if (severity === 'major') {
      const understandingRelPath = segment?.analysisJsonPath || getRemixSegmentUnderstandingJsonPath(sourceAssetId, segmentId);
      const understandingAbsPath = resolveProjectFile(projectDir, understandingRelPath);
      try {
        const raw = await fs.readFile(understandingAbsPath, 'utf8');
        const understandingDoc = JSON.parse(raw);
        if (understandingDoc && understandingDoc.schema === 'sceneforge-remix-segment-understanding') {
          // 清空大模型提取的生成字段
          understandingDoc.visual = {
            sceneSummary: '',
            mainAction: '',
            characters: [],
            environmentDetails: '',
            lighting: '',
            colorTone: '',
          };
          understandingDoc.camera = {
            shotSize: '',
            angle: '',
            movement: '',
            composition: '',
            focus: '',
            editingRole: '',
          };
          understandingDoc.audio = {
            speechSummary: '',
            dialogue: [],
            ambient: '',
            music: '',
            silenceOrPause: '',
          };
          understandingDoc.story = {
            plotFunction: '',
            emotion: '',
            conflict: '',
            beforeAfterRelation: '',
          };
          understandingDoc.videoPrompt = {
            positivePrompt: '',
            negativePrompt: '',
            motionPrompt: '',
            cameraPrompt: '',
            dialoguePrompt: '',
          };
          understandingDoc.videoPromptText = '';
          understandingDoc.remix = {
            keepElements: [],
            replaceableElements: [],
            rewriteIdeas: [],
            reuseScenarios: [],
            riskNotes: [],
          };
          understandingDoc.quality = {
            confidence: 0,
            missingInputs: ['transcript_correction_changed'],
            needsHumanReview: true,
            warnings: ['台词发生剧烈修改，分析已重置失效。'],
          };
          understandingDoc.generatedAt = ''; // 置空生成时间，使其天然 stale

          await fs.writeFile(understandingAbsPath, `${JSON.stringify(understandingDoc, null, 2)}\n`, 'utf8');
        }
      } catch {
        // 若文件不存在或读取失败，则不作处理
      }
    }

    // 重新生成快照并返回
    return loadRemixUnderstandingWorkbench(projectDir, doc.sourceAsset);
  }

  async confirmAllSegmentTranscripts(
    projectDir: string,
    sourceAssetId: string,
  ): Promise<RemixUnderstandingWorkbenchSnapshot> {
    const doc = await readStoredSourceAsset(projectDir, sourceAssetId);
    if (!doc) {
      throw new Error(`未找到源资产：${sourceAssetId}`);
    }

    for (const segment of doc.sourceAsset.segments) {
      const current = await this.getSegmentTranscriptCorrection(projectDir, sourceAssetId, segment.id);
      if (current.transcript.correctionStatus !== 'confirmed') {
        current.transcript.correctionStatus = 'confirmed';
        current.quality.needsHumanReview = false;

        const correctionRelPath = getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, segment.id);
        const correctionAbsPath = resolveProjectFile(projectDir, correctionRelPath);
        await fs.mkdir(path.dirname(correctionAbsPath), { recursive: true });
        await fs.writeFile(correctionAbsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

        segment.transcriptCorrectionPath = correctionRelPath;
      }
    }

    await writeStoredSourceAsset(projectDir, doc);
    return loadRemixUnderstandingWorkbench(projectDir, doc.sourceAsset);
  }
}

export function getLevenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          Math.min(
            matrix[i][j - 1] + 1, // 插入
            matrix[i - 1][j] + 1  // 删除
          )
        );
      }
    }
  }
  return matrix[len1][len2];
}

export function evaluateTextChangeSeverity(oldText: string, newText: string): 'none' | 'minor' | 'major' {
  const normalize = (t: string) => {
    return t
      .replace(/[\s\p{P}\p{S}]/gu, '') // 去除空白与标点
      .replace(/[的地得]/g, '的');     // 统一的地得
  };
  const normOld = normalize(oldText);
  const normNew = normalize(newText);

  if (normOld === normNew) {
    return 'none';
  }

  const dist = getLevenshteinDistance(normOld, normNew);
  const maxLen = Math.max(normOld.length, normNew.length);
  if (maxLen === 0) {
    return 'none';
  }

  const ratio = dist / maxLen;

  // 剧烈变动判定：编辑距离 > 5 且变动比例 > 15%，或编辑距离绝对值 > 12
  if ((dist > 5 && ratio > 0.15) || dist > 12) {
    return 'major';
  }

  return 'minor';
}
