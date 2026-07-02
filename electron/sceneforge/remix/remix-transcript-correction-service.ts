import fs from 'node:fs/promises';
import path from 'node:path';
import { getRemixSegmentTranscriptCorrectionJsonPath, getRemixSegmentTranscriptJsonPath } from './remix-artifact-paths';
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

export interface RemixResolvedSegmentTranscriptState {
  transcript: RemixSegmentTranscriptDocument | null;
  correction: RemixSegmentTranscriptCorrectionDocument | null;
  asrText: string;
  correctedText: string;
  effectiveText: string;
  correctionStatus: 'raw' | 'edited' | 'confirmed';
  usesCorrection: boolean;
  correctionIsStale: boolean;
  transcriptUpdatedAtMs: number | null;
  correctionUpdatedAtMs: number | null;
}

export function normalizeTranscriptComparisonText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function readTimestampMsFromDocument(
  value: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  if (!value) {
    return null;
  }
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw !== 'string' || !raw.trim()) {
      continue;
    }
    const ms = new Date(raw).getTime();
    if (!Number.isNaN(ms)) {
      return ms;
    }
  }
  return null;
}

async function resolveArtifactTimestampMs(
  absPath: string,
  document: Record<string, unknown> | null | undefined,
  ...keys: string[]
): Promise<number | null> {
  const docTimestampMs = readTimestampMsFromDocument(document, ...keys);
  if (docTimestampMs !== null) {
    return docTimestampMs;
  }
  try {
    const stat = await fs.stat(absPath);
    return Number.isFinite(stat.mtimeMs) ? stat.mtimeMs : null;
  } catch {
    return null;
  }
}

function buildDraftTranscriptCorrectionDocument(input: {
  sourceAssetId: string;
  segmentId: string;
  transcriptRelPath: string;
  transcript: RemixSegmentTranscriptDocument | null;
  warning?: string | null;
}): RemixSegmentTranscriptCorrectionDocument {
  const now = new Date().toISOString();
  const transcript = input.transcript;
  const asrText = transcript?.plainText ?? '';
  const warnings = input.warning?.trim() ? [input.warning.trim()] : [];
  return {
    schema: 'sceneforge-remix-segment-transcript-correction',
    version: 1,
    sourceAssetId: input.sourceAssetId,
    segmentId: input.segmentId,
    generatedAt: now,
    updatedAt: '',
    inputRefs: {
      sourceTranscriptPath: transcript?.sourceTranscriptPath ?? null,
      segmentTranscriptPath: input.transcriptRelPath,
    },
    transcript: {
      asrText,
      correctedText: '',
      effectiveText: asrText,
      correctionStatus: 'raw',
      language: 'zh-CN',
      notes: [],
    },
    dialogueLines: (transcript?.utterances ?? []).map((utterance) => ({
      lineId: utterance.sourceUtteranceId,
      startMs: utterance.relativeStartMs,
      endMs: utterance.relativeEndMs,
      asrText: utterance.text,
      effectiveText: utterance.text,
      confidence: utterance.confidence,
    })),
    quality: {
      needsHumanReview: transcript?.quality?.needsReview ?? true,
      warnings,
    },
  };
}

export async function resolveSegmentTranscriptState(input: {
  projectDir: string;
  sourceAssetId: string;
  segmentId: string;
  segmentTranscriptJsonPath?: string | null;
  transcriptCorrectionPath?: string | null;
  transcript?: RemixSegmentTranscriptDocument | null;
  correction?: RemixSegmentTranscriptCorrectionDocument | null;
}): Promise<RemixResolvedSegmentTranscriptState> {
  const transcriptRelPath =
    input.segmentTranscriptJsonPath?.trim() ||
    getRemixSegmentTranscriptJsonPath(input.sourceAssetId, input.segmentId);
  const transcriptAbsPath = resolveProjectFile(input.projectDir, transcriptRelPath);
  let transcript = input.transcript ?? null;
  if (!transcript && input.segmentTranscriptJsonPath?.trim()) {
    try {
      transcript = JSON.parse(await fs.readFile(transcriptAbsPath, 'utf8')) as RemixSegmentTranscriptDocument;
    } catch {
      transcript = null;
    }
  }

  const correctionRelPath = input.transcriptCorrectionPath?.trim() || null;
  const correctionAbsPath = correctionRelPath
    ? resolveProjectFile(input.projectDir, correctionRelPath)
    : null;
  let correction = input.correction ?? null;
  if (!correction && correctionAbsPath) {
    try {
      correction = JSON.parse(
        await fs.readFile(correctionAbsPath, 'utf8'),
      ) as RemixSegmentTranscriptCorrectionDocument;
    } catch {
      correction = null;
    }
  }

  const transcriptUpdatedAtMs =
    input.segmentTranscriptJsonPath?.trim() && transcript
      ? await resolveArtifactTimestampMs(
          transcriptAbsPath,
          transcript as unknown as Record<string, unknown>,
          'updatedAt',
          'generatedAt',
        )
      : null;
  const correctionUpdatedAtMs =
    correctionAbsPath && correction
      ? await resolveArtifactTimestampMs(
          correctionAbsPath,
          correction as unknown as Record<string, unknown>,
          'updatedAt',
          'generatedAt',
        )
      : null;

  const asrText = transcript?.plainText?.trim() ?? '';
  const correctedText = correction?.transcript?.correctedText?.trim() ?? '';
  const correctionEffectiveText = correction?.transcript?.effectiveText?.trim() ?? '';
  const correctionAsrText = correction?.transcript?.asrText?.trim() ?? '';
  const correctionStatus = correction?.transcript?.correctionStatus ?? 'raw';

  const transcriptMatchesCorrectionAsr =
    !normalizeTranscriptComparisonText(correctionAsrText) ||
    normalizeTranscriptComparisonText(correctionAsrText) === normalizeTranscriptComparisonText(asrText);
  const transcriptNewerThanCorrection =
    transcriptUpdatedAtMs !== null &&
    correctionUpdatedAtMs !== null &&
    transcriptUpdatedAtMs > correctionUpdatedAtMs;
  const correctionIsStale =
    Boolean(correction && correctionEffectiveText) &&
    transcriptNewerThanCorrection &&
    !transcriptMatchesCorrectionAsr;

  const effectiveText =
    correction && correctionEffectiveText && !correctionIsStale ? correctionEffectiveText : asrText;

  const resolvedCorrection =
    correctionIsStale && transcript
      ? buildDraftTranscriptCorrectionDocument({
          sourceAssetId: input.sourceAssetId,
          segmentId: input.segmentId,
          transcriptRelPath,
          transcript,
          warning: '检测到分段台词已更新，旧纠偏内容已回退为最新 ASR 文本，请重新确认。',
        })
      : correction;

  return {
    transcript,
    correction: resolvedCorrection,
    asrText,
    correctedText: correctionIsStale ? '' : correctedText,
    effectiveText,
    correctionStatus: correctionIsStale ? 'raw' : correctionStatus,
    usesCorrection: Boolean(correction && correctionEffectiveText && !correctionIsStale),
    correctionIsStale,
    transcriptUpdatedAtMs,
    correctionUpdatedAtMs,
  };
}

export class RemixTranscriptCorrectionService {
  async getSegmentTranscriptCorrection(
    projectDir: string,
    sourceAssetId: string,
    segmentId: string,
  ): Promise<RemixSegmentTranscriptCorrectionDocument> {
    const transcriptRelPath = getRemixSegmentTranscriptJsonPath(sourceAssetId, segmentId);
    const correctionRelPath = getRemixSegmentTranscriptCorrectionJsonPath(sourceAssetId, segmentId);
    const state = await resolveSegmentTranscriptState({
      projectDir,
      sourceAssetId,
      segmentId,
      segmentTranscriptJsonPath: transcriptRelPath,
      transcriptCorrectionPath: correctionRelPath,
    });
    if (state.correctionIsStale && state.correction) {
      const correctionAbsPath = resolveProjectFile(projectDir, correctionRelPath);
      await fs.mkdir(path.dirname(correctionAbsPath), { recursive: true });
      await fs.writeFile(correctionAbsPath, `${JSON.stringify(state.correction, null, 2)}\n`, 'utf8');
    }
    if (state.correction) {
      return state.correction;
    }
    return buildDraftTranscriptCorrectionDocument({
      sourceAssetId,
      segmentId,
      transcriptRelPath,
      transcript: state.transcript,
    });
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

    // 台词纠偏不触发画面理解 / video prompt 失效或清空
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
