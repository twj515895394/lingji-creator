import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import { RemixUnderstandingService } from '../electron/sceneforge/remix/remix-understanding-service';

vi.mock('node:fs/promises', () => {
  return {
    default: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
    },
  };
});

vi.mock('../electron/sceneforge/remix/remix-store', () => {
  return {
    readStoredSourceAsset: vi.fn(),
    writeStoredSourceAsset: vi.fn(),
  };
});

vi.mock('../electron/sceneforge/remix/remix-understanding-gate', () => {
  return {
    buildRemixUnderstandingInputFingerprint: vi.fn(),
  };
});

describe('RemixUnderstandingService - Freshness Verification', () => {
  let service: RemixUnderstandingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RemixUnderstandingService({
      loadAISettings: async () => ({
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        aiApiKey: 'test-key',
        capabilities: { structuredJson: true, visionInput: false, localFileImageInput: false }
      } as any),
    });
  });

  it('reports missing_analysis when analysis JSON does not exist', async () => {
    // 模拟读取 StoredSourceAsset
    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [
          {
            id: 'seg-01',
            sourceAssetId: 'asset-01',
            timeRange: { startMs: 0, endMs: 5000 },
            keyframes: [],
            segmentTranscriptJsonPath: 'trans.json',
            transcriptCorrectionPath: 'corr.json',
          }
        ]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    // 1. 模拟读取台词 ASR (trans.json) 成功
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ plainText: '原始台词' }));
    // 2. 模拟读取台词校对 (corr.json) 失败 (使用原始 ASR 作为 input 基础)
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));
    // 3. 模拟读取 analysis.json 失败 (表示缺失)
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

    const report = await service.validateUnderstandingFreshness('/project', 'asset-01');

    expect(report.isStale).toBe(true);
    expect(report.staleSegmentIds).toContain('seg-01');
    expect(report.staleReasons).toContain('missing_analysis');
    expect(report.segmentReports[0].staleReasons).toContain('missing_analysis');
  });

  it('reports fresh when current input hash matches stored hash', async () => {
    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [
          {
            id: 'seg-01',
            sourceAssetId: 'asset-01',
            timeRange: { startMs: 0, endMs: 5000 },
            keyframes: [],
            segmentTranscriptJsonPath: 'trans.json',
            transcriptCorrectionPath: 'corr.json',
            analysisJsonPath: 'analysis.json',
          }
        ]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    // 1. 模拟读取台词 ASR (trans.json)
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ plainText: '原始台词' }));
    // 2. 模拟读取台词校对 (corr.json) (已校对为：修改后台词)
    const mockCorrection = {
      transcript: { effectiveText: '修改后台词' }
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockCorrection));

    // 计算哈希所需的 input: effectiveText 为 '修改后台词'
    // 3. 模拟读取 analysis.json 成功，且已存的 inputHash 与计算一致
    // 我们先自己算一下正确的 inputHash
    const { buildSegmentUnderstandingInputHash } = await import('../electron/sceneforge/remix/remix-segment-understanding-schema');
    const expectedHash = buildSegmentUnderstandingInputHash({
      segment: mockDoc.sourceAsset.segments[0] as any,
      transcript: { plainText: '修改后台词' } as any,
      keyframes: [],
    });

    const mockAnalysis = {
      schema: 'sceneforge-remix-segment-understanding',
      segmentId: 'seg-01',
      inputHash: expectedHash,
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockAnalysis));

    const report = await service.validateUnderstandingFreshness('/project', 'asset-01');

    expect(report.isStale).toBe(false);
    expect(report.staleSegmentIds).toEqual([]);
    expect(report.staleReasons).toEqual([]);
  });

  it('reports stale and transcript_correction_changed when input hash differs', async () => {
    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [
          {
            id: 'seg-01',
            sourceAssetId: 'asset-01',
            timeRange: { startMs: 0, endMs: 5000 },
            keyframes: [],
            segmentTranscriptJsonPath: 'trans.json',
            transcriptCorrectionPath: 'corr.json',
            analysisJsonPath: 'analysis.json',
          }
        ]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    // 1. 模拟读取台词 ASR (trans.json)
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ plainText: '原始台词' }));
    // 2. 模拟读取台词校对 (corr.json) (已校对为：全新台词)
    const mockCorrection = {
      transcript: { effectiveText: '全新台词' }
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockCorrection));

    // 3. 模拟读取 analysis.json 成功，但里面的 inputHash 依然是旧的 (基于 "原始台词" 算出来的)
    const { buildSegmentUnderstandingInputHash } = await import('../electron/sceneforge/remix/remix-segment-understanding-schema');
    const oldHash = buildSegmentUnderstandingInputHash({
      segment: mockDoc.sourceAsset.segments[0] as any,
      transcript: { plainText: '原始台词' } as any,
      keyframes: [],
    });

    const mockAnalysis = {
      schema: 'sceneforge-remix-segment-understanding',
      segmentId: 'seg-01',
      inputHash: oldHash,
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockAnalysis));

    const report = await service.validateUnderstandingFreshness('/project', 'asset-01');

    expect(report.isStale).toBe(true);
    expect(report.staleSegmentIds).toContain('seg-01');
    expect(report.staleReasons).toContain('transcript_correction_changed');
    expect(report.segmentReports[0].staleReasons).toContain('transcript_correction_changed');
  });

  it('reports stale and frame_vision_changed when frame vision file generatedAt is newer than existing generatedAt', async () => {
    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [
          {
            id: 'seg-01',
            sourceAssetId: 'asset-01',
            timeRange: { startMs: 0, endMs: 5000 },
            keyframes: [],
            segmentTranscriptJsonPath: 'trans.json',
            transcriptCorrectionPath: 'corr.json',
            analysisJsonPath: 'analysis.json',
          }
        ]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    // 1. 模拟读取台词 ASR (trans.json)
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ plainText: '原始台词' }));
    // 2. 模拟读取台词校对 (corr.json)
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ transcript: { effectiveText: '修改后台词' } }));

    // 计算哈希
    const { buildSegmentUnderstandingInputHash } = await import('../electron/sceneforge/remix/remix-segment-understanding-schema');
    const expectedHash = buildSegmentUnderstandingInputHash({
      segment: mockDoc.sourceAsset.segments[0] as any,
      transcript: { plainText: '修改后台词' } as any,
      keyframes: [],
    });

    // 3. 模拟读取 analysis.json 成功，且已存的 inputHash 与计算一致。
    const mockAnalysis = {
      schema: 'sceneforge-remix-segment-understanding',
      segmentId: 'seg-01',
      inputHash: expectedHash,
      generatedAt: '2026-06-28T09:00:00.000Z',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockAnalysis));

    // 4. 模拟读取 frame_vision.json 成功，且其 generatedAt 为 2026-06-28T09:10:00.000Z (更新一些)
    const mockFv = {
      schema: 'sceneforge-remix-segment-frame-vision',
      generatedAt: '2026-06-28T09:10:00.000Z',
      inputHash: 'fv-hash',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockFv));

    const report = await service.validateUnderstandingFreshness('/project', 'asset-01');

    expect(report.isStale).toBe(true);
    expect(report.staleSegmentIds).toContain('seg-01');
    expect(report.staleReasons).toContain('frame_vision_changed');
    expect(report.segmentReports[0].staleReasons).toContain('frame_vision_changed');
  });
});
