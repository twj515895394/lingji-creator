import type { SceneStageContext } from './scene-context-builder';
import type { SceneStagePack } from './scene-stage-pack';

function serializeStageContextForPrompt(context: SceneStageContext): string {
  return JSON.stringify(
    {
      stage: context.stage,
      warnings: context.warnings,
      referencePriority: context.referencePriority,
      requiredInputs: context.requiredInputs.map((input) => ({
        artifactId: input.artifactId,
        title: input.title,
        delivery: input.delivery,
        source: input.source,
        priorityOrder: input.priorityOrder,
        priorityNote: input.priorityNote,
        content: input.content,
      })),
      optionalInputs: context.optionalInputs.map((input) => ({
        artifactId: input.artifactId,
        title: input.title,
        delivery: input.delivery,
        source: input.source,
        priorityOrder: input.priorityOrder,
        priorityNote: input.priorityNote,
        content: input.content,
      })),
      outputContract: context.outputContract,
      assetLibrary: context.assetLibrary,
      contextCharBudget: context.contextCharBudget,
    },
    null,
    2,
  );
}

export interface RenderedSceneStagePrompts {
  systemPrompt: string;
  userPrompt: string;
}

export interface SceneStagePromptRefinementInput {
  currentDraftArtifacts?: Record<string, string>;
  refinementPrompt?: string;
}

function buildReferencePriorityBlock(context: SceneStageContext): string {
  const entries = context.referencePriority.currentInputsHighestFirst;
  const lines = [
    '## Reference Priority Rules',
    context.referencePriority.rule,
    '',
    'When sources conflict, apply this rule across the entire current stage instead of averaging or merging contradictory statements.',
  ];

  if (entries.length > 0) {
    lines.push('', 'Current inputs from higher to lower priority:');
    lines.push(
      ...entries.map(
        (entry) =>
          `- ${entry.artifactId} (${entry.stage}, order=${entry.order}): ${entry.note}`,
      ),
    );
  }

  return lines.join('\n');
}

export function renderSceneStagePrompts(
  pack: SceneStagePack,
  stageContext: SceneStageContext,
  refinement?: SceneStagePromptRefinementInput,
): RenderedSceneStagePrompts {
  const contextBlock = serializeStageContextForPrompt(stageContext);
  const contractList = pack.outputContract.requiredArtifacts.join(', ');
  const systemPrompt = [
    pack.systemPrompt.replace(/\{\{outputContract\}\}/g, contractList).trim(),
    pack.agentInstructions.trim()
      ? ['## Stage Operating Rules', pack.agentInstructions.trim()].join('\n\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const baseUserPrompt = pack.userPrompt.replace(/\{\{stageContext\}\}/g, contextBlock).trim();
  const referencePriorityBlock = buildReferencePriorityBlock(stageContext);
  const reviewChecklistBlock =
    pack.reviewChecklist.length > 0
      ? [
          '## Review Checklist',
          pack.reviewChecklist.map((item) => `- ${item}`).join('\n'),
          '',
          'Before responding, verify that every required artifact satisfies this checklist. Do not repeat the checklist in the final artifacts.',
        ].join('\n')
      : '';
  const refinementBlock =
    refinement?.refinementPrompt?.trim() && refinement.currentDraftArtifacts
      ? [
          '## Current Draft Artifacts',
          JSON.stringify(refinement.currentDraftArtifacts, null, 2),
          '',
          '## One-Time Refinement Request',
          refinement.refinementPrompt.trim(),
          '',
          'Revise the entire draft using the current draft as a base. Keep this refinement request one-time only and do not mention it in the final artifacts.',
        ].join('\n')
      : '';
  const userPrompt = [baseUserPrompt, referencePriorityBlock, reviewChecklistBlock, refinementBlock]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  return { systemPrompt, userPrompt };
}

export function buildDirectLlmArtifactJsonInstruction(requiredArtifacts: string[]): string {
  const skeleton = Object.fromEntries(requiredArtifacts.map((key) => [key, '<markdown string>']));
  return [
    'Respond with a single JSON object only.',
    'Do not use markdown fences. Do not add explanation before or after the JSON.',
    'You must return every required top-level key exactly once, even when multiple artifacts share the same planning context.',
    `Required top-level keys: ${requiredArtifacts.join(', ')}`,
    'Each value must be a non-empty Markdown string.',
    'Return this exact JSON shape:',
    JSON.stringify(skeleton, null, 2),
    'If one artifact is long, still finish all remaining keys in the same JSON object. Never return only the first key.',
  ].join('\n');
}
