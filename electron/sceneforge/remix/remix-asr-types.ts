export type RemixAsrEngine =
  | 'auto'
  | 'funasr_sensevoice_gguf'
  | 'local_whisper_cpp'
  | 'bcut'
  | 'imported_srt'
  | 'no_audio';

export type RemixResolvedAsrEngine = Exclude<RemixAsrEngine, 'auto'>;

export type RemixAsrProviderMode =
  | 'segment_audio_asr'
  | 'source_audio_asr'
  | 'imported_srt'
  | 'no_audio';

export type RemixTranscriptMode =
  | 'full_source_asr'
  | 'segment_audio_asr'
  | 'imported_srt'
  | 'segment_asr_rerun'
  | 'no_audio';

export type RemixAsrTimestampLevel =
  | 'none'
  | 'segment_range'
  | 'vad_segment'
  | 'sentence'
  | 'word';

export interface RemixAsrProviderCapabilities {
  engine: RemixResolvedAsrEngine;
  mode: RemixAsrProviderMode;
  timestampLevel: RemixAsrTimestampLevel;
  canGenerateAccurateSrt: boolean;
  canProvideSegmentDialogue: boolean;
  supportsTags?: boolean;
  supportsEmotion?: boolean;
  supportsEvent?: boolean;
}
