import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getRemixSegmentManifestPath,
  getRemixSegmentTranscriptJsonPath,
  getRemixSourceTranscriptJsonPath,
  getRemixSourceTranscriptMarkdownPath,
  getRemixSourceTranscriptSrtPath,
} from './remix-artifact-paths';
import type { RemixAsrEngine } from './remix-asr-types';
import { resolveRemixAsrProviderPlan } from './remix-asr-provider-resolver';
import { RemixSegmentTranscriptService } from './remix-segment-transcript-service';
import { RemixSenseVoiceGgufProvider } from './remix-sensevoice-gguf-provider';
import { alignUtterancesToSegments } from './remix-transcript-aligner';
import type { RemixSegmentTranscriptDocument, RemixSourceTranscriptDocument } from './remix-transcript-types';
import { buildSrtFromUtterances, RemixLocalWhisperProvider } from './remix-whisper-provider';
import { assertFileExists, resolveProjectFile } from './remix-validators';
import type { StoredSourceAssetDocument } from './remix-store';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';

function buildTranscriptMarkdown(document: RemixSourceTranscriptDocument): string {
  const lines = document.utterances.map(
    (utterance) => `- [${utterance.startMs} - ${utterance.endMs}] ${utterance.text}`,
  );
  return [
    '# Source Transcript',
    '',
    `- Source Asset: ${document.sourceAssetId}`,
    `- Engine: ${document.engine}`,
    `- Generated: ${document.generatedAt}`,
    `- SRT Status: ${document.srtStatus ?? 'unknown'}`,
    '',
    '## 全文',
    '',
    document.plainText || '（无台词）',
    '',
    '## 分段索引',
    '',
    ...lines,
    '',
  ].join('\n');
}

export interface RemixTranscriptServiceOptions {
  whisperProvider?: RemixLocalWhisperProvider;
  sensevoiceProvider?: RemixSenseVoiceGgufProvider;
  segmentTranscriptService?: RemixSegmentTranscriptService;
  preferredEngine?: RemixAsrEngine | null;
}

export interface RemixTranscriptRunOptions {
  preferredEngine?: RemixAsrEngine | null;
}

async function readSourceTranscript(
  projectDir: string,
  transcriptPath: string | null | undefined,
): Promise<RemixSourceTranscriptDocument | null> {
  if (!transcriptPath?.trim()) {
    return null;
  }
  try {
    return JSON.parse(
      await fs.readFile(resolveProjectFile(projectDir, transcriptPath), 'utf8'),
    ) as RemixSourceTranscriptDocument;
  } catch {
    return null;
  }
}

async function readSegmentTranscript(
  projectDir: string,
  transcriptPath: string | null | undefined,
): Promise<RemixSegmentTranscriptDocument | null> {
  if (!transcriptPath?.trim()) {
    return null;
  }
  try {
    return JSON.parse(
      await fs.readFile(resolveProjectFile(projectDir, transcriptPath), 'utf8'),
    ) as RemixSegmentTranscriptDocument;
  } catch {
    return null;
  }
}

function buildSenseVoiceAggregatePlainText(
  transcripts: RemixSegmentTranscriptDocument[],
): string {
  return transcripts
    .filter((item) => item.plainText.trim())
    .map((item) => `[${item.segmentId}] ${item.plainText}`)
    .join('\n');
}

async function buildSenseVoiceSourceTranscript(
  projectDir: string,
  document: StoredSourceAssetDocument,
  generatedAt: string,
): Promise<RemixSourceTranscriptDocument> {
  const transcripts = (
    await Promise.all(
      document.sourceAsset.segments.map((segment) =>
        readSegmentTranscript(projectDir, segment.segmentTranscriptJsonPath),
      ),
    )
  ).filter((item): item is RemixSegmentTranscriptDocument => Boolean(item));

  const utterances = transcripts
    .filter((item) => item.plainText.trim())
    .sort((left, right) => left.timeRange.sourceStartMs - right.timeRange.sourceStartMs)
    .map((item, index) => ({
      id: `segutt_${String(index + 1).padStart(3, '0')}`,
      text: item.plainText,
      startMs: item.timeRange.sourceStartMs,
      endMs: item.timeRange.sourceEndMs,
      confidence: null,
      speaker: null,
    }));

  const segmentWarnings = transcripts.flatMap((item) => item.quality.warnings ?? []);
  const uniqueWarnings = Array.from(
    new Set([
      'SenseVoice 当前仅提供片段级 transcript 聚合，不生成精准 source SRT',
      ...segmentWarnings,
    ]),
  );

  return {
    schema: 'sceneforge-remix-source-transcript',
    version: 2,
    sourceAssetId: document.sourceAsset.id,
    language: 'zh',
    engine: 'funasr_sensevoice_gguf',
    mode: 'segment_audio_asr',
    timestampLevel: 'segment_range',
    canGenerateAccurateSrt: false,
    generatedAt,
    durationMs: document.sourceAsset.videoMetadata.durationMs,
    inputRefs: {
      audioPath: document.sourceAsset.sourceAudioPath ?? null,
      segmentAudioPaths: Object.fromEntries(
        document.sourceAsset.segments.map((segment) => [segment.id, segment.segmentAudioPath ?? null]),
      ),
    },
    quality: {
      hasSpeech: utterances.length > 0,
      utteranceCount: utterances.length,
      avgConfidence: null,
      needsReview:
        transcripts.some((item) => item.quality.needsReview) || uniqueWarnings.length > 0,
      warnings: uniqueWarnings,
    },
    utterances,
    plainText: buildSenseVoiceAggregatePlainText(transcripts),
    srtPath: null,
    srtStatus: 'not_generated',
  };
}

export class RemixTranscriptService {
  private readonly whisperProvider;
  private readonly sensevoiceProvider;
  private readonly segmentTranscriptService;
  private readonly preferredEngine;

  constructor(options: RemixTranscriptServiceOptions = {}) {
    this.whisperProvider = options.whisperProvider ?? new RemixLocalWhisperProvider();
    this.sensevoiceProvider = options.sensevoiceProvider ?? new RemixSenseVoiceGgufProvider();
    this.segmentTranscriptService =
      options.segmentTranscriptService ??
      new RemixSegmentTranscriptService({ provider: this.sensevoiceProvider });
    this.preferredEngine = options.preferredEngine ?? null;
  }

  private async writeSourceTranscriptArtifacts(
    projectDir: string,
    sourceAssetId: string,
    sourceTranscript: RemixSourceTranscriptDocument,
  ) {
    const transcriptJsonRel = getRemixSourceTranscriptJsonPath(sourceAssetId);
    const transcriptMdRel = getRemixSourceTranscriptMarkdownPath(sourceAssetId);
    await fs.mkdir(resolveProjectFile(projectDir, transcriptJsonRel.replace(/[^/]+$/, '')), { recursive: true }).catch(() => undefined);
    await fs.writeFile(
      resolveProjectFile(projectDir, transcriptJsonRel),
      `${JSON.stringify(sourceTranscript, null, 2)}\n`,
      'utf8',
    );
    await fs.writeFile(
      resolveProjectFile(projectDir, transcriptMdRel),
      buildTranscriptMarkdown(sourceTranscript),
      'utf8',
    );
  }

  private async writeWhisperSegmentTranscript(input: {
    projectDir: string;
    sourceAssetId: string;
    segment: StoredSourceAssetDocument['sourceAsset']['segments'][number];
    segmentAudioPath: string;
  }): Promise<RemixSegmentTranscriptDocument> {
    const { projectDir, sourceAssetId, segment, segmentAudioPath } = input;
    const transcriptRel = getRemixSegmentTranscriptJsonPath(sourceAssetId, segment.id);
    const transcriptAbs = resolveProjectFile(projectDir, transcriptRel);
    const { utterances } = await this.whisperProvider.transcribeAudio(
      resolveProjectFile(projectDir, segmentAudioPath),
      path.dirname(transcriptAbs),
    );

    return {
      schema: 'sceneforge-remix-segment-transcript',
      version: 2,
      segmentId: segment.id,
      sourceAssetId,
      timeRange: {
        sourceStartMs: segment.timeRange.startMs,
        sourceEndMs: segment.timeRange.endMs,
        durationMs: segment.timeRange.durationMs,
      },
      source: 'aligned_from_source_transcript',
      engine: 'local_whisper_cpp',
      mode: 'segment_asr_rerun',
      timestampLevel: 'sentence',
      segmentAudioPath,
      utterances: utterances.map((utterance, index) => ({
        sourceUtteranceId: `whisper_${segment.id}_${String(index + 1).padStart(3, '0')}`,
        text: utterance.text,
        sourceStartMs: segment.timeRange.startMs + utterance.startMs,
        sourceEndMs: segment.timeRange.startMs + utterance.endMs,
        relativeStartMs: utterance.startMs,
        relativeEndMs: utterance.endMs,
        confidence: utterance.confidence ?? null,
      })),
      plainText: utterances.map((item) => item.text).join('\n'),
      rawText: utterances.map((item) => item.text).join('\n'),
      quality: {
        hasSpeech: utterances.length > 0,
        avgConfidence: null,
        needsReview: true,
        warnings:
          utterances.length > 0
            ? ['当前为单片段 Whisper 重跑结果，source transcript 与精准 SRT 未同步重建。']
            : [
                '当前为单片段 Whisper 重跑结果，source transcript 与精准 SRT 未同步重建。',
                'Whisper 未识别到明确台词，请人工复核该片段。',
              ],
      },
    };
  }

  private async writeSegmentTranscriptArtifacts(input: {
    projectDir: string;
    sourceAssetId: string;
    segment: StoredSourceAssetDocument['sourceAsset']['segments'][number];
    transcript: RemixSegmentTranscriptDocument;
  }) {
    const { projectDir, sourceAssetId, segment, transcript } = input;
    const segmentTranscriptRel = getRemixSegmentTranscriptJsonPath(sourceAssetId, segment.id);
    await fs.mkdir(path.dirname(resolveProjectFile(projectDir, segmentTranscriptRel)), { recursive: true });
    await fs.writeFile(
      resolveProjectFile(projectDir, segmentTranscriptRel),
      `${JSON.stringify(transcript, null, 2)}\n`,
      'utf8',
    );
    segment.segmentTranscriptJsonPath = segmentTranscriptRel;
    await fs.writeFile(
      resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
      `${JSON.stringify(segment, null, 2)}\n`,
      'utf8',
    );
  }

  async run(
    projectDir: string,
    sourceAssetId: string,
    options: RemixTranscriptRunOptions = {},
  ): Promise<StoredSourceAssetDocument> {
    let document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const generatedAt = new Date().toISOString();
    const transcriptJsonRel = getRemixSourceTranscriptJsonPath(sourceAssetId);
    const transcriptSrtRel = getRemixSourceTranscriptSrtPath(sourceAssetId);
    const transcriptMdRel = getRemixSourceTranscriptMarkdownPath(sourceAssetId);

    const sourceAudioPath = document.sourceAsset.sourceAudioPath;
    const sourceAudioMetaPath = document.sourceAsset.sourceAudioJsonPath;

    let sourceTranscript: RemixSourceTranscriptDocument;

    if (!document.sourceAsset.videoMetadata.hasAudio || !sourceAudioPath) {
      sourceTranscript = {
        schema: 'sceneforge-remix-source-transcript',
        version: 1,
        sourceAssetId,
        language: 'zh',
        engine: 'no_audio',
        mode: 'no_audio',
        generatedAt,
        durationMs: document.sourceAsset.videoMetadata.durationMs,
        inputRefs: { audioPath: null },
        quality: {
          hasSpeech: false,
          utteranceCount: 0,
          avgConfidence: null,
          needsReview: false,
          warnings: ['源素材无可用音轨'],
        },
        utterances: [],
        plainText: '',
        srtPath: transcriptSrtRel,
        srtStatus: 'not_generated',
      };
    } else {
      const audioAbs = resolveProjectFile(projectDir, sourceAudioPath);
      await assertFileExists(audioAbs, '全片音频');
      if (sourceAudioMetaPath) {
        await assertFileExists(resolveProjectFile(projectDir, sourceAudioMetaPath), '全片音频元数据');
      }
      const asrPlan = await resolveRemixAsrProviderPlan({
        preferredEngine: options.preferredEngine ?? this.preferredEngine,
        hasAudio: true,
        probes: {
          sensevoice: () => this.sensevoiceProvider.probeAvailability(),
          whisper: () => this.whisperProvider.probeAvailability(),
        },
      });

      if (asrPlan.engine === 'funasr_sensevoice_gguf') {
        document = await this.segmentTranscriptService.run(projectDir, sourceAssetId);
        sourceTranscript = await buildSenseVoiceSourceTranscript(projectDir, document, generatedAt);
      } else {
        const { utterances, srtText, audioSha256 } = await this.whisperProvider.transcribeAudio(
          audioAbs,
          resolveProjectFile(projectDir, 'sceneforge/remix/source-assets/' + sourceAssetId + '/transcripts'),
        );

        const confidences = utterances
          .map((item) => item.confidence)
          .filter((value): value is number => typeof value === 'number');
        const avgConfidence =
          confidences.length > 0
            ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
            : null;

        sourceTranscript = {
          schema: 'sceneforge-remix-source-transcript',
          version: 1,
          sourceAssetId,
          language: 'zh',
          engine: 'local_whisper_cpp',
          mode: 'full_source_asr',
          timestampLevel: 'sentence',
          canGenerateAccurateSrt: true,
          generatedAt,
          durationMs: document.sourceAsset.videoMetadata.durationMs,
          inputRefs: { audioPath: sourceAudioPath },
          inputHash: {
            audioSha256,
            promptVersion: 'remix-stt-v1',
          },
          quality: {
            hasSpeech: utterances.length > 0,
            utteranceCount: utterances.length,
            avgConfidence,
            needsReview: false,
            warnings: [],
          },
          utterances,
          plainText: utterances.map((item) => item.text).join('\n'),
          srtPath: transcriptSrtRel,
          srtStatus:
            asrPlan.reason === 'sensevoice_unavailable_fallback_to_whisper'
              ? 'fallback_whisper'
              : 'accurate',
        };

        await fs.writeFile(
          resolveProjectFile(projectDir, transcriptSrtRel),
          srtText || buildSrtFromUtterances(utterances),
          'utf8',
        );
      }
    }

    await this.writeSourceTranscriptArtifacts(projectDir, sourceAssetId, sourceTranscript);

    document.sourceAsset.transcriptPath = transcriptJsonRel;
    document.sourceAsset.srtPath = sourceTranscript.srtPath ?? null;

    if (sourceTranscript.engine === 'local_whisper_cpp') {
      const segmentTranscripts = alignUtterancesToSegments(
        sourceAssetId,
        transcriptJsonRel,
        sourceTranscript.utterances,
        document.sourceAsset.segments,
      );

      for (const segmentTranscript of segmentTranscripts) {
        const segmentTranscriptRel = getRemixSegmentTranscriptJsonPath(sourceAssetId, segmentTranscript.segmentId);
        await fs.mkdir(path.dirname(resolveProjectFile(projectDir, segmentTranscriptRel)), { recursive: true });
        await fs.writeFile(
          resolveProjectFile(projectDir, segmentTranscriptRel),
          `${JSON.stringify(segmentTranscript, null, 2)}\n`,
          'utf8',
        );

        const segment = document.sourceAsset.segments.find((item) => item.id === segmentTranscript.segmentId);
        if (segment) {
          segment.segmentTranscriptJsonPath = segmentTranscriptRel;
          await fs.writeFile(
            resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
            `${JSON.stringify(segment, null, 2)}\n`,
            'utf8',
          );
        }
      }
    }

    document.sourceAsset.updatedAt = generatedAt;
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }

  async rerunSegment(
    projectDir: string,
    sourceAssetId: string,
    segmentId: string,
    options: RemixTranscriptRunOptions = {},
  ): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const segment = document.sourceAsset.segments.find((item) => item.id === segmentId);
    if (!segment) {
      throw new Error(`未找到片段：${segmentId}`);
    }

    const segmentAudioPath = segment.segmentAudioPath?.trim();
    if (!segmentAudioPath) {
      throw new Error(`片段 ${segmentId} 缺少可用音频，无法重跑 ASR。`);
    }

    await assertFileExists(resolveProjectFile(projectDir, segmentAudioPath), `片段音频(${segment.id})`);
    const asrPlan = await resolveRemixAsrProviderPlan({
      preferredEngine: options.preferredEngine ?? this.preferredEngine,
      hasAudio: true,
      probes: {
        sensevoice: () => this.sensevoiceProvider.probeAvailability(),
        whisper: () => this.whisperProvider.probeAvailability(),
      },
    });

    const transcript =
      asrPlan.engine === 'funasr_sensevoice_gguf'
        ? await this.segmentTranscriptService.runSegment(projectDir, sourceAssetId, segment.id)
        : await this.writeWhisperSegmentTranscript({
            projectDir,
            sourceAssetId,
            segment,
            segmentAudioPath,
          });

    if (asrPlan.engine !== 'funasr_sensevoice_gguf') {
      await this.writeSegmentTranscriptArtifacts({
        projectDir,
        sourceAssetId,
        segment,
        transcript,
      });
    }

    document.sourceAsset.updatedAt = new Date().toISOString();
    await writeStoredSourceAsset(projectDir, document);

    const sourceTranscript = await readSourceTranscript(
      projectDir,
      document.sourceAsset.transcriptPath,
    );
    if (
      asrPlan.engine === 'funasr_sensevoice_gguf' &&
      sourceTranscript?.mode === 'segment_audio_asr'
    ) {
      const rebuilt = await buildSenseVoiceSourceTranscript(
        projectDir,
        document,
        document.sourceAsset.updatedAt,
      );
      await this.writeSourceTranscriptArtifacts(projectDir, sourceAssetId, rebuilt);
    }

    return document;
  }
}
