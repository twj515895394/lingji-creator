import type { SceneApprovalPolicy, SceneEntryPath, SceneStageId } from '../../src/types/sceneforge';
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
  type SceneStageRunnerType,
} from './pipeline/scene-stage-runner';
import {
  approveSceneStage,
  markSceneStageDraftSubmitted,
  markSceneStageValidated,
  markSceneStageValidationFailed,
  readSceneState,
  requestSceneStageRevision,
  type SceneState,
} from './pipeline/scene-state-machine';
import { createSceneForgeProject, readSceneProjectEntryPath } from './project/scene-project-file';
import { exportScenePromptPack } from './export/scene-prompt-pack-exporter';
import { validateSceneStage, type SceneValidationResult } from './validators/scene-validator';

export type {
  SceneStageContext,
  SceneStageContextInput,
  SceneStageContextOptions,
} from './pipeline/scene-context-builder';

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

const VIDEO_PROMPTS_ARTIFACT_KEYS = ['video_prompt_pack', 'video_prompt_pack_cn'] as const;

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
  video_prompt_pack: '视频提示词包',
  video_prompt_pack_cn: '中文视频提示词包',
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
  | 'UNSUPPORTED_STAGE_DRAFT';

export class SceneForgeServiceError extends Error {
  code: SceneForgeServiceErrorCode;

  constructor(code: SceneForgeServiceErrorCode, message: string) {
    super(message);
    this.name = 'SceneForgeServiceError';
    this.code = code;
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
}

export interface SceneRunStageInput {
  projectDir: string;
  stage: SceneStageId;
  runnerType: SceneStageRunnerType;
  manualArtifacts?: Record<string, string>;
  selectedAssetIds?: string[];
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
  async createProject(projectDir: string, entryPath?: SceneEntryPath) {
    return createSceneForgeProject(projectDir, entryPath ?? 'topic_gate');
  }

  async getProjectState(projectDir: string): Promise<SceneProjectState> {
    const state = await readSceneState(projectDir);
    const artifacts = await listSceneArtifacts(projectDir);
    const entryPath = await readSceneProjectEntryPath(projectDir);
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
      'export',
    ] as const) {
      approvalPolicies[stage] = await resolveSceneApprovalPolicy(projectDir, stage);
    }
    return { state, artifacts, approvalPolicies, entryPath };
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
      const artifact = await writeSceneArtifact({
        projectDir,
        stage,
        artifactKey,
        kind: 'final',
        title: config.titles[artifactKey as keyof typeof config.titles] ?? artifactKey,
        content,
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
      const artifact = await writeSceneArtifact({
        projectDir,
        stage,
        artifactKey,
        kind: 'final',
        title: config.titles[artifactKey] ?? artifactKey,
        content,
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

  async exportPromptPack(projectDir: string) {
    return exportScenePromptPack(projectDir);
  }

  async runStage(input: SceneRunStageInput): Promise<SceneStageRunnerResult> {
    const runner = createDefaultSceneStageRunner(input.runnerType);
    const stageContext = await this.getStageContext(input.projectDir, input.stage, {
      runner: input.runnerType,
      selectedAssetIds: input.selectedAssetIds,
    });
    return runner.run({
      projectDir: input.projectDir,
      stage: input.stage,
      stageContext,
      manualArtifacts: input.manualArtifacts,
      submitStageDraft: (submitInput) => this.submitStageDraft(submitInput as SceneSubmitStageDraftInput),
    });
  }

  async getStageContext(
    projectDir: string,
    stage: SceneStageId,
    options?: SceneStageContextOptions,
  ): Promise<SceneStageContext> {
    const buildOptions: BuildSceneStageContextOptions = {
      selectedAssetIds: options?.selectedAssetIds,
      runner: options?.runner,
    };
    return buildSceneStageContext(projectDir, stage, buildOptions);
  }
}
