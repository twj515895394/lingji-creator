import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneStageId } from '../types';
import { isSceneStageId } from './scene-stage-definitions';

export interface SceneStagePack {
  stage: SceneStageId;
  sourceDir: string;
  systemPrompt: string;
  userPrompt: string;
  agentInstructions: string;
  outputContract: {
    requiredArtifacts: string[];
  };
  reviewChecklist: string[];
}

export interface SceneStagePackSummary {
  stage: SceneStageId;
  sourceDir: string;
  hasSystemPrompt: boolean;
  hasUserPrompt: boolean;
  hasAgentInstructions: boolean;
  outputContract: {
    requiredArtifacts: string[];
  };
  reviewChecklistCount: number;
}

export type SceneStagePackErrorCode = 'INVALID_STAGE' | 'INVALID_STAGE_PACK';

export class SceneStagePackError extends Error {
  code: SceneStagePackErrorCode;

  constructor(code: SceneStagePackErrorCode, message: string) {
    super(message);
    this.name = 'SceneStagePackError';
    this.code = code;
  }
}

function getRepoRoot(): string {
  return process.cwd();
}

function getStagePackDir(stage: SceneStageId): string {
  return path.join(getRepoRoot(), 'prompts', 'sceneforge', 'stages', stage);
}

function parseReviewChecklist(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);
}

function parseOutputContract(raw: string): { requiredArtifacts: string[] } {
  const parsed = YAML.parse(raw) as { requiredArtifacts?: unknown } | null;
  if (!Array.isArray(parsed?.requiredArtifacts)) {
    throw new SceneStagePackError(
      'INVALID_STAGE_PACK',
      'output-contract.yaml must contain requiredArtifacts',
    );
  }
  return {
    requiredArtifacts: parsed.requiredArtifacts.filter((item): item is string => typeof item === 'string'),
  };
}

export async function loadSceneStagePack(stage: SceneStageId): Promise<SceneStagePack> {
  if (!isSceneStageId(stage)) {
    throw new SceneStagePackError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }

  const sourceDir = getStagePackDir(stage);
  try {
    const [
      systemPrompt,
      userPrompt,
      agentInstructions,
      outputContractRaw,
      reviewChecklistRaw,
    ] = await Promise.all([
      fs.readFile(path.join(sourceDir, 'system.md'), 'utf-8'),
      fs.readFile(path.join(sourceDir, 'user.md'), 'utf-8'),
      fs.readFile(path.join(sourceDir, 'agent-instructions.md'), 'utf-8'),
      fs.readFile(path.join(sourceDir, 'output-contract.yaml'), 'utf-8'),
      fs.readFile(path.join(sourceDir, 'review-checklist.md'), 'utf-8'),
    ]);

    return {
      stage,
      sourceDir,
      systemPrompt,
      userPrompt,
      agentInstructions,
      outputContract: parseOutputContract(outputContractRaw),
      reviewChecklist: parseReviewChecklist(reviewChecklistRaw),
    };
  } catch (error) {
    if (error instanceof SceneStagePackError) {
      throw error;
    }
    throw new SceneStagePackError(
      'INVALID_STAGE_PACK',
      error instanceof Error ? error.message : `Invalid SceneForge stage pack: ${stage}`,
    );
  }
}

export function summarizeSceneStagePack(pack: SceneStagePack): SceneStagePackSummary {
  return {
    stage: pack.stage,
    sourceDir: pack.sourceDir,
    hasSystemPrompt: pack.systemPrompt.trim().length > 0,
    hasUserPrompt: pack.userPrompt.trim().length > 0,
    hasAgentInstructions: pack.agentInstructions.trim().length > 0,
    outputContract: pack.outputContract,
    reviewChecklistCount: pack.reviewChecklist.length,
  };
}
