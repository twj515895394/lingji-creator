import { describe, expect, it, vi } from 'vitest';
import { readAudioDurationMs, readVideoMetadata } from '../electron/media-duration';

describe('readAudioDurationMs', () => {
  it('uses ffprobe instead of video metadata for audio files', async () => {
    const execFile = vi.fn(async () => ({
      stdout: '12.345000\n',
      stderr: '',
    }));

    const durationMs = await readAudioDurationMs('C:/demo/podcast-audio.mp3', {
      binariesDirectory: 'C:/ffmpeg-bin',
      execFile,
    });

    expect(durationMs).toBe(12345);
    expect(execFile).toHaveBeenCalledWith(
      expect.stringContaining('ffprobe'),
      expect.arrayContaining([
        '-show_entries',
        'format=duration',
        'C:/demo/podcast-audio.mp3',
      ]),
    );
  });

  it('rejects invalid ffprobe duration output', async () => {
    await expect(
      readAudioDurationMs('C:/demo/podcast-audio.mp3', {
        binariesDirectory: null,
        execFile: async () => ({ stdout: 'N/A\n', stderr: '' }),
      }),
    ).rejects.toThrow('Unable to read media duration');
  });

  it('prefers an explicit packaged ffprobe path', async () => {
    const execFile = vi.fn(async () => ({
      stdout: '1.500000\n',
      stderr: '',
    }));

    await readAudioDurationMs('/tmp/audio.mp3', {
      binariesDirectory: '/ignored',
      ffprobePath: '/app/resources/app.asar.unpacked/node_modules/ffprobe-static/bin/darwin/arm64/ffprobe',
      execFile,
    });

    expect(execFile).toHaveBeenCalledWith(
      '/app/resources/app.asar.unpacked/node_modules/ffprobe-static/bin/darwin/arm64/ffprobe',
      expect.any(Array),
    );
  });
});

describe('readVideoMetadata', () => {
  it('reads duration, resolution, fps, and audio presence from ffprobe json', async () => {
    const execFile = vi.fn(async () => ({
      stdout: JSON.stringify({
        format: { duration: '8.008000' },
        streams: [
          {
            codec_type: 'video',
            width: 852,
            height: 480,
            avg_frame_rate: '30000/1001',
            r_frame_rate: '30000/1001',
          },
          {
            codec_type: 'audio',
            channels: 2,
          },
        ],
      }),
      stderr: '',
    }));

    const metadata = await readVideoMetadata('/tmp/source.mp4', {
      ffprobePath: '/runtime/ffprobe',
      execFile,
    });

    expect(metadata).toEqual({
      durationMs: 8008,
      width: 852,
      height: 480,
      fps: 29.97,
      audioChannels: 2,
      hasAudio: true,
    });
    expect(execFile).toHaveBeenCalledWith(
      '/runtime/ffprobe',
      expect.arrayContaining([
        '-print_format',
        'json',
        '-show_entries',
        'format=duration:stream=codec_type,width,height,avg_frame_rate,r_frame_rate,channels',
        '/tmp/source.mp4',
      ]),
    );
  });

  it('returns null fps and no audio when ffprobe reports a silent video stream only', async () => {
    const metadata = await readVideoMetadata('/tmp/silent.mp4', {
      execFile: async () => ({
        stdout: JSON.stringify({
          format: { duration: '3.500000' },
          streams: [
            {
              codec_type: 'video',
              width: 1920,
              height: 1080,
              avg_frame_rate: '0/0',
              r_frame_rate: '0/0',
            },
          ],
        }),
        stderr: '',
      }),
    });

    expect(metadata).toEqual({
      durationMs: 3500,
      width: 1920,
      height: 1080,
      fps: null,
      audioChannels: null,
      hasAudio: false,
    });
  });
});
