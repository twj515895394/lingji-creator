import { app } from 'electron';
import path from 'node:path';
import type { SceneApprovalPolicy, SceneEntryPath, SceneStageId } from '../../src/types/sceneforge';
import { generateText } from '../../src/lib/llm';
import { addAppLog } from '../app-logger';
import { listSceneAssets, type SceneAssetRegistryEntry } from './assets/scene-asset-library';
import {
  listSceneArtifacts,
  readSceneArtifact,
  writeSceneArtifact,
  type SceneArtifact,
} from './artifacts/scene-artifact-store';
import {
  resolveSceneApprovalPolicy,
  setSceneApprovalPolicy,
} from './pipeline/scene-approval-policy';
import {
  listHandoffCapableStages,
  writeSceneStageHandoff,
} from './pipeline/scene-handoff-writer';
import {
  buildSceneStageContext,
  type BuildSceneStageContextOptions,
  type SceneStageContext,
  type SceneStageContextInput,
  type SceneStageContextOptions,
} from './pipeline/scene-context-builder';
import { createDefaultSceneStageRunner } from './pipeline/scene-stage-runner-factory';
import {
  type SceneStageRunnerResult,
  type SceneStageRunProgress,
  type SceneStageRunnerType,
} from './pipeline/scene-stage-runner';
import {
  approveSceneStage,
  completeSceneForgeProject,
  markSceneStageDraftSubmitted,
  setSceneCurrentStage,
  markSceneStageValidated,
  markSceneStageValidationFailed,
  readSceneState,
  requestSceneStageRevision,
  SceneProjectCompletionError,
  type SceneState,
} from './pipeline/scene-state-machine';
import { auditPipelineCompletionForProject } from './pipeline/scene-pipeline-completion';
import {
  createSceneForgeProject,
  getEffectiveSceneSelectedAssetIds,
  readSceneProjectEntryPath,
  readSceneProjectStyleSelection,
  syncSceneProjectMetaFromState,
  updateSceneProjectStyleSelection,
  type SceneProjectStyleSelection,
} from './project/scene-project-file';
import { normalizeCharacterPromptsMarkdown } from './validators/character-prompt-section-headings';
import { normalizeDesignPromptsMarkdown } from './validators/design-prompt-section-headings';
import { normalizeReferenceNotesMarkdown } from './validators/normalize-reference-notes';
import { normalizePerformanceDirectionMarkdown } from './validators/performance-direction-section-headings';
import { normalizeScriptDraftMarkdown } from './validators/script-draft-section-headings';
import { validateSceneStage, type SceneValidationResult } from './validators/scene-validator';
import { loadFullHeadlessAISettings } from '../pipeline/headless-settings';
import {
  createTopicGateDirectLlmAnalyzer,
  type SceneTopicGateAnalysisResult,
} from './topic-gate-analysis';
import {
  createTopicIntentDirectLlmChecker,
  type SceneTopicIntentCheckResult,
} from './topic-intent-check';
import {
  formatMissingRequiredInputsMessage,
  hasBlockingMissingRequiredInputs,
  listMissingRequiredStageInputs,
  normalizeRequiredInputsForBlocking,
} from '../../src/sceneforge/lib/scene-required-context';

export class SceneRunBlockedError extends Error {
  code = 'SCENE_RUN_BLOCKED_MISSING_REQUIRED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'SceneRunBlockedError';
  }
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function normalizePreview(text: string, maxLength = 180): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  return `${collapsed.slice(0, maxLength)}…`;
}

function summarizeStageContextInput(input: SceneStageContextInput, warnings: string[]) {
  const content = input.content ?? '';
  const chineseChars = countMatches(content, /[\u4e00-\u9fff]/g);
  const asciiLetters = countMatches(content, /[A-Za-z]/g);
  const flags: string[] = [];

  if (asciiLetters >= 200 && chineseChars < asciiLetters * 0.15) {
    flags.push('english_dominant');
  }
  if (content.length >= 8000) {
    flags.push('long_context');
  }
  if (input.delivery === 'full' || input.source === 'artifact') {
    flags.push('full_artifact_context');
  }
  if (
    input.policyInputId &&
    warnings.some((warning) => warning.startsWith(`handoff_missing_fallback:${input.policyInputId}:`))
  ) {
    flags.push('handoff_missing_fallback');
  }
  if (
    input.policyInputId &&
    warnings.some((warning) => warning.startsWith(`handoff_slice_missing_fallback:${input.policyInputId}:`))
  ) {
    flags.push('handoff_slice_missing_fallback');
  }

  return {
    artifactId: input.artifactId,
    title: input.title,
    fromStage: input.fromStage ?? input.stage,
    artifactKey: input.artifactKey,
    delivery: input.delivery,
    source: input.source,
    chars: content.length,
    chineseChars,
    asciiLetters,
    flags,
    preview: normalizePreview(content),
  };
}

function logStageContextDebug(
  projectDir: string,
  stage: SceneStageId,
  runnerType: SceneStageRunnerType,
  stageContext: SceneStageContext,
): void {
  const payload = {
    project: path.basename(projectDir),
    projectDir,
    stage,
    runnerType,
    warnings: stageContext.warnings,
    contextCharBudget: stageContext.contextCharBudget,
    totalRequiredChars: stageContext.requiredInputs.reduce((sum, input) => sum + input.content.length, 0),
    totalOptionalChars: stageContext.optionalInputs.reduce((sum, input) => sum + input.content.length, 0),
    requiredInputs: stageContext.requiredInputs.map((input) =>
      summarizeStageContextInput(input, stageContext.warnings),
    ),
    optionalInputs: stageContext.optionalInputs.map((input) =>
      summarizeStageContextInput(input, stageContext.warnings),
    ),
    handoffRefs: stageContext.handoffRefs,
    referencePriority: stageContext.referencePriority.currentInputsHighestFirst,
  };

  addAppLog(
    'info',
    'sceneforge-stage-context',
    `stageContext 调试快照：${path.basename(projectDir)} ${stage} (${runnerType})`,
    JSON.stringify(payload, null, 2),
  );
}

function assertRunnableStageContext(
  stageContext: SceneStageContext,
  runnerType: SceneStageRunnerType,
): void {
  if (runnerType !== 'direct_llm' && runnerType !== 'acp_agent') {
    return;
  }
  const normalized = normalizeRequiredInputsForBlocking(stageContext.requiredInputs);
  if (!hasBlockingMissingRequiredInputs({ requiredInputs: normalized })) {
    return;
  }
  const message = formatMissingRequiredInputsMessage(
    listMissingRequiredStageInputs({ requiredInputs: normalized }),
  );
  throw new SceneRunBlockedError(message || '无法运行：请先补齐上游阶段产物。');
}

export type {
  SceneStageContext,
  SceneStageContextInput,
  SceneStageContextOptions,
} from './pipeline/scene-context-builder';

interface SceneRunStageRuntimeOptions {
  onProgress?: (progress: SceneStageRunProgress) => void;
}

const DESIGN_ARTIFACT_KEYS = [
  'design_prompts',
  'character_prompts',
  'scene_prompts',
  'prop_prompts',
  'master_reference_prompt',
] as const;

const STORYBOARD_ARTIFACT_KEYS = [
  'storyboard_prompt_pack',
  'control_board_prompts',
  'style_board_prompts',
  'master_board_prompt',
] as const;

const VIDEO_PROMPTS_ARTIFACT_KEYS = [
  'video_prompt_pack_cn',
  'video_prompt_review',
  'video_prompt_trace',
  'video_prompt_pack_en',
  'video_prompt_pack',
] as const;

type DesignArtifactKey = (typeof DESIGN_ARTIFACT_KEYS)[number];
type StoryboardArtifactKey = (typeof STORYBOARD_ARTIFACT_KEYS)[number];
type VideoPromptsArtifactKey = (typeof VIDEO_PROMPTS_ARTIFACT_KEYS)[number];

const DESIGN_ARTIFACT_TITLES: Record<DesignArtifactKey, string> = {
  design_prompts: '设定图提示词',
  character_prompts: '角色提示词',
  scene_prompts: '场景提示词',
  prop_prompts: '道具提示词',
  master_reference_prompt: '总参考图提示词',
};

const STORYBOARD_ARTIFACT_TITLES: Record<StoryboardArtifactKey, string> = {
  storyboard_prompt_pack: '故事板提示词包',
  control_board_prompts: '控制板提示词',
  style_board_prompts: '风格板提示词',
  master_board_prompt: '总故事板提示词',
};

const VIDEO_PROMPTS_ARTIFACT_TITLES: Record<VideoPromptsArtifactKey, string> = {
  video_prompt_pack_cn: '视频提示词包（中文主交付）',
  video_prompt_review: '视频提示词审查记录',
  video_prompt_trace: '视频提示词溯源记录',
  video_prompt_pack_en: '视频提示词包（英文可选）',
  video_prompt_pack: '视频提示词包（旧格式兼容）',
};

const SUPPORT_DRAFT_STAGES = [
  'source_intake',
  'topic_gate',
  'reference',
  'story',
  'assets',
  'script',
  'performance',
  'audio',
  'publish',
] as const;
type SupportDraftStage = (typeof SUPPORT_DRAFT_STAGES)[number];

const SUPPORT_DRAFT_CONFIG: Record<
  SupportDraftStage,
  { artifactKeys: readonly string[]; titles: Record<string, string> }
> = {
  source_intake: {
    artifactKeys: ['source_material', 'adaptation_selection'],
    titles: { source_material: '源材料', adaptation_selection: '改编方向确认' },
  },
  topic_gate: {
    artifactKeys: ['topic_brief', 'gate_confirmations'],
    titles: { topic_brief: '选题简报', gate_confirmations: '选题闸门确认' },
  },
  reference: {
    artifactKeys: ['reference_notes'],
    titles: { reference_notes: '参考分析笔记' },
  },
  story: {
    artifactKeys: ['story_direction'],
    titles: { story_direction: '故事方向' },
  },
  assets: {
    artifactKeys: ['asset_plan'],
    titles: { asset_plan: '资产规划' },
  },
  script: {
    artifactKeys: ['script_draft'],
    titles: { script_draft: '剧本草案' },
  },
  performance: {
    artifactKeys: ['performance_direction'],
    titles: { performance_direction: '表演指导' },
  },
  audio: {
    artifactKeys: ['audio_design'],
    titles: { audio_design: '声音设计' },
  },
  publish: {
    artifactKeys: ['publish_notes'],
    titles: { publish_notes: '发布说明' },
  },
};

const STAGE_DRAFT_CONFIG = {
  design: {
    artifactKeys: DESIGN_ARTIFACT_KEYS,
    titles: DESIGN_ARTIFACT_TITLES,
  },
  storyboard: {
    artifactKeys: STORYBOARD_ARTIFACT_KEYS,
    titles: STORYBOARD_ARTIFACT_TITLES,
  },
  video_prompts: {
    artifactKeys: VIDEO_PROMPTS_ARTIFACT_KEYS,
    titles: VIDEO_PROMPTS_ARTIFACT_TITLES,
  },
} as const;

export type DesignDraftInput = Partial<Record<DesignArtifactKey, string>>;
export type StoryboardDraftInput = Partial<Record<StoryboardArtifactKey, string>>;
export type VideoPromptsDraftInput = Partial<Record<VideoPromptsArtifactKey, string>>;

export type SceneForgeServiceErrorCode =
  | 'INVALID_DESIGN_DRAFT_ARTIFACT'
  | 'INVALID_STAGE_DRAFT_ARTIFACT'
  | 'UNSUPPORTED_STAGE_DRAFT'
  | 'SCENE_PIPELINE_COMPLETION_FAILED';

export class SceneForgeServiceError extends Error {
  code: SceneForgeServiceErrorCode;
  audit?: import('./pipeline/scene-pipeline-completion').ScenePipelineCompletionAudit;

  constructor(
    code: SceneForgeServiceErrorCode,
    message: string,
    audit?: import('./pipeline/scene-pipeline-completion').ScenePipelineCompletionAudit,
  ) {
    super(message);
    this.name = 'SceneForgeServiceError';
    this.code = code;
    this.audit = audit;
  }
}

export interface SubmitStageDraftResult {
  stage: SceneStageId;
  status: string;
  artifactIds: string[];
  validation: SceneValidationResult;
}

export type SubmitDesignDraftResult = SubmitStageDraftResult & { stage: 'design' };

export interface SceneSubmitStageDraftInput {
  projectDir: string;
  stage: 'design' | 'storyboard' | 'video_prompts' | SupportDraftStage;
  artifacts: Array<{
    artifactKey: string;
    content: string;
  }>;
}

export interface SceneProjectState {
  state: SceneState;
  artifacts: SceneArtifact[];
  approvalPolicies: Partial<Record<SceneStageId, SceneApprovalPolicy>>;
  entryPath: SceneEntryPath;
  selectedStyleProfileId: string | null;
  selectedAssetIds: string[];
}

export interface SceneRunStageInput {
  projectDir: string;
  stage: SceneStageId;
  runnerType: SceneStageRunnerType;
  manualArtifacts?: Record<string, string>;
  selectedAssetIds?: string[];
  currentDraftArtifacts?: Record<string, string>;
  refinementPrompt?: string;
}

export interface SceneAnalyzeTopicGateInput {
  projectDir: string;
}

export interface SceneCheckTopicIntentInput {
  projectDir: string;
  topicBriefMarkdown?: string;
}

export interface SceneUpdateStyleSelectionInput extends SceneProjectStyleSelection {
  projectDir: string;
}

interface SceneForgeServiceDeps {
  checkTopicIntent?: (
    input: {
      topicBriefMarkdown: string;
      sourceMaterialMarkdown?: string | null;
      adaptationSelectionMarkdown?: string | null;
    },
  ) => Promise<SceneTopicIntentCheckResult>;
  analyzeTopicGate?: (
    input: {
      topicBriefMarkdown: string;
      sourceMaterialMarkdown?: string | null;
      adaptationSelectionMarkdown?: string | null;
    },
  ) => Promise<SceneTopicGateAnalysisResult>;
}

function isStyleProfileEntry(asset: SceneAssetRegistryEntry, assetId: string): boolean {
  return asset.id === assetId && asset.type === 'style_profile';
}

function isMethodologyEntry(asset: SceneAssetRegistryEntry, assetId: string): boolean {
  return asset.id === assetId && asset.type === 'methodology';
}

function isSupportDraftStage(stage: SceneStageId): stage is SupportDraftStage {
  return (SUPPORT_DRAFT_STAGES as readonly string[]).includes(stage);
}

function getStageDraftConfig(stage: SceneStageId) {
  if (stage === 'design' || stage === 'storyboard' || stage === 'video_prompts') {
    return STAGE_DRAFT_CONFIG[stage];
  }
  if (isSupportDraftStage(stage)) {
    return SUPPORT_DRAFT_CONFIG[stage];
  }
  throw new SceneForgeServiceError(
    'UNSUPPORTED_STAGE_DRAFT',
    `暂不支持提交 ${stage} 阶段草案。`,
  );
}

function assertDraftArtifactKey(stage: SceneStageId, artifactKey: string): void {
  const config = getStageDraftConfig(stage);
  if (!(config.artifactKeys as readonly string[]).includes(artifactKey)) {
    throw new SceneForgeServiceError(
      stage === 'design' ? 'INVALID_DESIGN_DRAFT_ARTIFACT' : 'INVALID_STAGE_DRAFT_ARTIFACT',
      `未知 ${stage} 产物：${artifactKey}`,
    );
  }
}

async function writeHandoffIfCapable(projectDir: string, stage: SceneStageId): Promise<void> {
  if (!listHandoffCapableStages().includes(stage)) {
    return;
  }
  try {
    await writeSceneStageHandoff(projectDir, stage);
  } catch {
    // Handoff is best-effort until templates cover all approved stages.
  }
}

export class SceneForgeService {
  private readonly checkTopicIntentWithLlm: NonNullable<SceneForgeServiceDeps['checkTopicIntent']>;
  private readonly analyzeTopicGateWithLlm: NonNullable<SceneForgeServiceDeps['analyzeTopicGate']>;

  constructor(deps: SceneForgeServiceDeps = {}) {
    this.checkTopicIntentWithLlm =
      deps.checkTopicIntent ??
      createTopicIntentDirectLlmChecker({
        loadSettings: async () => {
          try {
            return await loadFullHeadlessAISettings(app.getPath('userData'));
          } catch {
            return null;
          }
        },
        generateText,
      }).check;
    this.analyzeTopicGateWithLlm =
      deps.analyzeTopicGate ??
      createTopicGateDirectLlmAnalyzer({
        loadSettings: async () => {
          try {
            return await loadFullHeadlessAISettings(app.getPath('userData'));
          } catch {
            return null;
          }
        },
        generateText,
      }).analyze;
  }

  async createProject(projectDir: string, entryPath?: SceneEntryPath) {
    return createSceneForgeProject(projectDir, entryPath ?? 'topic_gate');
  }

  async getProjectState(projectDir: string): Promise<SceneProjectState> {
    const state = await readSceneState(projectDir);
    const artifacts = await listSceneArtifacts(projectDir);
    const entryPath = await readSceneProjectEntryPath(projectDir);
    const selection = await readSceneProjectStyleSelection(projectDir);
    const approvalPolicies: Partial<Record<SceneStageId, SceneApprovalPolicy>> = {};
    for (const stage of [
      'design',
      'storyboard',
      'video_prompts',
      'source_intake',
      'topic_gate',
      'reference',
      'story',
      'assets',
      'script',
      'performance',
      'audio',
      'publish',
    ] as const) {
      approvalPolicies[stage] = await resolveSceneApprovalPolicy(projectDir, stage);
    }
    return {
      state,
      artifacts,
      approvalPolicies,
      entryPath,
      selectedStyleProfileId: selection.selectedStyleProfileId,
      selectedAssetIds: selection.selectedAssetIds,
    };
  }

  async listAvailableAssets(): Promise<SceneAssetRegistryEntry[]> {
    return listSceneAssets();
  }

  async updateStyleSelection(input: SceneUpdateStyleSelectionInput): Promise<SceneProjectState> {
    const availableAssets = await listSceneAssets();
    const styleId = input.selectedStyleProfileId;
    if (styleId && !availableAssets.some((asset) => isStyleProfileEntry(asset, styleId))) {
      throw new SceneForgeServiceError(
        'INVALID_STAGE_DRAFT_ARTIFACT',
        `未知风格配置：${styleId}`,
      );
    }

    const selectedAssetIds = Array.from(new Set(input.selectedAssetIds));
    for (const assetId of selectedAssetIds) {
      if (!availableAssets.some((asset) => isMethodologyEntry(asset, assetId))) {
        throw new SceneForgeServiceError(
          'INVALID_STAGE_DRAFT_ARTIFACT',
          `未知附加资产：${assetId}`,
        );
      }
    }

    await updateSceneProjectStyleSelection(input.projectDir, {
      selectedStyleProfileId: styleId,
      selectedAssetIds,
    });
    return this.getProjectState(input.projectDir);
  }

  async submitDesignDraft(
    projectDir: string,
    draft: DesignDraftInput,
  ): Promise<SubmitDesignDraftResult> {
    return this.submitCoreStageDraft(projectDir, 'design', draft) as Promise<SubmitDesignDraftResult>;
  }

  async submitStoryboardDraft(
    projectDir: string,
    draft: StoryboardDraftInput,
  ): Promise<SubmitStageDraftResult> {
    return this.submitCoreStageDraft(projectDir, 'storyboard', draft);
  }

  async submitVideoPromptsDraft(
    projectDir: string,
    draft: VideoPromptsDraftInput,
  ): Promise<SubmitStageDraftResult> {
    return this.submitCoreStageDraft(projectDir, 'video_prompts', draft);
  }

  async submitStageDraft(input: SceneSubmitStageDraftInput): Promise<SubmitStageDraftResult> {
    const draft: Record<string, string> = {};
    for (const artifact of input.artifacts) {
      assertDraftArtifactKey(input.stage, artifact.artifactKey);
      draft[artifact.artifactKey] = artifact.content;
    }
    if (isSupportDraftStage(input.stage)) {
      return this.submitSupportStageDraft(input.projectDir, input.stage, draft);
    }
    return this.submitCoreStageDraft(
      input.projectDir,
      input.stage as 'design' | 'storyboard' | 'video_prompts',
      draft,
    );
  }

  async validateStage(projectDir: string, stage: SceneStageId): Promise<SceneValidationResult> {
    const validation = await validateSceneStage(projectDir, stage);
    if (validation.status === 'failed') {
      await markSceneStageValidationFailed(
        projectDir,
        stage,
        validation.errors.map((error) => error.code),
      );
      return validation;
    }
    const policy = await resolveSceneApprovalPolicy(projectDir, stage);
    const state = await markSceneStageValidated(projectDir, stage, policy);
    if (policy === 'auto_if_valid') {
      await writeHandoffIfCapable(projectDir, stage);
    }
    return validation;
  }

  private async submitCoreStageDraft(
    projectDir: string,
    stage: 'design' | 'storyboard' | 'video_prompts',
    draft: Record<string, string | undefined>,
  ): Promise<SubmitStageDraftResult> {
    const config = getStageDraftConfig(stage);
    const artifactIds: string[] = [];

    for (const [artifactKey, content] of Object.entries(draft)) {
      assertDraftArtifactKey(stage, artifactKey);
      if (!content) continue;
      let normalizedContent = content;
      if (stage === 'design') {
        if (artifactKey === 'design_prompts') {
          normalizedContent = normalizeDesignPromptsMarkdown(content);
        } else if (artifactKey === 'character_prompts') {
          normalizedContent = normalizeCharacterPromptsMarkdown(content);
        }
      }
      const artifact = await writeSceneArtifact({
        projectDir,
        stage,
        artifactKey,
        kind: 'final',
        title: config.titles[artifactKey as keyof typeof config.titles] ?? artifactKey,
        content: normalizedContent,
        role: 'core_generation_asset',
        coreAsset: true,
        readableByDownstream: true,
      });
      artifactIds.push(artifact.id);
    }

    await markSceneStageDraftSubmitted(projectDir, stage, artifactIds);
    const validation = await validateSceneStage(projectDir, stage);

    if (validation.status === 'failed') {
      const state = await markSceneStageValidationFailed(
        projectDir,
        stage,
        validation.errors.map((error) => error.code),
      );
      return {
        stage,
        status: state.stages[stage]?.status ?? 'validation_failed',
        artifactIds,
        validation,
      };
    }

    const policy = await resolveSceneApprovalPolicy(projectDir, stage);
    const state = await markSceneStageValidated(projectDir, stage, policy);
    return {
      stage,
      status: state.stages[stage]?.status ?? 'validated',
      artifactIds,
      validation,
    };
  }

  private async submitSupportStageDraft(
    projectDir: string,
    stage: SupportDraftStage,
    draft: Record<string, string | undefined>,
  ): Promise<SubmitStageDraftResult> {
    const config = SUPPORT_DRAFT_CONFIG[stage];
    const artifactIds: string[] = [];

    for (const [artifactKey, content] of Object.entries(draft)) {
      assertDraftArtifactKey(stage, artifactKey);
      if (!content?.trim()) continue;
      let normalizedContent = content;
      if (stage === 'reference' && artifactKey === 'reference_notes') {
        normalizedContent = normalizeReferenceNotesMarkdown(content);
      } else if (stage === 'script' && artifactKey === 'script_draft') {
        normalizedContent = normalizeScriptDraftMarkdown(content);
      } else if (stage === 'performance' && artifactKey === 'performance_direction') {
        normalizedContent = normalizePerformanceDirectionMarkdown(content);
      }
      const artifact = await writeSceneArtifact({
        projectDir,
        stage,
        artifactKey,
        kind: 'final',
        title: config.titles[artifactKey] ?? artifactKey,
        content: normalizedContent,
        role: 'support_direction_asset',
        coreAsset: false,
        readableByDownstream: true,
      });
      artifactIds.push(artifact.id);
    }

    await markSceneStageDraftSubmitted(projectDir, stage, artifactIds);
    const validation = await validateSceneStage(projectDir, stage);

    if (validation.status === 'failed') {
      const state = await markSceneStageValidationFailed(
        projectDir,
        stage,
        validation.errors.map((error) => error.code),
      );
      return {
        stage,
        status: state.stages[stage]?.status ?? 'validation_failed',
        artifactIds,
        validation,
      };
    }

    const policy = await resolveSceneApprovalPolicy(projectDir, stage);
    const state = await markSceneStageValidated(projectDir, stage, policy);
    return {
      stage,
      status: state.stages[stage]?.status ?? 'validated',
      artifactIds,
      validation,
    };
  }

  async approveStage(projectDir: string, stage: SceneStageId) {
    const state = await approveSceneStage(projectDir, stage);
    await writeHandoffIfCapable(projectDir, stage);
    return state;
  }

  async setCurrentStage(projectDir: string, stage: SceneStageId): Promise<SceneProjectState> {
    await setSceneCurrentStage(projectDir, stage);
    return this.getProjectState(projectDir);
  }

  async completeProject(projectDir: string): Promise<SceneProjectState> {
    const state = await readSceneState(projectDir);
    const entryPath = await readSceneProjectEntryPath(projectDir);
    const audit = await auditPipelineCompletionForProject(projectDir, state, entryPath, {
      runValidators: true,
    });
    try {
      const nextState = await completeSceneForgeProject(projectDir, entryPath, audit);
      await syncSceneProjectMetaFromState(projectDir, nextState);
    } catch (error) {
      if (error instanceof SceneProjectCompletionError) {
        throw new SceneForgeServiceError('SCENE_PIPELINE_COMPLETION_FAILED', error.message, error.audit);
      }
      throw error;
    }
    return this.getProjectState(projectDir);
  }

  async requestRevision(projectDir: string, stage: SceneStageId, note: string) {
    return requestSceneStageRevision(projectDir, stage, note);
  }

  async setApprovalPolicy(
    projectDir: string,
    stage: SceneStageId,
    policy: SceneApprovalPolicy,
  ) {
    return setSceneApprovalPolicy(projectDir, stage, policy);
  }

  async listArtifacts(projectDir: string) {
    return listSceneArtifacts(projectDir);
  }

  async readArtifact(projectDir: string, artifactId: string) {
    return readSceneArtifact(projectDir, artifactId);
  }

  async checkTopicIntent(input: SceneCheckTopicIntentInput): Promise<SceneTopicIntentCheckResult> {
    const artifacts = await listSceneArtifacts(input.projectDir);
    const topicBriefArtifact = artifacts.find((artifact) => artifact.id === 'topic_gate.topic_brief');
    let topicBriefMarkdown = input.topicBriefMarkdown?.trim() ?? '';
    if (!topicBriefMarkdown && !topicBriefArtifact) {
      throw new SceneForgeServiceError(
        'UNSUPPORTED_STAGE_DRAFT',
        '请先填写选题描述，再确认选题描述。',
      );
    }
    if (!topicBriefMarkdown && topicBriefArtifact) {
      topicBriefMarkdown = (await readSceneArtifact(input.projectDir, topicBriefArtifact.id)).content;
    }
    const sourceMaterialArtifact = artifacts.find((artifact) => artifact.id === 'source_intake.source_material');
    const adaptationSelectionArtifact = artifacts.find(
      (artifact) => artifact.id === 'source_intake.adaptation_selection',
    );
    const sourceMaterialMarkdown = sourceMaterialArtifact
      ? (await readSceneArtifact(input.projectDir, sourceMaterialArtifact.id)).content
      : null;
    const adaptationSelectionMarkdown = adaptationSelectionArtifact
      ? (await readSceneArtifact(input.projectDir, adaptationSelectionArtifact.id)).content
      : null;

    const result = await this.checkTopicIntentWithLlm({
      topicBriefMarkdown,
      sourceMaterialMarkdown,
      adaptationSelectionMarkdown,
    });

    await writeSceneArtifact({
      projectDir: input.projectDir,
      stage: 'topic_gate',
      artifactKey: result.artifactKey,
      kind: 'final',
      title: '创作意图检查',
      content: result.content,
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: false,
    });

    return result;
  }

  async analyzeTopicGate(input: SceneAnalyzeTopicGateInput): Promise<SceneTopicGateAnalysisResult> {
    const artifacts = await listSceneArtifacts(input.projectDir);
    const topicBriefArtifact = artifacts.find((artifact) => artifact.id === 'topic_gate.topic_brief');
    if (!topicBriefArtifact) {
      throw new SceneForgeServiceError(
        'UNSUPPORTED_STAGE_DRAFT',
        '请先保存选题简报，再分析选题。',
      );
    }

    const { content: topicBriefMarkdown } = await readSceneArtifact(input.projectDir, topicBriefArtifact.id);
    const sourceMaterialArtifact = artifacts.find((artifact) => artifact.id === 'source_intake.source_material');
    const adaptationSelectionArtifact = artifacts.find(
      (artifact) => artifact.id === 'source_intake.adaptation_selection',
    );
    const sourceMaterialMarkdown = sourceMaterialArtifact
      ? (await readSceneArtifact(input.projectDir, sourceMaterialArtifact.id)).content
      : null;
    const adaptationSelectionMarkdown = adaptationSelectionArtifact
      ? (await readSceneArtifact(input.projectDir, adaptationSelectionArtifact.id)).content
      : null;

    const result = await this.analyzeTopicGateWithLlm({
      topicBriefMarkdown,
      sourceMaterialMarkdown,
      adaptationSelectionMarkdown,
    });

    await writeSceneArtifact({
      projectDir: input.projectDir,
      stage: 'topic_gate',
      artifactKey: result.artifactKey,
      kind: 'final',
      title: '选题分析',
      content: result.content,
      role: 'support_direction_asset',
      coreAsset: false,
      readableByDownstream: false,
    });

    return result;
  }

  async runStage(
    input: SceneRunStageInput,
    runtimeOptions?: SceneRunStageRuntimeOptions,
  ): Promise<SceneStageRunnerResult> {
    const selectedAssetIds = await this.resolveSelectedAssetIds(
      input.projectDir,
      input.selectedAssetIds,
    );
    const stageContext = await this.getStageContext(input.projectDir, input.stage, {
      runner: input.runnerType,
      selectedAssetIds,
    });
    logStageContextDebug(input.projectDir, input.stage, input.runnerType, stageContext);
    assertRunnableStageContext(stageContext, input.runnerType);
    const runner = createDefaultSceneStageRunner(input.runnerType);
    return runner.run({
      projectDir: input.projectDir,
      stage: input.stage,
      stageContext,
      manualArtifacts: input.manualArtifacts,
      currentDraftArtifacts: input.currentDraftArtifacts,
      refinementPrompt: input.refinementPrompt,
      submitStageDraft: (submitInput) => this.submitStageDraft(submitInput as SceneSubmitStageDraftInput),
      onProgress: runtimeOptions?.onProgress,
    });
  }

  async getStageContext(
    projectDir: string,
    stage: SceneStageId,
    options?: SceneStageContextOptions,
  ): Promise<SceneStageContext> {
    const selectedAssetIds = await this.resolveSelectedAssetIds(projectDir, options?.selectedAssetIds);
    const buildOptions: BuildSceneStageContextOptions = {
      selectedAssetIds,
      runner: options?.runner,
    };
    return buildSceneStageContext(projectDir, stage, buildOptions);
  }

  private async resolveSelectedAssetIds(
    projectDir: string,
    explicitSelectedAssetIds?: string[],
  ): Promise<string[]> {
    if (explicitSelectedAssetIds !== undefined) {
      return Array.from(new Set(explicitSelectedAssetIds));
    }
    const selection = await readSceneProjectStyleSelection(projectDir);
    return getEffectiveSceneSelectedAssetIds(selection);
  }
}
