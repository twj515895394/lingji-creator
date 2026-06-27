import { describe, expect, it } from 'vitest';
import {
  buildAnnotationPrefillFromUnderstanding,
} from '../electron/sceneforge/remix/remix-understanding-workbench';
import type { SourceAsset } from '../src/sceneforge/remix/types';

const asset: SourceAsset = {
  id: 'source-001',
  title: '测试素材',
  status: 'ready_for_review',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
  sourceVideoPath: 'source.mp4',
  sourceManifestPath: 'manifest.json',
  transcriptPath: null,
  srtPath: null,
  videoMetadata: {
    durationMs: 10000,
    width: 1920,
    height: 1080,
    fps: 25,
    audioChannels: 2,
    hasAudio: true,
  },
  sourceOverviewMarkdownPath: null,
  sourceOverviewJsonPath: null,
  segmentAnalysisMarkdownPath: null,
  segmentAnalysisJsonPath: null,
  segments: [],
  variantCount: 0,
  tags: [],
  annotationNote: null,
  lastAnnotatedAt: null,
  annotatedBy: null,
  annotationSource: null,
};

describe('SceneForge Remix understanding workbench', () => {
  it('builds annotation prefill from segment understanding cards', () => {
    const prefill = buildAnnotationPrefillFromUnderstanding(asset, [
      {
        segmentId: 'segment-001',
        segmentIndex: 1,
        title: '片段 01',
        timeRangeLabel: '00:00 - 00:10',
        thumbnailPath: null,
        transcriptSummary: '对白摘要',
        mainAction: '缓慢抬头',
        shotSummary: '中近景 / 固定镜头',
        plotFunction: '推进情绪',
        speechSummary: '对白摘要',
        positivePrompt: '固定镜头，缓慢抬头。',
        keepElements: ['压迫节奏'],
        replaceableElements: ['角色身份'],
        confidence: 0.9,
        understandingPath: 'segment-001.json',
        isPlaceholder: false,
      },
    ]);

    expect(prefill?.suggestedTags).toEqual(['压迫节奏', '角色身份']);
    expect(prefill?.suggestedNote).toContain('【AI 预填，请按真实观感修正】');
    expect(prefill?.suggestedNote).toContain('片段 01');
  });

  it('does not overwrite saved annotation content', () => {
    const savedAsset = {
      ...asset,
      tags: ['manual-tag'],
      annotationNote: '人工备注',
      lastAnnotatedAt: '2026-06-27T01:00:00.000Z',
    };
    const prefill = buildAnnotationPrefillFromUnderstanding(savedAsset, []);
    expect(prefill).toBeNull();
  });
});
