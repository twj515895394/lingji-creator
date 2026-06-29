import fs from 'node:fs/promises';
import path from 'node:path';
import { getRemixSegmentManifestPath, getRemixSegmentTranscriptJsonPath } from './remix-artifact-paths';
import type { RemixSegmentAsrProvider } from './remix-asr-types';
import { RemixSenseVoiceGgufProvider } from './remix-sensevoice-gguf-provider';
import { readStoredSourceAsset, writeStoredSourceAsset } from './remix-store';
import type { RemixSegmentTranscriptDocument } from './remix-transcript-types';
import { assertFileExists, resolveProjectFile } from './remix-validators';

export interface RemixSegmentTranscriptServiceOptions {
  provider?: RemixSegmentAsrProvider;
}

export class RemixSegmentTranscriptService {
  private readonly provider: RemixSegmentAsrProvider;

  constructor(options: RemixSegmentTranscriptServiceOptions = {}) {
    this.provider = options.provider ?? new RemixSenseVoiceGgufProvider();
  }

  async runSegment(projectDir: string, sourceAssetId: string, segmentId: string) {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const segment = document.sourceAsset.segments.find((item) => item.id === segmentId);
    if (!segment) {
      throw new Error(`未找到片段：${segmentId}`);
    }

    const segmentAudioPath = segment.segmentAudioPath?.trim();
    if (!segmentAudioPath) {
      throw new Error(`片段 ${segmentId} 缺少可用音频，无法执行 SenseVoice 重跑。`);
    }

    const audioAbs = resolveProjectFile(projectDir, segmentAudioPath);
    await assertFileExists(audioAbs, `片段音频(${segment.id})`);
    const transcriptRel = getRemixSegmentTranscriptJsonPath(sourceAssetId, segment.id);
    const transcriptAbs = resolveProjectFile(projectDir, transcriptRel);

    let transcript: RemixSegmentTranscriptDocument;

    try {
      const result = await this.provider.transcribeSegmentAudio({
        projectDir,
        sourceAssetId,
        segmentId: segment.id,
        audioPath: audioAbs,
        sourceStartMs: segment.timeRange.startMs,
        sourceEndMs: segment.timeRange.endMs,
        outputDir: path.dirname(transcriptAbs),
      });

      transcript = {
        schema: 'sceneforge-remix-segment-transcript',
        version: 2,
        segmentId: segment.id,
        sourceAssetId,
        timeRange: {
          sourceStartMs: segment.timeRange.startMs,
          sourceEndMs: segment.timeRange.endMs,
          durationMs: segment.timeRange.durationMs,
        },
        source: 'segment_audio_sensevoice_gguf',
        engine: result.engine,
        mode: 'segment_asr_rerun',
        timestampLevel: result.timestampLevel,
        segmentAudioPath,
        utterances: result.text
          ? [
              {
                sourceUtteranceId: `sensevoice_${segment.id}_001`,
                text: result.text,
                sourceStartMs: segment.timeRange.startMs,
                sourceEndMs: segment.timeRange.endMs,
                relativeStartMs: 0,
                relativeEndMs: segment.timeRange.durationMs,
                confidence: null,
                ...(result.tags ? { tags: result.tags } : {}),
              },
            ]
          : [],
        plainText: result.text,
        rawText: result.rawOutput,
        quality: {
          hasSpeech: Boolean(result.text.trim()),
          avgConfidence: null,
          needsReview: true,
          warnings: [
            'SenseVoice 当前为片段级时间范围，不提供精准 SRT 时间戳',
            ...result.warnings,
          ],
        },
      };
    } catch (error) {
      transcript = {
        schema: 'sceneforge-remix-segment-transcript',
        version: 2,
        segmentId: segment.id,
        sourceAssetId,
        timeRange: {
          sourceStartMs: segment.timeRange.startMs,
          sourceEndMs: segment.timeRange.endMs,
          durationMs: segment.timeRange.durationMs,
        },
        source: 'segment_audio_sensevoice_gguf',
        engine: 'funasr_sensevoice_gguf',
        mode: 'segment_asr_rerun',
        timestampLevel: 'segment_range',
        segmentAudioPath,
        utterances: [],
        plainText: '',
        quality: {
          hasSpeech: false,
          avgConfidence: null,
          needsReview: true,
          warnings: [error instanceof Error ? error.message : String(error)],
        },
      };
    }

    await fs.mkdir(path.dirname(transcriptAbs), { recursive: true });
    await fs.writeFile(transcriptAbs, `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');

    segment.segmentTranscriptJsonPath = transcriptRel;
    await fs.writeFile(
      resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
      `${JSON.stringify(segment, null, 2)}\n`,
      'utf8',
    );

    document.sourceAsset.updatedAt = new Date().toISOString();
    await writeStoredSourceAsset(projectDir, document);
    return transcript;
  }

  async run(projectDir: string, sourceAssetId: string) {
    const document = await readStoredSourceAsset(projectDir, sourceAssetId);
    const updatedAt = new Date().toISOString();

    for (const segment of document.sourceAsset.segments) {
      const segmentAudioPath = segment.segmentAudioPath?.trim();
      if (!segmentAudioPath) {
        continue;
      }

      const audioAbs = resolveProjectFile(projectDir, segmentAudioPath);
      await assertFileExists(audioAbs, `片段音频(${segment.id})`);
      const transcriptRel = getRemixSegmentTranscriptJsonPath(sourceAssetId, segment.id);
      const transcriptAbs = resolveProjectFile(projectDir, transcriptRel);

      let transcript: RemixSegmentTranscriptDocument;

      try {
        const result = await this.provider.transcribeSegmentAudio({
          projectDir,
          sourceAssetId,
          segmentId: segment.id,
          audioPath: audioAbs,
          sourceStartMs: segment.timeRange.startMs,
          sourceEndMs: segment.timeRange.endMs,
          outputDir: path.dirname(transcriptAbs),
        });

        transcript = {
          schema: 'sceneforge-remix-segment-transcript',
          version: 2,
          segmentId: segment.id,
          sourceAssetId,
          timeRange: {
            sourceStartMs: segment.timeRange.startMs,
            sourceEndMs: segment.timeRange.endMs,
            durationMs: segment.timeRange.durationMs,
          },
          source: 'segment_audio_sensevoice_gguf',
          engine: result.engine,
          mode: result.mode,
          timestampLevel: result.timestampLevel,
          segmentAudioPath,
          utterances: result.text
            ? [
                {
                  sourceUtteranceId: `sensevoice_${segment.id}_001`,
                  text: result.text,
                  sourceStartMs: segment.timeRange.startMs,
                  sourceEndMs: segment.timeRange.endMs,
                  relativeStartMs: 0,
                  relativeEndMs: segment.timeRange.durationMs,
                  confidence: null,
                  ...(result.tags ? { tags: result.tags } : {}),
                },
              ]
            : [],
          plainText: result.text,
          rawText: result.rawOutput,
          quality: {
            hasSpeech: Boolean(result.text.trim()),
            avgConfidence: null,
            needsReview: true,
            warnings: [
              'SenseVoice 当前为片段级时间范围，不提供精准 SRT 时间戳',
              ...result.warnings,
            ],
          },
        };
      } catch (error) {
        transcript = {
          schema: 'sceneforge-remix-segment-transcript',
          version: 2,
          segmentId: segment.id,
          sourceAssetId,
          timeRange: {
            sourceStartMs: segment.timeRange.startMs,
            sourceEndMs: segment.timeRange.endMs,
            durationMs: segment.timeRange.durationMs,
          },
          source: 'segment_audio_sensevoice_gguf',
          engine: 'funasr_sensevoice_gguf',
          mode: 'segment_audio_asr',
          timestampLevel: 'segment_range',
          segmentAudioPath,
          utterances: [],
          plainText: '',
          quality: {
            hasSpeech: false,
            avgConfidence: null,
            needsReview: true,
            warnings: [error instanceof Error ? error.message : String(error)],
          },
        };
      }

      await fs.mkdir(path.dirname(transcriptAbs), { recursive: true });
      await fs.writeFile(transcriptAbs, `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');

      segment.segmentTranscriptJsonPath = transcriptRel;
      await fs.writeFile(
        resolveProjectFile(projectDir, getRemixSegmentManifestPath(sourceAssetId, segment.id)),
        `${JSON.stringify(segment, null, 2)}\n`,
        'utf8',
      );
    }

    document.sourceAsset.updatedAt = updatedAt;
    await writeStoredSourceAsset(projectDir, document);
    return document;
  }
}
