import { describe, expect, it } from 'vitest';
import { MOCK_SOURCE_ASSETS } from '../src/sceneforge/remix/mock/mock-data';
import {
  getSourceAssetMarkingSummaryLine,
  getSourceAssetNextStep,
  getVariantGateReason,
} from '../src/sceneforge/remix/lib/asset-library-view-model';

describe('SceneForge Remix asset library view-model (#04)', () => {
  it('已入库资产展示二创下一步指引', () => {
    const asset = MOCK_SOURCE_ASSETS.find((item) => item.id === 'source-library-001')!;
    expect(getSourceAssetNextStep(asset)).toContain('二创');
    expect(getVariantGateReason(asset)).toBeNull();
  });

  it('处理中资产指向资产标记与保存入库', () => {
    const asset = MOCK_SOURCE_ASSETS.find((item) => item.id === 'source-processing-001')!;
    expect(getSourceAssetNextStep(asset)).toContain('资产标记');
    expect(getVariantGateReason(asset)).toContain('资产标记');
  });

  it('资产标记摘要反映标签与备注状态', () => {
    const withTags = MOCK_SOURCE_ASSETS.find((item) => item.id === 'source-library-001')!;
    expect(getSourceAssetMarkingSummaryLine(withTags)).toContain('已保存');
    expect(getSourceAssetMarkingSummaryLine(withTags)).toContain('资产备注');

    const noTags = { ...withTags, tags: [], annotationNote: null };
    expect(getSourceAssetMarkingSummaryLine(noTags)).toContain('尚未保存资产标签');
  });
});