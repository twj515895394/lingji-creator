import type {
  RemixSenseVoiceTags,
  RemixAsrTimestampLevel,
  RemixResolvedAsrEngine,
  RemixTranscriptMode,
} from './remix-asr-types';

export interface RemixTranscriptUtterance {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
  speaker?: string | null;
}

export interface RemixSourceTranscriptDocument {
  schema: 'sceneforge-remix-source-transcript';
  version: 1 | 2;
  sourceAssetId: string;
  language: string;
  engine: RemixResolvedAsrEngine;
  mode: RemixTranscriptMode;
  timestampLevel?: RemixAsrTimestampLevel;
  canGenerateAccurateSrt?: boolean;
  generatedAt: string;
  durationMs: number;
  inputRefs: {
    audioPath: string | null;
    segmentAudioPaths?: Record<string, string | null>;
    importSrtPath?: string | null;
    importMarkdownPath?: string | null;
  };
  inputHash?: {
    audioSha256?: string;
    segmentAudioSha256?: Record<string, string>;
    promptVersion?: string;
  };
  quality: {
    hasSpeech: boolean;
    utteranceCount: number;
    avgConfidence: number | null;
    needsReview: boolean;
    warnings: string[];
  };
  utterances: RemixTranscriptUtterance[];
  plainText: string;
  srtPath?: string | null;
  srtStatus?: 'not_generated' | 'accurate' | 'coarse' | 'fallback_whisper';
}

export interface RemixSegmentTranscriptDocument {
  schema: 'sceneforge-remix-segment-transcript';
  version: 1 | 2;
  segmentId: string;
  sourceAssetId: string;
  timeRange: {
    sourceStartMs: number;
    sourceEndMs: number;
    durationMs: number;
  };
  source: 'aligned_from_source_transcript' | 'segment_audio_sensevoice_gguf';
  engine?: RemixResolvedAsrEngine;
  mode?: RemixTranscriptMode;
  timestampLevel?: RemixAsrTimestampLevel;
  sourceTranscriptPath?: string;
  segmentAudioPath?: string | null;
  utterances: Array<{
    sourceUtteranceId: string;
    text: string;
    sourceStartMs: number;
    sourceEndMs: number;
    relativeStartMs: number;
    relativeEndMs: number;
    confidence?: number | null;
    tags?: RemixSenseVoiceTags;
  }>;
  plainText: string;
  rawText?: string;
  quality: {
    hasSpeech: boolean;
    avgConfidence: number | null;
    needsReview: boolean;
    warnings?: string[];
  };
}
