import path from 'node:path';
import type { SceneStageId } from '../types';
import type { SceneArtifact } from '../artifacts/scene-artifact-store';
import {
  listSceneArtifacts,
  readSceneArtifact,
} from '../artifacts/scene-artifact-store';
import { buildSceneArtifactDisplayModel } from '../artifacts/scene-artifact-display-model';
import { resolveSceneAssetsForStage, type SceneAssetSnippet } from '../assets/scene-asset-library';
import { getSceneStageDefinition } from './scene-stage-definitions';
import {
  extractHandoffSliceContent,
  readSceneStageHandoff,
  sceneHandoffRelativePath,
  type SceneHandoffDocument,
} from './scene-handoff-writer';
import {
  loadDefaultSceneContextPolicy,
  loadSceneContextPolicy,
  SceneContextPolicyError,
  type SceneContextDelivery,
  type SceneContextPolicyDocument,
  type SceneContextPolicyInput,
  type SceneContextRunnerType,
} from './scene-context-policy';
import {
  loadSceneStagePack,
  summarizeSceneStagePack,
  type SceneStagePackSummary,
} from './scene-stage-pack';
import { readSceneState, type SceneState } from './scene-state-machine';

export type SceneContextInputSource = 'handoff' | 'artifact' | 'summary' | 'pointer';

export interface SceneStageContextInput {
  stage: SceneStageId;
  artifactId: string;
  path: string;
  title: string;
  content: string;
  delivery?: SceneContextDelivery;
  source?: SceneContextInputSource;
  policyInputId?: string;
}

export interface SceneStageContextHandoffRef {
  fromStage: SceneStageId;
  relativePath: string;
  policyInputId: string;
}

export interface SceneStageContextAssetLibrary {
  selectedAssets: string[];
  snippets: SceneAssetSnippet[];
}

export interface SceneStageContext {
  stage: SceneStageId;
  requiredInputs: SceneStageContextInput[];
  optionalInputs: SceneStageContextInput[];
  outputContract: {
    requiredArtifacts: string[];
  };
  stagePack?: SceneStagePackSummary;
  assetLibrary?: SceneStageContextAssetLibrary;
  forbiddenActions: string[];
  warnings: string[];
  handoffRefs: SceneStageContextHandoffRef[];
  runner?: SceneContextRunnerType;
  contextCharBudget?: number;
}

export interface BuildSceneStageContextOptions {
  selectedAssetIds?: string[];
  runner?: SceneContextRunnerType;
}

export type SceneStageContextOptions = BuildSceneStageContextOptions;

const CORE_UPSTREAM_STAGES: SceneStageId[] = ['design', 'storyboard', 'video_prompts'];

function isCoreUpstreamStage(stage: SceneStageId): boolean {
  return CORE_UPSTREAM_STAGES.includes(stage);
}

function isForbidden(
  policy: SceneContextPolicyDocument,
  fromStage: SceneStageId,
  artifactKey: string,
): boolean {
  return (policy.forbidden ?? []).some(
    (entry) => entry.fromStage === fromStage && entry.artifactKey === artifactKey,
  );
}

function findReadableArtifact(
  artifacts: SceneArtifact[],
  fromStage: SceneStageId,
  artifactKey: string,
): SceneArtifact | undefined {
  const artifactId = `${fromStage}.${artifactKey}`;
  return artifacts.find(
    (item) =>
      item.id === artifactId &&
      item.kind === 'final' &&
      item.readableByDownstream &&
      (item.role === 'core_generation_asset' || item.role === 'support_direction_asset'),
  );
}

function upstreamStageReady(state: SceneState, fromStage: SceneStageId): boolean {
  if (isCoreUpstreamStage(fromStage)) {
    return state.stages[fromStage]?.status === 'approved';
  }
  return true;
}

function truncateSummary(text: string, maxChars?: number): string {
  const trimmed = text.trim();
  if (!maxChars || trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}\n…`;
}

async function resolveArtifactSummary(
  projectDir: string,
  artifact: SceneArtifact,
  maxChars?: number,
): Promise<string> {
  const { content } = await readSceneArtifact(projectDir, artifact.id);
  try {
    const display = buildSceneArtifactDisplayModel(artifact, content);
    const summary = display?.summary?.trim() || content.trim();
    return truncateSummary(summary, maxChars);
  } catch {
    return truncateSummary(content, maxChars);
  }
}

async function resolveDeliveryContent(
  projectDir: string,
  artifact: SceneArtifact,
  artifactKey: string,
  delivery: SceneContextDelivery,
  maxChars?: number,
  handoff: SceneHandoffDocument | null = null,
): Promise<{ content: string; source: SceneContextInputSource } | null> {
  if (delivery === 'pointer') {
    return { content: '', source: 'pointer' };
  }

  if (delivery === 'handoff') {
    if (!handoff) {
      return null;
    }
    const slice = extractHandoffSliceContent(handoff, artifactKey);
    if (!slice) {
      return null;
    }
    return { content: slice, source: 'handoff' };
  }

  if (delivery === 'summary') {
    const summary = await resolveArtifactSummary(projectDir, artifact, maxChars);
    if (!summary) {
      return null;
    }
    return { content: summary, source: 'summary' };
  }

  const { content } = await readSceneArtifact(projectDir, artifact.id);
  return { content, source: 'artifact' as const };
}

async function resolvePolicyInput(
  projectDir: string,
  state: SceneState,
  artifacts: SceneArtifact[],
  policyInput: SceneContextPolicyInput,
  warnings: string[],
  handoffRefs: SceneStageContextHandoffRef[],
): Promise<SceneStageContextInput | null> {
  const { fromStage, artifactKey, id: policyInputId } = policyInput;

  if (!upstreamStageReady(state, fromStage)) {
    if (policyInput.required) {
      warnings.push(`required_input_unavailable:${policyInputId}:${fromStage}_not_ready`);
    }
    return null;
  }

  const artifact = findReadableArtifact(artifacts, fromStage, artifactKey);
  if (!artifact) {
    if (policyInput.required) {
      warnings.push(`required_input_missing:${policyInputId}:${fromStage}.${artifactKey}`);
    }
    return null;
  }

  const handoff = await readSceneStageHandoff(projectDir, fromStage);
  let effectiveDelivery: SceneContextDelivery = policyInput.delivery;

  if (policyInput.delivery === 'handoff_first') {
    if (handoff) {
      effectiveDelivery = 'handoff';
      handoffRefs.push({
        fromStage,
        relativePath: sceneHandoffRelativePath(fromStage),
        policyInputId,
      });
    } else if (policyInput.fallback) {
      effectiveDelivery = policyInput.fallback;
      if (policyInput.required) {
        warnings.push(`handoff_missing_fallback:${policyInputId}:${effectiveDelivery}`);
      }
    } else {
      warnings.push(`handoff_missing_no_fallback:${policyInputId}`);
      return null;
    }
  }

  let resolved = await resolveDeliveryContent(
    projectDir,
    artifact,
    artifactKey,
    effectiveDelivery,
    policyInput.maxChars,
    handoff,
  );

  if (!resolved && effectiveDelivery === 'handoff' && policyInput.fallback) {
    effectiveDelivery = policyInput.fallback;
    warnings.push(`handoff_slice_missing_fallback:${policyInputId}:${effectiveDelivery}`);
    resolved = await resolveDeliveryContent(
      projectDir,
      artifact,
      artifactKey,
      effectiveDelivery,
      policyInput.maxChars,
      null,
    );
  }
  if (!resolved) {
    return null;
  }

  return {
    stage: artifact.stage,
    artifactId: artifact.id,
    path: artifact.path,
    title: artifact.title,
    content: resolved.content,
    delivery: effectiveDelivery,
    source: resolved.source,
    policyInputId,
  };
}

async function buildFromPolicy(
  projectDir: string,
  stage: SceneStageId,
  policy: SceneContextPolicyDocument,
  options?: BuildSceneStageContextOptions,
): Promise<Omit<SceneStageContext, 'forbiddenActions'>> {
  const state = await readSceneState(projectDir);
  const artifacts = await listSceneArtifacts(projectDir);
  const warnings: string[] = [];
  const handoffRefs: SceneStageContextHandoffRef[] = [];
  const requiredInputs: SceneStageContextInput[] = [];
  const optionalInputs: SceneStageContextInput[] = [];

  const processInput = async (
    policyInput: SceneContextPolicyInput,
    bucket: 'required' | 'optional',
  ) => {
    if (isForbidden(policy, policyInput.fromStage, policyInput.artifactKey)) {
      return;
    }

    const resolved = await resolvePolicyInput(
      projectDir,
      state,
      artifacts,
      policyInput,
      warnings,
      handoffRefs,
    );
    if (!resolved) {
      return;
    }

    if (bucket === 'optional') {
      optionalInputs.push(resolved);
    } else {
      requiredInputs.push(resolved);
    }
  };

  for (const policyInput of policy.inputs) {
    const bucket = policyInput.required === true ? 'required' : 'optional';
    await processInput(policyInput, bucket);
  }

  for (const policyInput of policy.optionalInputs ?? []) {
    await processInput(policyInput, 'optional');
  }

  let stagePack: SceneStagePackSummary | undefined;
  try {
    stagePack = summarizeSceneStagePack(await loadSceneStagePack(stage));
  } catch {
    stagePack = undefined;
  }

  let assetLibrary: SceneStageContextAssetLibrary | undefined;
  const selectedAssetIds = options?.selectedAssetIds ?? [];
  if (policy.assetLibrary?.allowSelectedStyleProfile && selectedAssetIds.length > 0) {
    const snippets = await resolveSceneAssetsForStage({ stage, selectedAssetIds });
    assetLibrary = { selectedAssets: selectedAssetIds, snippets };
  }

  let contextCharBudget: number | undefined;
  const runner = options?.runner;
  if (runner) {
    const defaultPolicy = await loadDefaultSceneContextPolicy();
    contextCharBudget =
      policy.runnerOverrides?.[runner]?.maxTotalChars ??
      defaultPolicy.runnerOverrides?.[runner]?.maxTotalChars;
  }

  if (contextCharBudget) {
    const totalChars = [...requiredInputs, ...optionalInputs].reduce(
      (sum, input) => sum + input.content.length,
      0,
    );
    if (totalChars > contextCharBudget) {
      warnings.push(`context_char_budget_exceeded:${totalChars}>${contextCharBudget}`);
    }
  }

  return {
    stage,
    requiredInputs,
    optionalInputs,
    outputContract: {
      requiredArtifacts:
        stagePack?.outputContract.requiredArtifacts ??
        getSceneStageDefinition(stage).requiredArtifacts,
    },
    stagePack,
    assetLibrary,
    warnings,
    handoffRefs,
    runner,
    contextCharBudget,
  };
}

export async function buildSceneStageContext(
  projectDir: string,
  stage: SceneStageId,
  options?: BuildSceneStageContextOptions,
): Promise<SceneStageContext> {
  const forbiddenActions = [
    'do_not_modify_state_file',
    'do_not_modify_manifest_directly',
    'do_not_read_unlisted_project_files',
    'do_not_advance_stage_directly',
  ];

  try {
    const policy = await loadSceneContextPolicy(stage);
    const built = await buildFromPolicy(projectDir, stage, policy, options);
    return { ...built, forbiddenActions };
  } catch (error) {
    if (!(error instanceof SceneContextPolicyError) || error.code !== 'POLICY_NOT_FOUND') {
      throw error;
    }
  }

  let stagePack: SceneStagePackSummary | undefined;
  try {
    stagePack = summarizeSceneStagePack(await loadSceneStagePack(stage));
  } catch {
    stagePack = undefined;
  }

  return {
    stage,
    requiredInputs: [],
    optionalInputs: [],
    outputContract: {
      requiredArtifacts:
        stagePack?.outputContract.requiredArtifacts ??
        getSceneStageDefinition(stage).requiredArtifacts,
    },
    stagePack,
    assetLibrary: undefined,
    warnings: [],
    handoffRefs: [],
    runner: options?.runner,
    forbiddenActions,
  };
}