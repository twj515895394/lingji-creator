import type { RemixAsrEngine, RemixResolvedAsrEngine } from './remix-asr-types';

export const DEFAULT_REMIX_ASR_ENGINE: RemixAsrEngine = 'auto';

const SUPPORTED_REMIX_ASR_ENGINES: readonly RemixAsrEngine[] = [
  'auto',
  'funasr_sensevoice_gguf',
  'local_whisper_cpp',
  'bcut',
  'imported_srt',
  'no_audio',
];

export interface RemixAsrAvailability {
  available: boolean;
  reason?: string;
}

export interface RemixAsrProviderPlan {
  engine: RemixResolvedAsrEngine;
  reason:
    | 'forced_sensevoice'
    | 'forced_whisper'
    | 'forced_bcut'
    | 'forced_imported_srt'
    | 'auto_sensevoice_available'
    | 'sensevoice_unavailable_fallback_to_whisper'
    | 'no_audio';
}

export interface ResolveRemixAsrEnginePreferenceInput {
  preferredEngine?: RemixAsrEngine | null;
}

export interface ResolveRemixAsrProviderPlanInput {
  preferredEngine?: RemixAsrEngine | null;
  hasAudio?: boolean;
  probes: {
    sensevoice: () => Promise<RemixAsrAvailability>;
    whisper: () => Promise<RemixAsrAvailability>;
  };
}

export function isSupportedRemixAsrEngine(value: string): value is RemixAsrEngine {
  return SUPPORTED_REMIX_ASR_ENGINES.includes(value as RemixAsrEngine);
}

export function resolveRemixAsrEnginePreference(
  input: ResolveRemixAsrEnginePreferenceInput = {},
): RemixAsrEngine {
  if (input.preferredEngine) {
    return input.preferredEngine;
  }

  const envValue = process.env.REMIX_STT_ENGINE?.trim();
  if (envValue && isSupportedRemixAsrEngine(envValue)) {
    return envValue;
  }

  return DEFAULT_REMIX_ASR_ENGINE;
}

export async function resolveRemixAsrProviderPlan(
  input: ResolveRemixAsrProviderPlanInput,
): Promise<RemixAsrProviderPlan> {
  if (input.hasAudio === false) {
    return { engine: 'no_audio', reason: 'no_audio' };
  }

  const preferred = resolveRemixAsrEnginePreference({
    preferredEngine: input.preferredEngine ?? null,
  });

  if (preferred === 'local_whisper_cpp') {
    return { engine: 'local_whisper_cpp', reason: 'forced_whisper' };
  }

  if (preferred === 'funasr_sensevoice_gguf') {
    const sensevoice = await input.probes.sensevoice();
    if (!sensevoice.available) {
      throw new Error(`SenseVoice 不可用：${sensevoice.reason ?? 'unknown reason'}`);
    }
    return { engine: 'funasr_sensevoice_gguf', reason: 'forced_sensevoice' };
  }

  if (preferred === 'bcut') {
    return { engine: 'bcut', reason: 'forced_bcut' };
  }

  if (preferred === 'imported_srt') {
    return { engine: 'imported_srt', reason: 'forced_imported_srt' };
  }

  if (preferred === 'no_audio') {
    return { engine: 'no_audio', reason: 'no_audio' };
  }

  const sensevoice = await input.probes.sensevoice();
  if (sensevoice.available) {
    return { engine: 'funasr_sensevoice_gguf', reason: 'auto_sensevoice_available' };
  }

  const whisper = await input.probes.whisper();
  if (whisper.available) {
    return {
      engine: 'local_whisper_cpp',
      reason: 'sensevoice_unavailable_fallback_to_whisper',
    };
  }

  throw new Error(
    `未找到可用的 Remix ASR Provider：SenseVoice=${sensevoice.reason ?? 'unavailable'}，Whisper=${whisper.reason ?? 'unavailable'}`,
  );
}
