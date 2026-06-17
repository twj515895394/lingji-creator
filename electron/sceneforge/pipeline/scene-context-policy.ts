import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneStageId } from '../types';
import { isSceneStageId } from './scene-stage-definitions';

export type SceneContextDelivery =
  | 'handoff'
  | 'handoff_first'
  | 'full'
  | 'summary'
  | 'pointer';

export type SceneContextRunnerType = 'manual_submit' | 'direct_llm' | 'acp_agent';

export interface SceneContextPolicyInput {
  id: string;
  fromStage: SceneStageId;
  artifactKey: string;
  delivery: SceneContextDelivery;
  fallback?: SceneContextDelivery;
  required?: boolean;
  maxChars?: number;
}

export interface SceneContextPolicyForbidden {
  fromStage: SceneStageId;
  artifactKey: string;
}

export interface SceneContextPolicyRunnerOverride {
  maxTotalChars?: number;
}

export interface SceneContextPolicyDocument {
  version: number;
  stage: SceneStageId;
  consumerRunners?: SceneContextRunnerType[];
  inputs: SceneContextPolicyInput[];
  optionalInputs?: SceneContextPolicyInput[];
  assetLibrary?: {
    allowSelectedStyleProfile?: boolean;
  };
  forbidden?: SceneContextPolicyForbidden[];
  runnerOverrides?: Partial<Record<SceneContextRunnerType, SceneContextPolicyRunnerOverride>>;
  description?: string;
}

export interface SceneDefaultContextPolicyDocument {
  version: number;
  description?: string;
  runnerOverrides?: Partial<Record<SceneContextRunnerType, SceneContextPolicyRunnerOverride>>;
}

export type SceneContextPolicyErrorCode =
  | 'INVALID_STAGE'
  | 'POLICY_NOT_FOUND'
  | 'INVALID_CONTEXT_POLICY';

export class SceneContextPolicyError extends Error {
  code: SceneContextPolicyErrorCode;

  constructor(code: SceneContextPolicyErrorCode, message: string) {
    super(message);
    this.name = 'SceneContextPolicyError';
    this.code = code;
  }
}

const CORE_CONTEXT_POLICY_STAGES: SceneStageId[] = ['design', 'storyboard', 'video_prompts'];

const DELIVERY_VALUES: SceneContextDelivery[] = [
  'handoff',
  'handoff_first',
  'full',
  'summary',
  'pointer',
];

function getRepoRoot(): string {
  return process.cwd();
}

function isDelivery(value: unknown): value is SceneContextDelivery {
  return typeof value === 'string' && DELIVERY_VALUES.includes(value as SceneContextDelivery);
}

function parseInputEntry(raw: unknown, label: string): SceneContextPolicyInput {
  if (!raw || typeof raw !== 'object') {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', `${label} must be an object`);
  }
  const entry = raw as Record<string, unknown>;
  const id = entry.id;
  const fromStage = entry.fromStage;
  const artifactKey = entry.artifactKey;
  const delivery = entry.delivery;

  if (typeof id !== 'string' || !id.trim()) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', `${label}.id must be a non-empty string`);
  }
  if (!isSceneStageId(fromStage)) {
    throw new SceneContextPolicyError(
      'INVALID_CONTEXT_POLICY',
      `${label}.fromStage must be a known SceneForge stage`,
    );
  }
  if (typeof artifactKey !== 'string' || !artifactKey.trim()) {
    throw new SceneContextPolicyError(
      'INVALID_CONTEXT_POLICY',
      `${label}.artifactKey must be a non-empty string`,
    );
  }
  if (!isDelivery(delivery)) {
    throw new SceneContextPolicyError(
      'INVALID_CONTEXT_POLICY',
      `${label}.delivery must be one of: ${DELIVERY_VALUES.join(', ')}`,
    );
  }

  const fallback = entry.fallback;
  if (fallback !== undefined && !isDelivery(fallback)) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', `${label}.fallback is invalid`);
  }

  const maxChars = entry.maxChars;
  if (maxChars !== undefined && (typeof maxChars !== 'number' || maxChars < 1)) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', `${label}.maxChars must be a positive number`);
  }

  return {
    id: id.trim(),
    fromStage,
    artifactKey: artifactKey.trim(),
    delivery,
    fallback: fallback as SceneContextDelivery | undefined,
    required: entry.required === true,
    maxChars: typeof maxChars === 'number' ? maxChars : undefined,
  };
}

function parseForbidden(raw: unknown): SceneContextPolicyForbidden[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'forbidden must be an array');
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', `forbidden[${index}] must be an object`);
    }
    const entry = item as Record<string, unknown>;
    if (!isSceneStageId(entry.fromStage)) {
      throw new SceneContextPolicyError(
        'INVALID_CONTEXT_POLICY',
        `forbidden[${index}].fromStage must be a known stage`,
      );
    }
    if (typeof entry.artifactKey !== 'string' || !entry.artifactKey.trim()) {
      throw new SceneContextPolicyError(
        'INVALID_CONTEXT_POLICY',
        `forbidden[${index}].artifactKey must be a non-empty string`,
      );
    }
    return { fromStage: entry.fromStage, artifactKey: entry.artifactKey.trim() };
  });
}

function parseRunnerOverrides(
  raw: unknown,
): Partial<Record<SceneContextRunnerType, SceneContextPolicyRunnerOverride>> | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'object') {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'runnerOverrides must be an object');
  }
  const result: Partial<Record<SceneContextRunnerType, SceneContextPolicyRunnerOverride>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!['manual_submit', 'direct_llm', 'acp_agent'].includes(key)) {
      continue;
    }
    if (!value || typeof value !== 'object') {
      continue;
    }
    const maxTotalChars = (value as Record<string, unknown>).maxTotalChars;
    if (maxTotalChars !== undefined) {
      if (typeof maxTotalChars !== 'number' || maxTotalChars < 1) {
        throw new SceneContextPolicyError(
          'INVALID_CONTEXT_POLICY',
          `runnerOverrides.${key}.maxTotalChars must be a positive number`,
        );
      }
      result[key as SceneContextRunnerType] = { maxTotalChars };
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseStagePolicyDocument(
  parsed: unknown,
  expectedStage: SceneStageId,
): SceneContextPolicyDocument {
  if (!parsed || typeof parsed !== 'object') {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'context-policy.yaml must be a YAML object');
  }
  const doc = parsed as Record<string, unknown>;
  const version = doc.version;
  if (version !== 1) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'context-policy version must be 1');
  }
  const stage = doc.stage;
  if (!isSceneStageId(stage)) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'context-policy stage must be a known stage id');
  }
  if (stage !== expectedStage) {
    throw new SceneContextPolicyError(
      'INVALID_CONTEXT_POLICY',
      `context-policy stage ${stage} does not match directory stage ${expectedStage}`,
    );
  }
  if (!Array.isArray(doc.inputs) || doc.inputs.length === 0) {
    throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'context-policy inputs must be a non-empty array');
  }

  const inputs = doc.inputs.map((item, i) => parseInputEntry(item, `inputs[${i}]`));
  const optionalInputs = Array.isArray(doc.optionalInputs)
    ? doc.optionalInputs.map((item, i) => parseInputEntry(item, `optionalInputs[${i}]`))
    : undefined;

  const assetLibraryRaw = doc.assetLibrary;
  let assetLibrary: SceneContextPolicyDocument['assetLibrary'];
  if (assetLibraryRaw && typeof assetLibraryRaw === 'object') {
    assetLibrary = {
      allowSelectedStyleProfile:
        (assetLibraryRaw as Record<string, unknown>).allowSelectedStyleProfile === true,
    };
  }

  return {
    version: 1,
    stage,
    consumerRunners: Array.isArray(doc.consumerRunners)
      ? (doc.consumerRunners as SceneContextRunnerType[])
      : undefined,
    inputs,
    optionalInputs,
    assetLibrary,
    forbidden: parseForbidden(doc.forbidden),
    runnerOverrides: parseRunnerOverrides(doc.runnerOverrides),
    description: typeof doc.description === 'string' ? doc.description : undefined,
  };
}

async function readYamlFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8');
  return YAML.parse(raw);
}

export async function loadDefaultSceneContextPolicy(): Promise<SceneDefaultContextPolicyDocument> {
  const filePath = path.join(
    getRepoRoot(),
    'prompts',
    'sceneforge',
    'pipeline',
    'default-context-policy.yaml',
  );
  try {
    const parsed = await readYamlFile(filePath);
    if (!parsed || typeof parsed !== 'object') {
      throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'default-context-policy must be an object');
    }
    const doc = parsed as Record<string, unknown>;
    if (doc.version !== 1) {
      throw new SceneContextPolicyError('INVALID_CONTEXT_POLICY', 'default-context-policy version must be 1');
    }
    return {
      version: 1,
      description: typeof doc.description === 'string' ? doc.description : undefined,
      runnerOverrides: parseRunnerOverrides(doc.runnerOverrides),
    };
  } catch (error) {
    if (error instanceof SceneContextPolicyError) {
      throw error;
    }
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new SceneContextPolicyError('POLICY_NOT_FOUND', `Missing default context policy: ${filePath}`);
    }
    throw new SceneContextPolicyError(
      'INVALID_CONTEXT_POLICY',
      err.message || 'Failed to load default-context-policy.yaml',
    );
  }
}

export async function loadSceneContextPolicy(stage: SceneStageId): Promise<SceneContextPolicyDocument> {
  if (!isSceneStageId(stage)) {
    throw new SceneContextPolicyError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }

  if (!CORE_CONTEXT_POLICY_STAGES.includes(stage)) {
    throw new SceneContextPolicyError(
      'POLICY_NOT_FOUND',
      `No context-policy.yaml registered for stage: ${stage}`,
    );
  }

  const filePath = path.join(
    getRepoRoot(),
    'prompts',
    'sceneforge',
    'stages',
    stage,
    'context-policy.yaml',
  );

  try {
    const parsed = await readYamlFile(filePath);
    return parseStagePolicyDocument(parsed, stage);
  } catch (error) {
    if (error instanceof SceneContextPolicyError) {
      throw error;
    }
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new SceneContextPolicyError('POLICY_NOT_FOUND', `Missing context policy for stage ${stage}`);
    }
    throw new SceneContextPolicyError(
      'INVALID_CONTEXT_POLICY',
      err.message || `Failed to parse context policy for ${stage}`,
    );
  }
}

export function listCoreContextPolicyStages(): readonly SceneStageId[] {
  return CORE_CONTEXT_POLICY_STAGES;
}