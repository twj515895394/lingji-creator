import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import { RemixTranscriptCorrectionService } from '../electron/sceneforge/remix/remix-transcript-correction-service';
import { loadRemixUnderstandingWorkbench } from '../electron/sceneforge/remix/remix-understanding-workbench';

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

vi.mock('../electron/sceneforge/remix/remix-understanding-workbench', () => {
  return {
    loadRemixUnderstandingWorkbench: vi.fn(),
  };
});

describe('RemixTranscriptCorrectionService', () => {
  let service: RemixTranscriptCorrectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RemixTranscriptCorrectionService();
  });

  it('falls back to raw ASR when correction JSON does not exist', async () => {
    // 模拟读取 correction.json 失败 (ENOENT)
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('File not found'));
    // 模拟读取 segment_transcript.json 成功
    const mockAsr = {
      schema: 'sceneforge-remix-segment-transcript',
      version: 1,
      segmentId: 'seg-01',
      sourceAssetId: 'asset-01',
      plainText: 'ASR转写台词文本',
      utterances: [
        { sourceUtteranceId: 'ut-01', text: 'ASR转写台词文本', relativeStartMs: 0, relativeEndMs: 1000 }
      ],
      quality: { needsReview: true }
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockAsr));

    const result = await service.getSegmentTranscriptCorrection('/project', 'asset-01', 'seg-01');

    expect(result.transcript.asrText).toBe('ASR转写台词文本');
    expect(result.transcript.correctedText).toBe('');
    expect(result.transcript.effectiveText).toBe('ASR转写台词文本');
    expect(result.transcript.correctionStatus).toBe('raw');
    expect(result.updatedAt).toBe('');
    expect(result.dialogueLines[0].asrText).toBe('ASR转写台词文本');
  });

  it('updates transcript correction and persists to disk', async () => {
    // 模拟已存在 raw correction (get 方法回退)
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('File not found')); // get correction
    const mockAsr = { plainText: 'ASR台词' };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockAsr)); // get asr

    // 模拟 project store
    const { readStoredSourceAsset, writeStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    const mockDoc = {
      sourceAsset: {
        id: 'asset-01',
        segments: [{ id: 'seg-01', transcriptCorrectionPath: null }]
      }
    };
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce(mockDoc as any);

    // 模拟 workbench
    vi.mocked(loadRemixUnderstandingWorkbench).mockResolvedValueOnce({ workbenchSnap: true } as any);

    const workbench = await service.updateSegmentTranscriptCorrection(
      '/project',
      'asset-01',
      'seg-01',
      '修改后的台词',
      false
    );

    // 断言写盘
    expect(fs.writeFile).toHaveBeenCalled();
    const writeArgs = vi.mocked(fs.writeFile).mock.calls[0];
    const writtenData = JSON.parse(writeArgs[1] as string);
    expect(writtenData.transcript.correctedText).toBe('修改后的台词');
    expect(writtenData.transcript.effectiveText).toBe('修改后的台词');
    expect(writtenData.transcript.correctionStatus).toBe('edited');
    expect(writtenData.updatedAt).not.toBe('');

    // 断言 project 关联更新
    expect(writeStoredSourceAsset).toHaveBeenCalled();
    expect(mockDoc.sourceAsset.segments[0].transcriptCorrectionPath).toContain('segment_transcript_correction.json');
    expect(workbench).toEqual({ workbenchSnap: true });
  });

  it('marks correction status as confirmed when markConfirmed is true', async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('File not found')); // get correction
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ plainText: 'ASR台词' })); // get asr

    const { readStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
    vi.mocked(readStoredSourceAsset).mockResolvedValueOnce({
      sourceAsset: {
        id: 'asset-01',
        segments: [{ id: 'seg-01' }]
      }
    } as any);

    await service.updateSegmentTranscriptCorrection(
      '/project',
      'asset-01',
      'seg-01',
      '已确认台词',
      true
    );

    const writeArgs = vi.mocked(fs.writeFile).mock.calls[0];
    const writtenData = JSON.parse(writeArgs[1] as string);
    expect(writtenData.transcript.correctionStatus).toBe('confirmed');
    expect(writtenData.quality.needsHumanReview).toBe(false);
  });
});
