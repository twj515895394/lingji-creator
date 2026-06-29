import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getRemixSegmentAudioWavPath,
  getRemixSegmentManifestPath,
  getRemixSourceManifestPath,
} from '../electron/sceneforge/remix/remix-artifact-paths';
import { RemixSegmentTranscriptService } from '../electron/sceneforge/remix/remix-segment-transcript-service';
import { writeStoredSourceAsset } from '../electron/sceneforge/remix/remix-store';
import type { SourceSegment } from '../src/sceneforge/remix/types';

let projectDir: string;

function buildSegment(sourceAssetId: string, segmentId: string, index: number): SourceSegment {
  return {
    id: segmentId,
    sourceAssetId,
    index,
    title: `Segment ${index + 1}`,
    boundaryType: 'long_segment',
    timeRange: {
      startMs: index * 5_000,
      endMs: index * 5_000 + 5_000,
      durationMs: 5_000,
    },
    sourceClipPath: `clips/${segmentId}.mp4`,
    keyframes: [],
    segmentAudioPath: null,
    segmentAudioJsonPath: null,
    segmentTranscriptJsonPath: null,
    transcriptCorrectionPath: null,
    audioSkippedReason: null,
  };
}

async function seedSourceAsset(sourceAssetId: string, segments: SourceSegment[]) {
  await writeStoredSourceAsset(projectDir, {
    schema: 'sceneforge-remix-source-asset',
    version: 1,
    processingStageStates: {},
    sourceAsset: {
      id: sourceAssetId,
      title: 'demo',
      status: 'processing',
      createdAt: '2026-06-29T00:00:00.000Z',
      updatedAt: '2026-06-29T00:00:00.000Z',
      sourceVideoPath: 'source.mp4',
      sourceManifestPath: getRemixSourceManifestPath(sourceAssetId),
      transcriptPath: null,
      srtPath: null,
      videoMetadata: {
        durationMs: 15_000,
        width: 1080,
        height: 1920,
        hasAudio: true,
      },
      sourceAudioPath: null,
      sourceAudioJsonPath: null,
      segments,
      variantCount: 0,
      tags: [],
    },
  });
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'remix-seg-transcript-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SenseVoice segment transcript service', () => {
  it('writes transcript v2 and updates segment manifests for segments with audio', async () => {
    const sourceAssetId = 'asset-001';
    const seg1 = buildSegment(sourceAssetId, 'seg-001', 0);
    const seg2 = buildSegment(sourceAssetId, 'seg-002', 1);
    seg1.segmentAudioPath = getRemixSegmentAudioWavPath(sourceAssetId, seg1.id);
    seg2.segmentAudioPath = getRemixSegmentAudioWavPath(sourceAssetId, seg2.id);
    await seedSourceAsset(sourceAssetId, [seg1, seg2]);
    await fs.mkdir(path.dirname(path.join(projectDir, seg1.segmentAudioPath)), { recursive: true });
    await fs.mkdir(path.dirname(path.join(projectDir, seg2.segmentAudioPath)), { recursive: true });
    await fs.writeFile(path.join(projectDir, seg1.segmentAudioPath), 'audio-1', 'utf8');
    await fs.writeFile(path.join(projectDir, seg2.segmentAudioPath), 'audio-2', 'utf8');

    const service = new RemixSegmentTranscriptService({
      provider: {
        capabilities: {
          engine: 'funasr_sensevoice_gguf',
          mode: 'segment_audio_asr',
          timestampLevel: 'segment_range',
          canGenerateAccurateSrt: false,
          canProvideSegmentDialogue: true,
        },
        async transcribeSegmentAudio(input) {
          return {
            engine: 'funasr_sensevoice_gguf',
            mode: 'segment_audio_asr',
            timestampLevel: 'segment_range',
            text: `台词-${input.segmentId}`,
            tags: { language: 'zh', emotion: 'NEUTRAL', event: 'Speech', itn: 'woitn' },
            rawOutput: `<|zh|><|NEUTRAL|><|Speech|><|woitn|>台词-${input.segmentId}`,
            stderr: '',
            durationMs: 12,
            warnings: [],
          };
        },
      },
    });

    const result = await service.run(projectDir, sourceAssetId);
    const transcript1 = JSON.parse(
      await fs.readFile(path.join(projectDir, result.sourceAsset.segments[0].segmentTranscriptJsonPath ?? ''), 'utf8'),
    );
    const manifest1 = JSON.parse(
      await fs.readFile(path.join(projectDir, getRemixSegmentManifestPath(sourceAssetId, 'seg-001')), 'utf8'),
    );

    expect(transcript1.version).toBe(2);
    expect(transcript1.source).toBe('segment_audio_sensevoice_gguf');
    expect(transcript1.engine).toBe('funasr_sensevoice_gguf');
    expect(transcript1.timestampLevel).toBe('segment_range');
    expect(transcript1.utterances[0].tags.language).toBe('zh');
    expect(transcript1.quality.warnings).toContain('SenseVoice 当前为片段级时间范围，不提供精准 SRT 时间戳');
    expect(manifest1.segmentTranscriptJsonPath).toContain('segment_transcript.json');
  });

  it('skips segments without audio and keeps processing other segments after failures', async () => {
    const sourceAssetId = 'asset-002';
    const seg1 = buildSegment(sourceAssetId, 'seg-101', 0);
    const seg2 = buildSegment(sourceAssetId, 'seg-102', 1);
    const seg3 = buildSegment(sourceAssetId, 'seg-103', 2);
    seg1.segmentAudioPath = getRemixSegmentAudioWavPath(sourceAssetId, seg1.id);
    seg3.segmentAudioPath = getRemixSegmentAudioWavPath(sourceAssetId, seg3.id);
    await seedSourceAsset(sourceAssetId, [seg1, seg2, seg3]);
    await fs.mkdir(path.dirname(path.join(projectDir, seg1.segmentAudioPath)), { recursive: true });
    await fs.mkdir(path.dirname(path.join(projectDir, seg3.segmentAudioPath)), { recursive: true });
    await fs.writeFile(path.join(projectDir, seg1.segmentAudioPath), 'audio-1', 'utf8');
    await fs.writeFile(path.join(projectDir, seg3.segmentAudioPath), 'audio-3', 'utf8');

    const service = new RemixSegmentTranscriptService({
      provider: {
        capabilities: {
          engine: 'funasr_sensevoice_gguf',
          mode: 'segment_audio_asr',
          timestampLevel: 'segment_range',
          canGenerateAccurateSrt: false,
          canProvideSegmentDialogue: true,
        },
        async transcribeSegmentAudio(input) {
          if (input.segmentId === 'seg-103') {
            throw new Error('mock sensevoice failure');
          }
          return {
            engine: 'funasr_sensevoice_gguf',
            mode: 'segment_audio_asr',
            timestampLevel: 'segment_range',
            text: '成功台词',
            rawOutput: '成功台词',
            stderr: '',
            durationMs: 10,
            warnings: [],
          };
        },
      },
    });

    const result = await service.run(projectDir, sourceAssetId);
    const successTranscript = JSON.parse(
      await fs.readFile(path.join(projectDir, result.sourceAsset.segments[0].segmentTranscriptJsonPath ?? ''), 'utf8'),
    );
    const failedTranscript = JSON.parse(
      await fs.readFile(path.join(projectDir, result.sourceAsset.segments[2].segmentTranscriptJsonPath ?? ''), 'utf8'),
    );

    expect(result.sourceAsset.segments[1].segmentTranscriptJsonPath).toBeNull();
    expect(successTranscript.plainText).toBe('成功台词');
    expect(failedTranscript.plainText).toBe('');
    expect(failedTranscript.quality.hasSpeech).toBe(false);
    expect(failedTranscript.quality.needsReview).toBe(true);
    expect(failedTranscript.quality.warnings[0]).toContain('mock sensevoice failure');
  });
});
