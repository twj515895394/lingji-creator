import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixUnderstandingReportExportService } from '../electron/sceneforge/remix/remix-understanding-report-export-service';
import { getRemixOriginalUnderstandingJsonPath, getRemixSegmentUnderstandingJsonPath } from '../electron/sceneforge/remix/remix-artifact-paths';

describe('RemixUnderstandingReportExportService', () => {
  let projectDir: string;
  const sourceAssetId = 'asset-999';

  beforeEach(async () => {
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-export-report-'));
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  it('exports structured Markdown report to project root folder successfully', async () => {
    // 1. 模拟写入 project.json (StoredSourceAssetDocument)
    const projectDoc = {
      sourceAsset: {
        id: sourceAssetId,
        title: '测试视频',
        status: 'ready_for_review',
        segments: [
          {
            id: 'seg-01',
            index: 0,
            title: '片段 1',
            timeRange: { startMs: 0, endMs: 3000 },
            keyframes: [],
            segmentTranscriptJsonPath: 'transcripts/seg-01.json',
            transcriptCorrectionPath: 'corrections/seg-01.json',
            analysisJsonPath: 'analysis/seg-01.json',
          },
        ],
      },
    };
    const manifestPath = path.join(projectDir, `sceneforge/remix/source-assets/${sourceAssetId}/source_manifest.json`);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(projectDoc), 'utf8');

    // 2. 模拟写入 ASR (transcripts/seg-01.json)
    await fs.mkdir(path.join(projectDir, 'transcripts'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'transcripts/seg-01.json'),
      JSON.stringify({
        plainText: '原始自动识别台词',
        source: 'segment_audio_sensevoice_gguf',
        engine: 'funasr_sensevoice_gguf',
        timestampLevel: 'segment_range',
        quality: {
          warnings: ['SenseVoice 当前为片段级时间范围，不提供精准 SRT 时间戳'],
        },
      }),
      'utf8',
    );

    // 3. 模拟写入台词修正 (corrections/seg-01.json)
    await fs.mkdir(path.join(projectDir, 'corrections'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'corrections/seg-01.json'),
      JSON.stringify({ transcript: { effectiveText: '人工校对后的台词' } }),
      'utf8',
    );

    // 4. 模拟写入片段理解 (analysis/seg-01.json)
    await fs.mkdir(path.join(projectDir, 'analysis'), { recursive: true });
    const segDoc = {
      schema: 'sceneforge-remix-segment-understanding',
      version: 2,
      segmentId: 'seg-01',
      visual: {
        environmentDetails: '昏暗地下室',
        mainAction: '反派坐在椅上狂笑',
      },
      camera: {
        shotSize: '特写',
        movement: '推镜头',
      },
      audio: {
        speechSummary: '反派的大笑',
      },
      story: {
        plotFunction: '展现反派危机',
      },
      remix: {
        keepElements: ['大笑镜头'],
        replaceableElements: ['背景杂音'],
      },
      videoPrompt: {
        fullChinesePrompt: '特写，逆光',
      },
    };
    await fs.writeFile(
      path.join(projectDir, 'analysis/seg-01.json'),
      JSON.stringify(segDoc),
      'utf8',
    );

    // 5. 模拟写入全片 rollup 理解 (original_understanding.json)
    const rollupRel = getRemixOriginalUnderstandingJsonPath(sourceAssetId);
    const rollupAbs = path.join(projectDir, rollupRel);
    await fs.mkdir(path.dirname(rollupAbs), { recursive: true });

    const rollupDoc = {
      schema: 'sceneforge-remix-original-understanding',
      version: 2,
      sourceAssetId,
      title: '测试视频',
      generatedAt: '2026-06-28T12:00:00.000Z',
      overall: {
        logline: '这是一个反派密谋的故事',
        storySummaryShort: '短剧情总结',
        storyContent: '完整故事剧情叙述',
        eventChain: ['反派狂笑', '计划启动'],
        characterMap: [
          { nameOrRole: '神秘人', description: '最终Boss', relation: '雇佣了杀手' },
        ],
        emotionCurve: '平静 -> 疯狂',
      },
      remixStrategy: {
        keepMust: ['反派狂笑的几帧'],
        canReplace: ['地下室静止空镜'],
        rewriteDirections: [
          {
            title: '喜剧恶搞剪辑',
            idea: '给反派加上滑稽笑声',
            suitableStyle: '鬼畜搞笑风格',
            requiredSegments: ['seg-01'],
            risk: '削弱了原有悬疑感',
          },
        ],
      },
      quality: {
        segmentCount: 1,
        understoodSegmentCount: 1,
        failedSegmentCount: 0,
      },
    };
    await fs.writeFile(rollupAbs, JSON.stringify(rollupDoc), 'utf8');

    // 6. 执行导出
    const service = new RemixUnderstandingReportExportService();
    const result = await service.exportReport(projectDir, sourceAssetId);

    const reportPath = path.join(projectDir, 'original_understanding_v2.md');
    expect(result.reportPath).toBe(reportPath);

    // 检查导出的 Markdown 文件内容
    const mdContent = await fs.readFile(reportPath, 'utf8');
    
    expect(mdContent).toContain('# 原片理解报告');
    expect(mdContent).toContain('## 基础信息');
    expect(mdContent).toContain('测试视频');
    expect(mdContent).toContain('台词校对状态：部分/全部已校对');
    expect(mdContent).toContain('## 一句话概括');
    expect(mdContent).toContain('这是一个反派密谋的故事');
    expect(mdContent).toContain('## 人物与关系');
    expect(mdContent).toContain('**神秘人**：最终Boss');
    expect(mdContent).toContain('## 二创方向');
    expect(mdContent).toContain('鬼畜搞笑风格');
    expect(mdContent).toContain('## 片段明细');
    expect(mdContent).toContain('### 01 · 00:00 - 00:03');
    expect(mdContent).toContain('反派坐在椅上狂笑');
    expect(mdContent).toContain('台词来源：segment_audio_sensevoice_gguf');
    expect(mdContent).toContain('ASR 引擎：funasr_sensevoice_gguf');
    expect(mdContent).toContain('时间粒度：segment_range（片段范围，不是精准字幕）');
    expect(mdContent).toContain('台词原文：原始自动识别台词');
    expect(mdContent).toContain('台词修正版：人工校对后的台词');
    expect(mdContent).toContain('台词告警：SenseVoice 当前为片段级时间范围，不提供精准 SRT 时间戳');
    expect(mdContent).toContain('特写，逆光');
    expect(mdContent).toContain('昏暗地下室');
  });
});
