import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import {
  RemixTranscriptCorrectionService,
  getLevenshteinDistance,
  evaluateTextChangeSeverity,
} from '../electron/sceneforge/remix/remix-transcript-correction-service';

vi.mock('node:fs/promises', () => {
  return {
    default: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      stat: vi.fn(),
    },
  };
});

vi.mock('../electron/sceneforge/remix/remix-store', () => {
  return {
    readStoredSourceAsset: vi.fn(),
    writeStoredSourceAsset: vi.fn(),
  };
});

vi.mock('../electron/sceneforge/remix/remix-understanding-workbench', () => {
  return {
    loadRemixUnderstandingWorkbench: vi.fn(),
  };
});

describe('Levenshtein and Severity Helpers', () => {
  it('calculates correct Levenshtein distance', () => {
    expect(getLevenshteinDistance('', '')).toBe(0);
    expect(getLevenshteinDistance('abc', '')).toBe(3);
    expect(getLevenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(getLevenshteinDistance('的地得', '的的的')).toBe(2);
  });

  it('evaluates text change severity correctly', () => {
    // 1. 无感变更
    expect(evaluateTextChangeSeverity('你好。', '你好！')).toBe('none');
    expect(evaluateTextChangeSeverity('跑的快', '跑地快')).toBe('none');
    expect(evaluateTextChangeSeverity('跑得快', '跑的快')).toBe('none');
    expect(evaluateTextChangeSeverity('  你好 ', '你好')).toBe('none');

    // 2. 一般变更 (少数字符修改，不满足 major 比例或绝对阈值)
    expect(evaluateTextChangeSeverity('我们一起去爬山。', '我们一起去去山。')).toBe('minor');
    expect(evaluateTextChangeSeverity('这是一只可爱的狸猫。', '这是一只特别可爱的狸猫。')).toBe('minor');

    // 3. 剧烈修改 (大量字符修改)
    expect(evaluateTextChangeSeverity('这是一只可爱的狸猫。', '今天天气非常不错我们一起去游乐园玩。')).toBe('major');
    // 编辑距离 > 5 且变动比例 > 15%
    expect(evaluateTextChangeSeverity('我喜欢吃苹果', '我不喜欢吃香蕉和西瓜了')).toBe('major');
  });
});

describe('RemixTranscriptCorrectionService - Stale physical reset', () => {
  let service: RemixTranscriptCorrectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RemixTranscriptCorrectionService();
  });

  it('does not reset analysis for minor text change', async () => {
    // 模拟读取 correction.json (之前是 "ASR台词一号")
    const mockCorrectionDoc = {
      schema: 'sceneforge-remix-segment-transcript-correction',
      transcript: {
        asrText: 'ASR台词一号',
        correctedText: 'ASR台词一号',
        effectiveText: 'ASR台词一号',
        correctionStatus: 'edited',
      },
      updatedAt: '2026-06-27T10:00:00.000Z',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockCorrectionDoc)); // get correction

    // 模拟 project store
    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [{ id: 'seg-01', transcriptCorrectionPath: 'corr.json', analysisJsonPath: 'analysis.json' }]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    // 一般修改："ASR台词一号" -> "ASR台词二号"
    await service.updateSegmentTranscriptCorrection(
      '/project',
      'asset-01',
      'seg-01',
      'ASR台词二号',
      false
    );

    // 验证：fs.writeFile 应该只写了 correction.json（1次），不写 analysis.json
    expect(fs.writeFile).toHaveBeenCalledTimes(1); 
  });

  it('does not reset analysis for major text change (transcript independent from visual understanding)', async () => {
    // 模拟读取 correction.json (之前是 "ASR台词一号")
    const mockCorrectionDoc = {
      schema: 'sceneforge-remix-segment-transcript-correction',
      transcript: {
        asrText: 'ASR台词一号',
        correctedText: 'ASR台词一号',
        effectiveText: 'ASR台词一号',
        correctionStatus: 'edited',
      },
      updatedAt: '2026-06-27T10:00:00.000Z',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockCorrectionDoc)); // get correction

    // 模拟 project store
    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [{ id: 'seg-01', transcriptCorrectionPath: 'corr.json', analysisJsonPath: 'analysis.json' }]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    const { loadRemixUnderstandingWorkbench } = await import(
      '../electron/sceneforge/remix/remix-understanding-workbench'
    );
    vi.mocked(loadRemixUnderstandingWorkbench).mockResolvedValueOnce({} as any);

    await service.updateSegmentTranscriptCorrection(
      '/project',
      'asset-01',
      'seg-01',
      '今天天气特别晴朗我们大家高高兴兴出去旅行',
      false,
    );

    // 剧烈台词修改也不清空画面理解产物
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('falls back to latest transcript when correction is older and bound to stale ASR text', async () => {
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(
        JSON.stringify({
          schema: 'sceneforge-remix-segment-transcript',
          plainText: '给我挑一个\n行',
          sourceTranscriptPath: 'source-transcript.json',
          utterances: [],
          quality: { needsReview: false },
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          schema: 'sceneforge-remix-segment-transcript-correction',
          generatedAt: '2026-06-29T14:20:39.000Z',
          updatedAt: '2026-06-29T14:20:39.000Z',
          transcript: {
            asrText: '<|nospeech|>',
            correctedText: '<|nospeech|>',
            effectiveText: '<|nospeech|>',
            correctionStatus: 'confirmed',
          },
          quality: { needsHumanReview: false, warnings: [] },
        }),
      );
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ mtimeMs: Date.parse('2026-06-29T16:39:50.000Z') } as any)
      .mockResolvedValueOnce({ mtimeMs: Date.parse('2026-06-29T14:20:39.000Z') } as any);

    const correction = await service.getSegmentTranscriptCorrection('/project', 'asset-01', 'seg-01');

    expect(correction.transcript.asrText).toBe('给我挑一个\n行');
    expect(correction.transcript.effectiveText).toBe('给我挑一个\n行');
    expect(correction.transcript.correctionStatus).toBe('raw');
    expect(correction.quality.warnings[0]).toContain('旧纠偏内容已回退为最新 ASR 文本');
  });
});
