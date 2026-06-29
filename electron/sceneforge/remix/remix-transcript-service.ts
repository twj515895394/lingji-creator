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

  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
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
        preferredEngine: this.preferredEngine,
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
}
