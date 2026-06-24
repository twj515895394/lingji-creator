import { Button } from '../../../ui';
import type { SeedancePrompt } from '../types';
import type { SeedanceDisplayItem } from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface SeedancePromptPreviewProps {
  items: SeedanceDisplayItem[];
  selectedPrompt: SeedancePrompt | null;
  selectedPromptId: string | null;
  copiedPromptId: string | null;
  onSelectPrompt: (promptId: string) => void;
  onCopyMarkdownPrompt: (promptId: string) => void;
  onCopyPlainPrompt: (promptId: string) => void;
}

const structuredFieldLabels: Record<keyof SeedancePrompt['structuredFields'], string> = {
  visual: '画面',
  motion: '动作',
  camera: '镜头',
  performance: '表演',
  dialogue: '对白',
  voice: '人声',
  soundEffects: '音效',
  ambientAudio: '环境声',
  negative: '负向',
};

export function SeedancePromptPreview({
  items,
  selectedPrompt,
  selectedPromptId,
  copiedPromptId,
  onSelectPrompt,
  onCopyMarkdownPrompt,
  onCopyPlainPrompt,
}: SeedancePromptPreviewProps) {
  return (
    <div className={styles.stack} data-testid="remix-seedance-prompt-preview">
      <div className={styles.seedanceList}>
        {items.map((item) => (
          <article
            key={item.id}
            className={[
              styles.seedanceCard,
              item.id === selectedPromptId ? styles.selectionCardActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <button
              type="button"
              className={styles.selectionButtonReset}
              onClick={() => onSelectPrompt(item.id)}
            >
              <div className={styles.seedanceTitle}>{item.title}</div>
              <div className={styles.panelMeta}>{item.generationModeLabel}</div>
              <div className={styles.seedanceText}>{item.summary}</div>
            </button>
          </article>
        ))}
      </div>

      {selectedPrompt ? (
        <section className={styles.structuredGrid}>
          {(
            Object.entries(selectedPrompt.structuredFields) as Array<
              [keyof SeedancePrompt['structuredFields'], string]
            >
          ).map(([key, value]) => (
            <article key={key} className={styles.structuredField}>
              <div className={styles.structuredLabel}>{structuredFieldLabels[key]}</div>
              <div className={styles.structuredValue}>{value}</div>
            </article>
          ))}
        </section>
      ) : null}

      {selectedPrompt?.audioPlan ? (
        <section className={styles.panelCardDense}>
          <div className={styles.panelTitle}>音频计划</div>
          <div className={styles.qualityList}>
            {selectedPrompt.audioPlan.globalAudioRules.map((rule) => (
              <div key={rule} className={styles.qualityItem}>
                <span>全局规则</span>
                <strong>{rule}</strong>
              </div>
            ))}
            {selectedPrompt.audioPlan.voiceProfiles.map((profile) => (
              <div key={profile.id} className={styles.qualityItem}>
                <span>{profile.id}</span>
                <strong>{profile.description}</strong>
              </div>
            ))}
            {selectedPrompt.audioPlan.segmentAudioPlan.map((plan) => (
              <div key={plan.segmentId} className={styles.qualityItem}>
                <span>{plan.segmentId}</span>
                <strong>{plan.dialogue}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.copyRow}>
        <Button
          variant="accent"
          size="sm"
          disabled={!selectedPrompt}
          onClick={() => selectedPrompt && onCopyMarkdownPrompt(selectedPrompt.id)}
        >
          复制 Markdown
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedPrompt}
          onClick={() => selectedPrompt && onCopyPlainPrompt(selectedPrompt.id)}
        >
          复制纯文本
        </Button>
        {selectedPrompt && copiedPromptId === selectedPrompt.id ? (
          <span className={styles.copyFeedback}>已复制</span>
        ) : null}
      </div>
    </div>
  );
}
