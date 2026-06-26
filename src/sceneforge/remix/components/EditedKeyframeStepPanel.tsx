import { useState, type DragEvent } from 'react';
import { Button } from '../../../ui';
import type { EditedKeyframe, KeyframeEditPrompt } from '../types';
import { getKeyframeRoleLabel } from '../lib/remix-workspace-view-model';
import { EditedKeyframeGallery } from './EditedKeyframeGallery';
import panelStyles from './RemixWorkspacePanels.module.css';

interface SegmentReviewRow {
  id: string;
  title: string;
  progress: string;
}

interface EditedKeyframeStepPanelProps {
  statusLabel: string;
  promptOptions: KeyframeEditPrompt[];
  selectedPromptId: string | null;
  selectedTargetPrompt: KeyframeEditPrompt | null;
  selectedEditedKeyframe: EditedKeyframe | null;
  selectedEditedKeyframeId: string | null;
  editedKeyframes: EditedKeyframe[];
  approvedEditedKeyframeCount: number;
  requiredEditedKeyframeCount: number;
  segmentReviewRows: SegmentReviewRow[];
  activeAction: string | null;
  onSelectPrompt: (promptId: string) => void;
  onSelectEditedKeyframe: (editedKeyframeId: string | null) => void;
  onUploadFromPath: (filePath: string) => Promise<void>;
  onApprove: () => void;
  onNeedsRevision: () => void;
  onReject: () => void;
  projectDir?: string | null;
}

export function EditedKeyframeStepPanel({
  statusLabel,
  promptOptions,
  selectedPromptId,
  selectedTargetPrompt,
  selectedEditedKeyframe,
  selectedEditedKeyframeId,
  editedKeyframes,
  approvedEditedKeyframeCount,
  requiredEditedKeyframeCount,
  segmentReviewRows,
  activeAction,
  onSelectPrompt,
  onSelectEditedKeyframe,
  onUploadFromPath,
  onApprove,
  onNeedsRevision,
  onReject,
  projectDir,
}: EditedKeyframeStepPanelProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  async function handlePickFile() {
    const filePath = await window.electronAPI?.selectMediaFile?.('image');
    if (filePath) {
      await onUploadFromPath(filePath);
    }
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    const filePath = window.electronAPI?.getPathForFile?.(file);
    if (filePath) {
      await onUploadFromPath(filePath);
    }
  }

  return (
    <section className={panelStyles.panelCard} data-testid="remix-creation-step-edited-keyframes">
      <div className={panelStyles.panelHeaderRow}>
        <div className={panelStyles.panelTitleBlock}>
          <h2 className={panelStyles.panelTitle}>改后关键帧验收</h2>
          <p className={panelStyles.panelDescription}>
            当前页只盯状态和质量检查，让用户快速定位哪张还要返修。
          </p>
        </div>
        <div className={panelStyles.chip}>{statusLabel}</div>
      </div>
      <div className={panelStyles.inlineStats}>
        <span className={panelStyles.inlineStat}>已通过 {approvedEditedKeyframeCount} / {requiredEditedKeyframeCount}</span>
        {segmentReviewRows.map((item) => (
          <span key={item.id} className={panelStyles.inlineStat}>
            {item.title} {item.progress}
          </span>
        ))}
      </div>
      <div className={panelStyles.copyRow}>
        {promptOptions.map((prompt) => (
          <Button
            key={prompt.id}
            variant={selectedPromptId === prompt.id ? 'accent' : 'outline'}
            size="sm"
            onClick={() => onSelectPrompt(prompt.id)}
          >
            {prompt.segmentId} · {getKeyframeRoleLabel(prompt.frameRole)}
          </Button>
        ))}
      </div>
      <div
        className={panelStyles.configCard}
        data-testid="remix-edited-keyframe-dropzone"
        data-drag-active={isDragActive ? 'true' : 'false'}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          void handleDrop(event);
        }}
      >
        <div className={panelStyles.configTitle}>上传改后关键帧</div>
        <div className={panelStyles.configBody}>
          {isDragActive ? '松开鼠标即可登记当前图片。' : '支持点击选择，也支持直接把本地图片拖到这里。'}
        </div>
        <div className={panelStyles.copyRow}>
          <Button
            variant="accent"
            disabled={!selectedTargetPrompt || Boolean(activeAction)}
            onClick={() => {
              void handlePickFile();
            }}
          >
            {activeAction === 'upload-edited-keyframe' ? '登记中…' : '选择改后关键帧'}
          </Button>
          {selectedTargetPrompt ? (
            <span className={panelStyles.copyFeedback}>
              当前目标：{selectedTargetPrompt.segmentId} · {getKeyframeRoleLabel(selectedTargetPrompt.frameRole)}
            </span>
          ) : null}
        </div>
      </div>
      <EditedKeyframeGallery
        items={editedKeyframes}
        selectedEditedKeyframeId={selectedEditedKeyframeId}
        onSelectEditedKeyframe={onSelectEditedKeyframe}
        projectDir={projectDir}
      />
      <div className={panelStyles.copyRow}>
        <Button
          variant="accent"
          size="sm"
          disabled={!selectedEditedKeyframe || Boolean(activeAction)}
          onClick={onApprove}
        >
          通过
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedEditedKeyframe || Boolean(activeAction)}
          onClick={onNeedsRevision}
        >
          标记返修
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedEditedKeyframe || Boolean(activeAction)}
          onClick={onReject}
        >
          拒绝
        </Button>
      </div>
    </section>
  );
}
