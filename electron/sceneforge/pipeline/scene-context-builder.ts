import path from 'node:path';
import type { SceneStageId } from '../types';
import type { SceneArtifact } from '../artifacts/scene-artifact-store';
import {
  listSceneArtifacts,
  readSceneArtifact,
} from '../artifacts/scene-artifact-store';
import {
  buildSceneArtifactDisplayExcerpt,
  buildSceneArtifactDisplayModel,
} from '../artifacts/scene-artifact-display-model';
import {
  listSceneAssetsForStage,
  resolveSceneAssetsForStage,
  type SceneAssetSnippet,
} from '../assets/scene-asset-library';
import { getSceneStageDefinition, getSceneStageOrder } from './scene-stage-definitions';
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
  /** policy 声明的 required 是否已解析到可读内容 */
  satisfied?: boolean;
  fromStage?: SceneStageId;
  artifactKey?: string;
  priorityOrder?: number;
  priorityNote?: string;
}

export interface SceneStageContextReferencePriority {
  rule: string;
  currentInputsHighestFirst: Array<{
    artifactId: string;
    stage: SceneStageId;
    order: number;
    note: string;
  }>;
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
  referencePriority: SceneStageContextReferencePriority;
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
const REFERENCE_PRIORITY_RULE =
  '当多个依赖资料对同一事实存在冲突时，优先采用阶段顺序更靠后的已确认内容；后阶段视为对前阶段的修订，除非当前阶段提示词明确另有说明。';

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

function buildPriorityInfo(fromStage: SceneStageId): { order: number; note: string } {
  const order = getSceneStageOrder(fromStage);
  return {
    order,
    note: `阶段顺序值 ${order}。若与更早阶段冲突，优先保留该阶段已确认版本。`,
  };
}

async function resolveArtifactSummary(
  projectDir: string,
  artifact: SceneArtifact,
  maxChars?: number,
): Promise<string> {
  const { content } = await readSceneArtifact(projectDir, artifact.id);
  try {
    const display = buildSceneArtifactDisplayModel(artifact, content);
    if (display) {
      const excerpt = buildSceneArtifactDisplayExcerpt(display, maxChars);
      if (excerpt) {
        return excerpt;
      }
    }
    return truncateSummary(content.trim(), maxChars);
  } catch {
    return truncateSummary(content, maxChars);
  }
}

function normalizeLowSignalText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*-]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLowSignalOptionalContent(title: string, content: string): boolean {
  const normalizedContent = normalizeLowSignalText(content);
  const normalizedTitle = normalizeLowSignalText(title);
  if (!normalizedContent) return true;
  if (normalizedContent === normalizedTitle) return true;
  if (normalizedContent.length < Math.max(40, normalizedTitle.length * 2)) return true;
  return false;
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
  currentStage: SceneStageId,
  state: SceneState,
  artifacts: SceneArtifact[],
  policyInput: SceneContextPolicyInput,
  warnings: string[],
  handoffRefs: SceneStageContextHandoffRef[],
): Promise<SceneStageContextInput | null> {
  const { fromStage, artifactKey, id: policyInputId } = policyInput;
  const priority = buildPriorityInfo(fromStage);

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

  if (
    currentStage === 'video_prompts' &&
    !policyInput.required &&
    isLowSignalOptionalContent(artifact.title, resolved.content)
  ) {
    warnings.push(`optional_input_low_signal:${policyInputId}:${artifact.id}`);
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
    satisfied: policyInput.required === true ? true : undefined,
    fromStage,
    artifactKey,
    priorityOrder: priority.order,
    priorityNote: priority.note,
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
      stage,
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

  for (const policyInput of policy.inputs) {
    if (policyInput.required !== true) {
      continue;
    }
    const already = requiredInputs.some((input) => input.policyInputId === policyInput.id);
    if (already) {
      continue;
    }
    if (!upstreamStageReady(state, policyInput.fromStage)) {
      continue;
    }
    requiredInputs.push({
      stage: policyInput.fromStage,
      artifactId: `${policyInput.fromStage}.${policyInput.artifactKey}`,
      path: '',
      title: policyInput.id,
      content: '',
      policyInputId: policyInput.id,
      satisfied: false,
      fromStage: policyInput.fromStage,
      artifactKey: policyInput.artifactKey,
      priorityOrder: buildPriorityInfo(policyInput.fromStage).order,
      priorityNote: buildPriorityInfo(policyInput.fromStage).note,
    });
  }

  const referencePriority: SceneStageContextReferencePriority = {
    rule: REFERENCE_PRIORITY_RULE,
    currentInputsHighestFirst: [...requiredInputs, ...optionalInputs]
      .filter(
        (input): input is SceneStageContextInput & {
          fromStage: SceneStageId;
          priorityOrder: number;
          priorityNote: string;
        } => Boolean(input.fromStage && input.priorityOrder && input.priorityNote),
      )
      .sort((a, b) => b.priorityOrder - a.priorityOrder)
      .map((input) => ({
        artifactId: input.artifactId,
        stage: input.fromStage,
        order: input.priorityOrder,
        note: input.priorityNote,
      })),
  };

  let stagePack: SceneStagePackSummary | undefined;
  try {
    stagePack = summarizeSceneStagePack(await loadSceneStagePack(stage));
  } catch {
    stagePack = undefined;
  }

  let assetLibrary: SceneStageContextAssetLibrary | undefined;
  const selectedAssetIds = options?.selectedAssetIds ?? [];
  if (policy.assetLibrary) {
    const allowStyleProfile = policy.assetLibrary.allowStyleProfile === true;
    const allowMethodologyAssets = policy.assetLibrary.allowMethodologyAssets === true;
    const allowedAssetIds = policy.assetLibrary.allowedAssetIds;
    const allowedEntries = await listSceneAssetsForStage({
      stage,
      allowStyleProfile,
      allowMethodologyAssets,
      allowedAssetIds,
    });
    const allowedSelectedAssetIds = selectedAssetIds.filter((assetId) =>
      allowedEntries.some((entry) => entry.id === assetId),
    );
    if (allowedSelectedAssetIds.length > 0) {
      const snippets = await resolveSceneAssetsForStage({
        stage,
        selectedAssetIds: allowedSelectedAssetIds,
        allowStyleProfile,
        allowMethodologyAssets,
        allowedAssetIds,
      });
      assetLibrary = { selectedAssets: allowedSelectedAssetIds, snippets };
    }
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
    referencePriority,
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
    referencePriority: {
      rule: REFERENCE_PRIORITY_RULE,
      currentInputsHighestFirst: [],
    },
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
