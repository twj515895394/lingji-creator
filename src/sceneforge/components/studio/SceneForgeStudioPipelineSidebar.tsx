import { CheckCircle2, CircleDashed } from 'lucide-react';
import type { SceneEntryPath, SceneStageId } from '../../../types/sceneforge';
import { getEntryPathStageAside } from '../../lib/scene-entry-path-ui';
import { getStageNavBlockReason, type SceneGateNavContext } from '../../lib/scene-entry-path';
import { getStageReadiness, readinessLabel } from '../../lib/scene-stage-capabilities';
import { shortenStageHint } from '../../hooks/useSceneForgeStudioLayout';
import type { ScenePipelineGroup } from '../../lib/scene-pipeline-ui';
import styles from '../../pages/SceneForgeStudio.module.css';

export interface SceneForgeStudioPipelineSidebarProps {
  pipelineGroups: ScenePipelineGroup[];
  selectedStage: SceneStageId;
  entryPath: SceneEntryPath;
  completedStages: Set<SceneStageId>;
  gateNavContext: SceneGateNavContext;
  onSelectStage: (stageId: SceneStageId) => void;
}

export function SceneForgeStudioPipelineSidebar({
  pipelineGroups,
  selectedStage,
  entryPath,
  completedStages,
  gateNavContext,
  onSelectStage,
}: SceneForgeStudioPipelineSidebarProps) {
  return (
    <aside className={styles.pipeline} aria-label="流程阶段">
      <div className={styles.panelHeader}>
        <span>流程阶段</span>
      </div>
      <div className={styles.stageList} data-testid="scene-pipeline-sidebar">
        {pipelineGroups.map((group) => (
          <div key={group.id} className={styles.pipelineGroup}>
            <div className={styles.pipelineGroupLabel}>{group.label}</div>
            {group.stages.map(({ definition, status }) => {
              const readiness = getStageReadiness(definition.id);
              const blockReason = getStageNavBlockReason(
                definition.id,
                completedStages,
                entryPath,
                gateNavContext,
              );
              const entryAside = getEntryPathStageAside(definition.id, entryPath);
              const isSkippedOptional =
                entryPath === 'topic_gate' && definition.id === 'source_intake' && !blockReason;
              const isRecommendedStart =
                entryPath === 'source_intake' && definition.id === 'source_intake' && !blockReason;
              const rowClass = [
                styles.stageRow,
                selectedStage === definition.id ? styles.stageRowActive : '',
                blockReason ? styles.stageRowBlocked : '',
                isSkippedOptional ? styles.stageRowOptional : '',
                isRecommendedStart ? styles.stageRowRecommended : '',
              ]
                .filter(Boolean)
                .join(' ');

              const inlineHint = blockReason
                ? shortenStageHint(blockReason)
                : entryAside
                  ? entryAside
                  : null;

              const title = blockReason
                ? `${definition.titleZh} · ${blockReason}`
                : entryAside
                  ? `${definition.titleZh}（${entryAside}）`
                  : definition.displayName;

              return (
                <div key={definition.id} className={styles.stageGroup}>
                  <button
                    type="button"
                    className={rowClass}
                    onClick={() => onSelectStage(definition.id)}
                    title={title}
                  >
                    <span className={styles.stageRowMain}>
                      <span className={styles.stageRowTitle}>{definition.titleZh}</span>
                      {inlineHint ? (
                        <span
                          className={styles.stageRowHintInline}
                          data-testid={blockReason ? 'scene-stage-block-hint' : 'scene-stage-entry-aside'}
                        >
                          {inlineHint}
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.stageRowMeta}>
                      <span className={styles.stageBadge}>{readinessLabel(readiness)}</span>
                      {status === 'approved' || status === 'waiting_approval' ? (
                        <CheckCircle2 className={styles.stageStatusDone} size={14} aria-hidden />
                      ) : (
                        <CircleDashed className={styles.stageStatusPending} size={14} aria-hidden />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}