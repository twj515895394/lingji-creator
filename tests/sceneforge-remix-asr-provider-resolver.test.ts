import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_REMIX_ASR_ENGINE,
  resolveRemixAsrEnginePreference,
  resolveRemixAsrProviderPlan,
} from '../electron/sceneforge/remix/remix-asr-provider-resolver';

describe('resolveRemixAsrEnginePreference', () => {
  afterEach(() => {
    delete process.env.REMIX_STT_ENGINE;
  });

  it('defaults to auto when no explicit option or env is provided', () => {
    const result = resolveRemixAsrEnginePreference({});
    expect(result).toBe(DEFAULT_REMIX_ASR_ENGINE);
  });

  it('accepts funasr_sensevoice_gguf and local_whisper_cpp as explicit values', () => {
    const sensevoice = resolveRemixAsrEnginePreference({
      preferredEngine: 'funasr_sensevoice_gguf',
    });
    const whisper = resolveRemixAsrEnginePreference({
      preferredEngine: 'local_whisper_cpp',
    });

    expect(sensevoice).toBe('funasr_sensevoice_gguf');
    expect(whisper).toBe('local_whisper_cpp');
  });

  it('uses explicit preferredEngine before env', () => {
    process.env.REMIX_STT_ENGINE = 'local_whisper_cpp';
    const result = resolveRemixAsrEnginePreference({
      preferredEngine: 'funasr_sensevoice_gguf',
    });
    expect(result).toBe('funasr_sensevoice_gguf');
  });

  it('uses REMIX_STT_ENGINE when explicit preferredEngine is omitted', () => {
    process.env.REMIX_STT_ENGINE = 'local_whisper_cpp';
    expect(resolveRemixAsrEnginePreference({})).toBe('local_whisper_cpp');
  });
});

describe('resolveRemixAsrProviderPlan', () => {
  it('falls back to local_whisper_cpp when auto mode cannot use sensevoice', async () => {
    const result = await resolveRemixAsrProviderPlan({
      preferredEngine: 'auto',
      probes: {
        sensevoice: async () => ({ available: false, reason: 'missing model' }),
        whisper: async () => ({ available: true }),
      },
    });

    expect(result.engine).toBe('local_whisper_cpp');
    expect(result.reason).toBe('sensevoice_unavailable_fallback_to_whisper');
  });

  it('throws when forced sensevoice is unavailable', async () => {
    await expect(
      resolveRemixAsrProviderPlan({
        preferredEngine: 'funasr_sensevoice_gguf',
        probes: {
          sensevoice: async () => ({ available: false, reason: 'missing model' }),
          whisper: async () => ({ available: true }),
        },
      }),
    ).rejects.toThrow('SenseVoice');
  });

  it('prefers sensevoice in auto mode when it is available', async () => {
    const result = await resolveRemixAsrProviderPlan({
      preferredEngine: 'auto',
      probes: {
        sensevoice: async () => ({ available: true }),
        whisper: async () => ({ available: true }),
      },
    });

    expect(result.engine).toBe('funasr_sensevoice_gguf');
    expect(result.reason).toBe('auto_sensevoice_available');
  });

  it('returns no_audio when the source asset has no audio track', async () => {
    const result = await resolveRemixAsrProviderPlan({
      hasAudio: false,
      probes: {
        sensevoice: async () => ({ available: true }),
        whisper: async () => ({ available: true }),
      },
    });

    expect(result.engine).toBe('no_audio');
    expect(result.reason).toBe('no_audio');
  });
});
