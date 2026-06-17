import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, FileText, Film, Image } from 'lucide-react';
import type { SceneApprovalPolicy, SceneArtifactCopyBlock, SceneArtifactDisplayModel, SceneStageId } from '../../types/sceneforge';
import type { SceneArtifact, SceneProjectState, SceneValidationResult } from '../../lib/electron-api';
import { ArtifactCopyPanel, type SceneCopyFeedback } from '../components/artifacts/ArtifactCopyPanel';
import { StageRunPanel } from '../components/stage-run/StageRunPanel';
import { copyPlainTextToClipboard } from '../lib/scene-copy';
import styles from './SceneForgeStudio.module.css';

const coreStages = [
  {
    id: 'design',
    title: '设定图提示词',
    subtitle: 'Design Prompts',
    description: '角色、场景、道具与总参考图提示词',
    icon: Image,
    expectedCoreCount: 5,
  },
  {
    id: 'storyboard',
    title: '故事板提示词',
    subtitle: 'Storyboard Prompts',
    description: '故事板、控制板与风格板提示词',
    icon: FileText,
    expectedCoreCount: 4,
  },
  {
    id: 'video_prompts',
    title: '视频提示词包',
    subtitle: 'Video Prompt Packs',
    description: '可交付到视频模型的分段提示词包',
    icon: Film,
    expectedCoreCount: 2,
  },
] as const;

const policyOptions: Array<{ value: SceneApprovalPolicy; label: string; description: string }> = [
  { value: 'required', label: 'Required', description: '必审' },
  { value: 'optional', label: 'Optional', description: '可选审批' },
  { value: 'auto_if_valid', label: 'Auto if valid', description: '校验通过自动推进' },
  { value: 'skip', label: 'Skip', description: '跳过审批' },
];

const inspectorTabs = ['Preview', 'Structure', 'Trace', 'Raw', 'Copy'] as const;
const riskyPolicies: SceneApprovalPolicy[] = ['auto_if_valid', 'skip'];

const STAGE_DONE_STATUSES = new Set(['validated', 'waiting_approval', 'approved', 'completed']);

function isCoreFinalArtifact(artifact: SceneArtifact): boolean {
  return (
    artifact.kind === 'final' &&
    artifact.coreAsset &&
    (artifact.stage === 'design' || artifact.stage === 'storyboard' || artifact.stage === 'video_prompts')
  );
}

function coreFinalArtifactsForStage(artifacts: SceneArtifact[], stage: SceneStageId): SceneArtifact[] {
  return artifacts.filter((a) => a.stage === stage && isCoreFinalArtifact(a));
}

function preferredCoreArtifactId(artifacts: SceneArtifact[], stage: SceneStageId): string | null {
  const cores = coreFinalArtifactsForStage(artifacts, stage);
  if (cores.length === 0) return null;
  const pack =
    cores.find((a) => a.id.endsWith('.design_prompts')) ??
    cores.find((a) => a.id.endsWith('.storyboard_prompt_pack')) ??
    cores.find((a) => a.id.endsWith('.video_prompt_pack_cn')) ??
    cores[0];
  return pack.id;
}

interface SceneForgeStudioProps {
  projectDir?: string | null;
}

export function SceneForgeStudio({ projectDir = null }: SceneForgeStudioProps) {
  const [selectedStage, setSelectedStage] = useState<SceneStageId>('design');
  const [selectedTab, setSelectedTab] = useState<(typeof inspectorTabs)[number]>('Preview');
  const [projectState, setProjectState] = useState<SceneProjectState | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string>('');
  const [displayModel, setDisplayModel] = useState<SceneArtifactDisplayModel | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<SceneCopyFeedback>(null);
  const [validation, setValidation] = useState<SceneValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedStageMeta = coreStages.find((stage) => stage.id === selectedStage) ?? coreStages[0];
  const selectedArtifact = useMemo<SceneArtifact | null>(() => {
    return projectState?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null;
  }, [projectState?.artifacts, selectedArtifactId]);
  const currentPolicy = projectState?.approvalPolicies[selectedStage] ?? 'required';
  const stageState = projectState?.state.stages[selectedStage];
  const canApprove = stageState?.status === 'waiting_approval' && validation?.status !== 'failed';

  const refreshProjectState = useCallback(async () => {
    if (!projectDir || typeof window === 'undefined' || !window.electronAPI?.sceneGetProjectState) {
      return;
    }
    try {
      setErrorMessage(null);
      setProjectState(await window.electronAPI.sceneGetProjectState(projectDir));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '读取 SceneForge 项目状态失败。');
    }
  }, [projectDir]);

  useEffect(() => {
    void refreshProjectState();
  }, [refreshProjectState]);

  useEffect(() => {
    if (!projectDir || !selectedArtifactId || typeof window === 'undefined') {
      setArtifactContent('');
      setDisplayModel(null);
      return;
    }
    void window.electronAPI.sceneReadArtifact(projectDir, selectedArtifactId)
      .then((result) => {
        setArtifactContent(result.content);
        setDisplayModel(result.displayModel);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : '读取产物失败。');
        setArtifactContent('');
        setDisplayModel(null);
      });
  }, [projectDir, selectedArtifactId]);

  const selectStage = (stageId: SceneStageId) => {
    setSelectedStage(stageId);
    setCopyFeedback(null);
    const artifacts = projectState?.artifacts ?? [];
    const nextId = preferredCoreArtifactId(artifacts, stageId);
    if (nextId) {
      setSelectedArtifactId(nextId);
      setSelectedTab('Preview');
    } else {
      setSelectedArtifactId(null);
    }
  };

  const selectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setCopyFeedback(null);
  };

  const handleCopyBlock = async (block: SceneArtifactCopyBlock) => {
    try {
      await copyPlainTextToClipboard(block.text);
      setCopyFeedback({ blockId: block.id, status: 'success' });
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback({ blockId: block.id, status: 'error' });
    }
  };

  const handleCopyRaw = async () => {
    const id = selectedArtifactId ?? 'raw';
    try {
      await copyPlainTextToClipboard(artifactContent);
      setCopyFeedback({ blockId: id, status: 'success' });
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback({ blockId: id, status: 'error' });
    }
  };

  const handlePolicyChange = async (nextPolicy: SceneApprovalPolicy) => {
    if (!projectDir || !window.electronAPI?.sceneSetApprovalPolicy) {
      return;
    }
    if (
      riskyPolicies.includes(nextPolicy) &&
      !window.confirm('核心阶段改为自动推进或跳过审批，会增加下游返工风险。确认继续吗？')
    ) {
      return;
    }
    await window.electronAPI.sceneSetApprovalPolicy(projectDir, selectedStage, nextPolicy);
    await refreshProjectState();
  };

  const handleValidate = async () => {
    if (!projectDir) return;
    const result = await window.electronAPI.sceneValidateStage(projectDir, selectedStage);
    setValidation(result);
    await refreshProjectState();
  };

  const handleApprove = async () => {
    if (!projectDir || !canApprove) return;
    await window.electronAPI.sceneApproveStage(projectDir, selectedStage);
    await refreshProjectState();
  };

  const stageArtifacts = projectState?.artifacts.filter((artifact) => artifact.stage === selectedStage) ?? [];
  const stageCoreFinals = coreFinalArtifactsForStage(projectState?.artifacts ?? [], selectedStage);

  const previewText =
    displayModel?.summary ||
    (displayModel?.copyBlocks.find((b) => b.target === 'full')?.text.slice(0, 400) ?? '') ||
    artifactContent ||
    '暂无预览内容';

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>提示词包项目 · Prompt Pack Project</p>
          <h1>SceneForge Studio</h1>
        </div>
        <div className={styles.statusPill}>
          <CircleDashed size={14} />
          已就绪
        </div>
      </section>

      <section className={styles.shell} aria-label="SceneForge Studio 工作台">
        <aside className={styles.pipeline} aria-label="流程阶段">
          <div className={styles.panelHeader}>
            <span>流程阶段</span>
          </div>
          <div className={styles.stageList}>
            {coreStages.map((stage, index) => {
              const Icon = stage.icon;
              const status = projectState?.state.stages[stage.id]?.status ?? (index === 0 ? 'ready' : 'ready');
              const finals = coreFinalArtifactsForStage(projectState?.artifacts ?? [], stage.id);
              const showFinalEntries = STAGE_DONE_STATUSES.has(status) && finals.length > 0;
              return (
                <div key={stage.id} className={styles.stageGroup}>
                  <button
                    type="button"
                    className={`${styles.stageButton} ${selectedStage === stage.id ? styles.stageButtonActive : ''}`}
                    onClick={() => selectStage(stage.id)}
                  >
                    <span className={styles.stageIcon}>
                      <Icon size={16} />
                    </span>
                    <span className={styles.stageText}>
                      <span>{stage.title}</span>
                      <em>{stage.subtitle}</em>
                      <small>{stage.description}</small>
                    </span>
                    {status === 'approved' || status === 'waiting_approval' ? (
                      <CheckCircle2 className={styles.readyIcon} size={15} />
                    ) : (
                      <CircleDashed className={styles.pendingIcon} size={15} />
                    )}
                  </button>
                  {showFinalEntries ? (
                    <ul className={styles.stageArtifactLinks} aria-label={`${stage.title} 核心产物`}>
                      {finals.map((artifact) => (
                        <li key={artifact.id}>
                          <button
                            type="button"
                            className={
                              artifact.id === selectedArtifactId
                                ? styles.stageArtifactLinkActive
                                : styles.stageArtifactLink
                            }
                            onClick={() => {
                              selectStage(stage.id);
                              selectArtifact(artifact.id);
                            }}
                          >
                            {artifact.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className={styles.workspace} aria-label="当前阶段工作区">
          <div className={styles.panelHeader}>
            <span>当前阶段工作区</span>
          </div>
          <div className={styles.workspaceBody}>
            <h2>{selectedStageMeta.title}</h2>
            <p>当前阶段通过受控服务提交、校验和审批。下游只能读取已审批的最终产物。</p>
            <div className={styles.summaryGrid}>
              <div>
                <span>当前阶段</span>
                <strong>{selectedStage}</strong>
              </div>
              <div>
                <span>审批策略</span>
                <strong>{currentPolicy}</strong>
              </div>
              <div>
                <span>核心产物</span>
                <strong>
                  {stageCoreFinals.length} / {selectedStageMeta.expectedCoreCount}
                </strong>
              </div>
            </div>

            {stageCoreFinals.length > 0 ? (
              <section className={styles.coreOverview} aria-label="核心产物概览" data-testid="scene-core-overview">
                <h3>核心产物概览</h3>
                <div className={styles.coreChipRow}>
                  {stageCoreFinals.map((artifact) => (
                    <button
                      key={artifact.id}
                      type="button"
                      className={
                        artifact.id === selectedArtifactId ? styles.coreChipActive : styles.coreChip
                      }
                      data-testid="scene-core-artifact-chip"
                      onClick={() => selectArtifact(artifact.id)}
                    >
                      {artifact.title}
                    </button>
                  ))}
                </div>
                {displayModel && selectedArtifact && selectedArtifact.stage === selectedStage ? (
                  <ul className={styles.copyBlockSummary}>
                    {displayModel.copyBlocks
                      .filter((b) => b.target !== 'full' && b.text.trim())
                      .slice(0, 6)
                      .map((block) => (
                        <li key={block.id}>
                          <span>{block.label}</span>
                          <button
                            type="button"
                            className={styles.miniCopy}
                            data-testid="scene-workspace-copy"
                            onClick={() => void handleCopyBlock(block)}
                          >
                            复制
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </section>
            ) : (
              <p className={styles.emptyCopy}>提交并校验通过后，核心 final 产物会出现在这里。</p>
            )}

            <section className={styles.policyPanel} aria-label="审批策略">
              <div>
                <h3>审批策略</h3>
                <p>Approval Policy</p>
              </div>
              <select
                value={currentPolicy}
                onChange={(event) => void handlePolicyChange(event.target.value as SceneApprovalPolicy)}
              >
                {policyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.description} · {option.label}
                  </option>
                ))}
              </select>
            </section>

            {(currentPolicy === 'auto_if_valid' || currentPolicy === 'skip') && (
              <div className={styles.warningLine}>
                <AlertTriangle size={14} />
                核心阶段正在使用高风险审批策略，请确认下游返工成本。
              </div>
            )}

            {validation?.status === 'failed' && (
              <div className={styles.errorBox}>
                Validator failed：{validation.errors[0]?.message ?? '阶段校验未通过。'}
              </div>
            )}

            <StageRunPanel
              projectDir={projectDir}
              stage={selectedStage}
              stageTitle={selectedStageMeta.title}
              onRunError={(message) => setErrorMessage(message)}
            />

            <div className={styles.actionRow}>
              <button type="button" onClick={() => void handleValidate()}>
                Validate
              </button>
              <button
                type="button"
                disabled={!canApprove}
                title={!canApprove ? '阶段必须先通过校验并进入 waiting_approval。' : undefined}
                onClick={() => void handleApprove()}
              >
                Approve &amp; Continue
              </button>
            </div>

            {errorMessage && <div className={styles.errorBox}>{errorMessage}</div>}
          </div>
        </section>

        <aside className={styles.inspector} aria-label="产物检查器">
          <div className={styles.panelHeader}>
            <span>产物检查器</span>
          </div>
          <div className={styles.inspectorBody}>
            <div className={styles.artifactList}>
              {stageArtifacts.length === 0 ? (
                <p className={styles.emptyTitle}>尚未选择产物</p>
              ) : (
                stageArtifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    className={artifact.id === selectedArtifactId ? styles.artifactButtonActive : styles.artifactButton}
                    data-testid="scene-inspector-artifact"
                    onClick={() => selectArtifact(artifact.id)}
                  >
                    {artifact.title}
                  </button>
                ))
              )}
            </div>
            <div className={styles.inspectorTabs} role="tablist" aria-label="Artifact Inspector tabs">
              {inspectorTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={selectedTab === tab ? styles.tabActive : styles.tab}
                  onClick={() => setSelectedTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {selectedArtifact ? (
              <div className={styles.artifactPreview} data-testid="scene-artifact-inspector">
                <h3>{selectedArtifact.title}</h3>
                <p>{selectedArtifact.id}</p>
                {selectedTab === 'Copy' ? (
                  <ArtifactCopyPanel
                    displayModel={displayModel}
                    rawContent={artifactContent}
                    feedback={copyFeedback}
                    onCopyBlock={handleCopyBlock}
                    onCopyRaw={handleCopyRaw}
                  />
                ) : selectedTab === 'Raw' ? (
                  <>
                    <button
                      type="button"
                      className={styles.rawCopyButton}
                      data-testid="scene-copy-raw"
                      onClick={() => void handleCopyRaw()}
                    >
                      复制全文 Markdown
                    </button>
                    {copyFeedback?.blockId === (selectedArtifactId ?? 'raw') && copyFeedback.status === 'success' ? (
                      <span className={styles.rawFeedback} data-testid="scene-copy-feedback">
                        已复制
                      </span>
                    ) : null}
                    <pre>{artifactContent}</pre>
                  </>
                ) : selectedTab === 'Trace' ? (
                  <pre>{JSON.stringify(selectedArtifact, null, 2)}</pre>
                ) : selectedTab === 'Structure' ? (
                  <pre>
                    {displayModel
                      ? JSON.stringify(displayModel.sections, null, 2)
                      : selectedArtifact.path}
                  </pre>
                ) : (
                  <pre>{previewText}</pre>
                )}
              </div>
            ) : (
              <p className={styles.emptyCopy}>核心产物生成后，会在这里查看预览、结构、追踪和原始内容。</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}