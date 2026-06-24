import type { RemixCreationWorkspaceSnapshot } from '../types';
import {
  formatRemixDuration,
  getGenerationModeLabel,
  getReferenceStrengthLabel,
} from '../lib/remix-workspace-view-model';
import { getVariantStageLabel } from '../lib/asset-library-view-model';
import { SourceAssetThumbnail } from './SourceAssetThumbnail';
import panelStyles from './RemixWorkspacePanels.module.css';
import reviewStyles from './RemixSegmentReview.module.css';

interface CreationReferencePreviewProps {
  snapshot: RemixCreationWorkspaceSnapshot;
}

export function CreationReferencePreview({ snapshot }: CreationReferencePreviewProps) {
  const asset = snapshot.sourceAssetDetails;

  return (
    <article className={panelStyles.previewSurface} data-testid="remix-creation-reference-preview">
      <div className={panelStyles.previewTopline}>
        <div>
          <div className={panelStyles.previewTitle}>引用资产预览</div>
          <div className={panelStyles.previewSubtitle}>
            {snapshot.sourceAsset.title} · {formatRemixDuration(snapshot.sourceAsset.durationMs)}
          </div>
        </div>
        <div className={panelStyles.chip}>
          {getVariantStageLabel(snapshot.variant.currentStage)}
        </div>
      </div>

      {asset ? (
        <div className={reviewStyles.creationThumbFrame}>
          <SourceAssetThumbnail asset={asset} />
        </div>
      ) : (
        <div className={reviewStyles.previewFallback}>
          <div className={reviewStyles.previewFallbackTitle}>暂无画面预览</div>
          <div className={reviewStyles.previewFallbackBody}>
            当前仅加载了资产摘要，无法展示代表帧。
          </div>
        </div>
      )}

      <div className={panelStyles.surfaceCaption}>
        <span className={panelStyles.chip}>
          {getReferenceStrengthLabel(snapshot.variant.referenceStrength)}
        </span>
        <span className={panelStyles.chip}>
          {getGenerationModeLabel(snapshot.variant.defaultGenerationMode)}
        </span>
        <span className={panelStyles.chip}>{snapshot.sourceAsset.segmentCount} 段</span>
        <span className={panelStyles.chip}>改后帧 {snapshot.editedKeyframes.length}</span>
        <span className={panelStyles.chip}>视频提示词 {snapshot.seedancePrompts.length}</span>
      </div>
      <div className={reviewStyles.previewStatusBar}>
        <span>二创版本：{snapshot.variant.name}</span>
      </div>
    </article>
  );
}
