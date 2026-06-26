import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getRemixSegmentManifestPath,
  getRemixSegmentTranscriptJsonPath,
  getRemixSourceTranscriptJsonPath,
  getRemixSourceTranscriptMarkdownPath,
  getRemixSourceTranscriptSrtPath,
} from './remix-artifact-paths';
import { alignUtterancesToSegments } from './remix-transcript-aligner';
import type { RemixSourceTranscriptDocument } from './remix-transcript-types';
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
}

export class RemixTranscriptService {
  private readonly whisperProvider;

  constructor(options: RemixTranscriptServiceOptions = {}) {
    this.whisperProvider = options.whisperProvider ?? new RemixLocalWhisperProvider();
  }

  async run(projectDir: string, sourceAssetId: string): Promise<StoredSourceAssetDocument> {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
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
      };
    } else {
      const audioAbs = resolveProjectFile(projectDir, sourceAudioPath);
      await assertFileExists(audioAbs, '全片音频');
      if (sourceAudioMetaPath) {
        await assertFileExists(resolveProjectFile(projectDir, sourceAudioMetaPath), '全片音频元数据');
      }

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
      };

      await fs.writeFile(resolveProjectFile(projectDir, transcriptSrtRel), srtText || buildSrtFromUtterances(utterances), 'utf8');
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
    document.sourceAsset.srtPath = transcriptSrtRel;

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

    document.sourceAsset.updatedAt = generatedAt;
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
