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
  version: 1;
  sourceAssetId: string;
  language: string;
  engine: 'local_whisper_cpp' | 'bcut' | 'imported_srt' | 'no_audio';
  mode: 'full_source_asr' | 'imported_srt' | 'segment_asr_rerun' | 'no_audio';
  generatedAt: string;
  durationMs: number;
  inputRefs: {
    audioPath: string | null;
    importSrtPath?: string | null;
    importMarkdownPath?: string | null;
  };
  inputHash?: {
    audioSha256?: string;
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
  srtPath: string;
}

export interface RemixSegmentTranscriptDocument {
  schema: 'sceneforge-remix-segment-transcript';
  version: 1;
  segmentId: string;
  sourceAssetId: string;
  timeRange: {
    sourceStartMs: number;
    sourceEndMs: number;
    durationMs: number;
  };
  source: 'aligned_from_source_transcript';
  sourceTranscriptPath: string;
  utterances: Array<{
    sourceUtteranceId: string;
    text: string;
    sourceStartMs: number;
    sourceEndMs: number;
    relativeStartMs: number;
    relativeEndMs: number;
    confidence?: number | null;
  }>;
  plainText: string;
  quality: {
    hasSpeech: boolean;
    avgConfidence: number | null;
    needsReview: boolean;
  };
}
