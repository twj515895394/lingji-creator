import { describe, expect, it } from 'vitest';
import {
  isPlaceholderUnderstandingOverview,
  isPlaceholderSegmentAnalysisItem,
  REMIX_UNDERSTANDING_ROLLUP_KIND,
} from '../electron/sceneforge/remix/remix-understanding-gate';

describe('SceneForge Remix understanding gate helpers', () => {
  it('detects placeholder overview payloads', () => {
    expect(isPlaceholderUnderstandingOverview({ artifactKind: 'segment_boundary_summary' })).toBe(true);
    expect(isPlaceholderUnderstandingOverview({
      artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
      segmentRefs: [],
    })).toBe(false);
  });

  it('detects placeholder segment payloads', () => {
    expect(isPlaceholderSegmentAnalysisItem({ segmentId: 'segment-001', keyframeCount: 2 })).toBe(true);
    expect(isPlaceholderSegmentAnalysisItem({
      segmentId: 'segment-001',
      visual: { mainAction: '抬头' },
      camera: { shotSize: '中近景' },
      videoPrompt: '固定镜头',
    })).toBe(false);
  });
});
