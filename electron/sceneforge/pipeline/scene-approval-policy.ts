import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneApprovalPolicy, SceneStageId } from '../types';
import { isSceneApprovalPolicy } from '../types';
import {
  SCENE_STAGE_DEFINITIONS,
  getSceneStageDefinition,
  isSceneStageId,
} from './scene-stage-definitions';

export type SceneApprovalPolicyErrorCode =
  | 'INVALID_STAGE'
  | 'INVALID_POLICY'
  | 'INVALID_POLICY_FILE';

export class SceneApprovalPolicyError extends Error {
  code: SceneApprovalPolicyErrorCode;

  constructor(code: SceneApprovalPolicyErrorCode, message: string) {
    super(message);
    this.name = 'SceneApprovalPolicyError';
    this.code = code;
  }
}

export interface ApprovalPolicyFile {
  version: 1;
  overrides: Partial<Record<SceneStageId, SceneApprovalPolicy>>;
}

const POLICY_FILE = path.join('sceneforge', 'approval_policy.yaml');

function getPolicyPath(projectDir: string): string {
  return path.join(projectDir, POLICY_FILE);
}

function createDefaultPolicyFile(): ApprovalPolicyFile {
  return { version: 1, overrides: {} };
}

function createPolicyYaml(file: ApprovalPolicyFile): string {
  const defaults = Object.fromEntries(
    SCENE_STAGE_DEFINITIONS.map((stage) => [stage.id, stage.defaultApprovalPolicy]),
  );
  return YAML.stringify({
    version: 1,
    defaults,
    overrides: file.overrides,
  });
}

function normalizePolicyFile(value: unknown): ApprovalPolicyFile {
  const raw = value as { overrides?: Record<string, unknown> } | null;
  const overrides: Partial<Record<SceneStageId, SceneApprovalPolicy>> = {};

  for (const [stage, policy] of Object.entries(raw?.overrides ?? {})) {
    if (stage === 'export') {
      continue;
    }
    if (!isSceneStageId(stage)) {
      throw new SceneApprovalPolicyError(
        'INVALID_POLICY_FILE',
        `approval_policy.yaml contains unknown stage: ${stage}`,
      );
    }
    if (!isSceneApprovalPolicy(policy)) {
      throw new SceneApprovalPolicyError(
        'INVALID_POLICY_FILE',
        `approval_policy.yaml contains invalid policy for ${stage}`,
      );
    }
    overrides[stage] = policy;
  }

  return { version: 1, overrides };
}

export async function writeDefaultApprovalPolicy(projectDir: string): Promise<void> {
  await fs.mkdir(path.join(projectDir, 'sceneforge'), { recursive: true });
  await fs.writeFile(
    getPolicyPath(projectDir),
    createPolicyYaml(createDefaultPolicyFile()),
    'utf-8',
  );
}

export async function readApprovalPolicyFile(projectDir: string): Promise<ApprovalPolicyFile> {
  let raw: string;
  try {
    raw = await fs.readFile(getPolicyPath(projectDir), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createDefaultPolicyFile();
    }
    throw error;
  }

  try {
    return normalizePolicyFile(YAML.parse(raw));
  } catch (error) {
    if (error instanceof SceneApprovalPolicyError) {
      throw error;
    }
    throw new SceneApprovalPolicyError(
      'INVALID_POLICY_FILE',
      error instanceof Error ? error.message : 'approval_policy.yaml is invalid',
    );
  }
}

export async function resolveSceneApprovalPolicy(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneApprovalPolicy> {
  if (!isSceneStageId(stage)) {
    throw new SceneApprovalPolicyError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }

  const file = await readApprovalPolicyFile(projectDir);
  const override = file.overrides[stage];
  if (override) {
    return override;
  }
  return getSceneStageDefinition(stage).defaultApprovalPolicy;
}

export async function setSceneApprovalPolicy(
  projectDir: string,
  stage: SceneStageId,
  policy: SceneApprovalPolicy,
): Promise<ApprovalPolicyFile> {
  if (!isSceneStageId(stage)) {
    throw new SceneApprovalPolicyError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }
  if (!isSceneApprovalPolicy(policy)) {
    throw new SceneApprovalPolicyError(
      'INVALID_POLICY',
      `Invalid approval policy for ${stage}: ${String(policy)}`,
    );
  }

  const current = await readApprovalPolicyFile(projectDir);
  const next: ApprovalPolicyFile = {
    version: 1,
    overrides: {
      ...current.overrides,
      [stage]: policy,
    },
  };
  await fs.mkdir(path.join(projectDir, 'sceneforge'), { recursive: true });
  await fs.writeFile(getPolicyPath(projectDir), createPolicyYaml(next), 'utf-8');
  return next;
}
