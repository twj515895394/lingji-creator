import { Button, Tooltip, TooltipContent, TooltipTrigger } from '../../../ui';
import type { SeedancePrompt } from '../types';
import type { SeedanceDisplayItem } from '../lib/remix-workspace-view-model';
import { SeedancePromptPreview } from './SeedancePromptPreview';
import panelStyles from './RemixWorkspacePanels.module.css';

interface SeedanceStepPanelProps {
  statusLabel: string;
  canGenerateSeedance: boolean;
  blockedReason: string | null;
  activeAction: string | null;
  items: SeedanceDisplayItem[];
  selectedPrompt: SeedancePrompt | null;
  selectedPromptId: string | null;
  copiedPromptId: string | null;
  onGenerate: () => void;
  onSelectPrompt: (promptId: string) => void;
  onCopyMarkdownPrompt: (promptId: string) => void;
  onCopyPlainPrompt: (promptId: string) => void;
}

export function SeedanceStepPanel({
  statusLabel,
  canGenerateSeedance,
  blockedReason,
  activeAction,
  items,
  selectedPrompt,
  selectedPromptId,
  copiedPromptId,
  onGenerate,
  onSelectPrompt,
  onCopyMarkdownPrompt,
  onCopyPlainPrompt,
}: SeedanceStepPanelProps) {
  const button = (
    <Button
      variant="accent"
      disabled={!canGenerateSeedance || Boolean(activeAction)}
      onClick={onGenerate}
    >
      {activeAction === 'seedance-prompts' ? '生成中…' : '生成 Seedance Prompt'}
    </Button>
  );

  return (
    <section className={panelStyles.panelCard} data-testid="remix-creation-step-seedance-prompts">
      <div className={panelStyles.panelHeaderRow}>
        <div className={panelStyles.panelTitleBlock}>
          <h2 className={panelStyles.panelTitle}>Seedance 2.0 视频提示词</h2>
          <p className={panelStyles.panelDescription}>
            这里展示结构化字段、音频计划和最终可复制的 Markdown Prompt。
          </p>
        </div>
        <div className={panelStyles.chip}>{statusLabel}</div>
      </div>
      <div className={panelStyles.copyRow}>
        {canGenerateSeedance ? (
          button
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{button}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {blockedReason ?? '请先完成全部必需关键帧验收。'}
            </TooltipContent>
          </Tooltip>
        )}
        {!canGenerateSeedance && blockedReason ? (
          <span className={panelStyles.copyFeedback}>{blockedReason}</span>
        ) : null}
      </div>
      <SeedancePromptPreview
        items={items}
        selectedPrompt={selectedPrompt}
        selectedPromptId={selectedPromptId}
        copiedPromptId={copiedPromptId}
        onSelectPrompt={onSelectPrompt}
        onCopyMarkdownPrompt={onCopyMarkdownPrompt}
        onCopyPlainPrompt={onCopyPlainPrompt}
      />
    </section>
  );
}
