import { Button, Input, Textarea } from '../../../ui';
import type {
  RemixGenerationMode,
  RemixReferenceStrength,
  SourceAssetSummary,
} from '../types';
import {
  formatRemixDuration,
  getGenerationModeLabel,
  getReferenceStrengthLabel,
} from '../lib/remix-workspace-view-model';
import { REMIX_SOURCE_STATUS_LABELS } from '../lib/asset-library-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface VariantConfigPanelProps {
  sourceAsset: SourceAssetSummary;
  name: string;
  concept: string;
  referenceStrength: RemixReferenceStrength;
  defaultGenerationMode: RemixGenerationMode;
  onNameChange: (value: string) => void;
  onConceptChange: (value: string) => void;
  onReferenceStrengthChange: (value: RemixReferenceStrength) => void;
  onGenerationModeChange: (value: RemixGenerationMode) => void;
}

const referenceStrengthOptions: RemixReferenceStrength[] = ['light', 'medium', 'strong'];
const generationModeOptions: RemixGenerationMode[] = [
  'keyframes_only',
  'keyframes_plus_source_clip',
];

export function VariantConfigPanel({
  sourceAsset,
  name,
  concept,
  referenceStrength,
  defaultGenerationMode,
  onNameChange,
  onConceptChange,
  onReferenceStrengthChange,
  onGenerationModeChange,
}: VariantConfigPanelProps) {
  return (
    <div className={styles.splitPanel} data-testid="remix-variant-config-panel">
      <section className={styles.configCard}>
        <div className={styles.configTitle}>引用资产</div>
        <div className={styles.configBody} title={sourceAsset.title}>
          {sourceAsset.title} · {formatRemixDuration(sourceAsset.durationMs)} ·{' '}
          {sourceAsset.segmentCount} 段 / {sourceAsset.keyframeCount} 张关键帧
        </div>
        <div className={styles.inlineStats}>
          <span className={styles.inlineStat}>状态 {REMIX_SOURCE_STATUS_LABELS[sourceAsset.status]}</span>
          <span className={styles.inlineStat}>已有 {sourceAsset.variantCount} 个二创版本</span>
        </div>
      </section>

      <section className={styles.fieldStack}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldName}>二创版本名称</span>
          <Input value={name} onChange={(event) => onNameChange(event.target.value)} size="sm" />
        </label>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldName}>概念摘要</span>
          <Textarea
            value={concept}
            onChange={(event) => onConceptChange(event.target.value)}
            size="sm"
            resize="vertical"
          />
        </label>
        <div className={styles.fieldLabel}>
          <span className={styles.fieldName}>引用强度</span>
          <div className={styles.optionRow}>
            {referenceStrengthOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={[
                  styles.optionButton,
                  option === referenceStrength ? styles.optionButtonActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onReferenceStrengthChange(option)}
              >
                {getReferenceStrengthLabel(option)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.fieldLabel}>
          <span className={styles.fieldName}>默认生成模式</span>
          <div className={styles.optionRow}>
            {generationModeOptions.map((option) => (
              <Button
                key={option}
                variant={option === defaultGenerationMode ? 'accent' : 'outline'}
                size="sm"
                onClick={() => onGenerationModeChange(option)}
              >
                {getGenerationModeLabel(option)}
              </Button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
