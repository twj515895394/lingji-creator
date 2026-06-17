import type { SceneStageId } from './types';
import type { SceneApprovalPolicy } from './types';
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
  buildSceneStageContext,
  type BuildSceneStageContextOptions,
  type SceneStageContext,
  type SceneStageContextInput,
  type SceneStageContextOptions,
} from './pipeline/scene-context-builder';
import {
  createSceneStageRunner,
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
import { createSceneForgeProject } from './project/scene-project-file';
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
  stage: 'design' | 'storyboard' | 'video_prompts';
  status: string;
  artifactIds: string[];
  validation: SceneValidationResult;
}

export type SubmitDesignDraftResult = SubmitStageDraftResult & { stage: 'design' };

export interface SceneSubmitStageDraftInput {
  projectDir: string;
  stage: 'design' | 'storyboard' | 'video_prompts';
  artifacts: Array<{
    artifactKey: string;
    content: string;
  }>;
}

export interface SceneProjectState {
  state: SceneState;
  artifacts: SceneArtifact[];
  approvalPolicies: Partial<Record<SceneStageId, SceneApprovalPolicy>>;
}

export interface SceneRunStageInput {
  projectDir: string;
  stage: SceneStageId;
  runnerType: SceneStageRunnerType;
  manualArtifacts?: Record<string, string>;
}

function getStageDraftConfig(stage: SceneStageId) {
  if (stage === 'design' || stage === 'storyboard' || stage === 'video_prompts') {
    return STAGE_DRAFT_CONFIG[stage];
  }
  throw new SceneForgeServiceError(
    'UNSUPPORTED_STAGE_DRAFT',
    `暂不支持提交 ${stage} 阶段草案。`,
  );
}

function assertDraftArtifactKey(stage: SceneStageId, artifactKey: string): void {
  const config = getStageDraftConfig(stage);
  if (!config.artifactKeys.includes(artifactKey as never)) {
    throw new SceneForgeServiceError(
      stage === 'design' ? 'INVALID_DESIGN_DRAFT_ARTIFACT' : 'INVALID_STAGE_DRAFT_ARTIFACT',
      `未知 ${stage} 产物：${artifactKey}`,
    );
  }
}

export class SceneForgeService {
  async createProject(projectDir: string) {
    return createSceneForgeProject(projectDir);
  }

  async getProjectState(projectDir: string): Promise<SceneProjectState> {
    const state = await readSceneState(projectDir);
    const artifacts = await listSceneArtifacts(projectDir);
    const approvalPolicies: Partial<Record<SceneStageId, SceneApprovalPolicy>> = {};
    for (const stage of ['design', 'storyboard', 'video_prompts', 'export'] as const) {
      approvalPolicies[stage] = await resolveSceneApprovalPolicy(projectDir, stage);
    }
    return { state, artifacts, approvalPolicies };
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
    return this.submitCoreStageDraft(input.projectDir, input.stage, draft);
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
    await markSceneStageValidated(projectDir, stage, policy);
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

  async approveStage(projectDir: string, stage: SceneStageId) {
    return approveSceneStage(projectDir, stage);
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
    const runner = createSceneStageRunner(input.runnerType);
    const stageContext = await this.getStageContext(input.projectDir, input.stage, {
      runner: input.runnerType,
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
