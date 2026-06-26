import { describe, expect, it } from 'vitest';
import { buildSrtFromUtterances, utterancesFromSrt } from '../electron/sceneforge/remix/remix-whisper-provider';
import { parseSrt } from '../src/lib/srt-parser';

const sampleSrt = `1
00:00:00,420 --> 00:00:02,900
这里是第一句

2
00:00:03,100 --> 00:00:06,800
第二句对白
`;

describe('SceneForge Remix whisper provider parsing', () => {
  it('parses sample srt into utterances and round-trips through serializeSrt', () => {
    const utterances = utterancesFromSrt(sampleSrt);
    expect(utterances).toHaveLength(2);
    expect(utterances[0].startMs).toBe(420);
    expect(utterances[1].text).toBe('第二句对白');

    const rebuilt = buildSrtFromUtterances(utterances);
    const parsedAgain = parseSrt(rebuilt);
    expect(parsedAgain).toHaveLength(2);
    expect(parsedAgain[0].startMs).toBe(420);
    expect(parsedAgain[1].endMs).toBe(6800);
  });
});
