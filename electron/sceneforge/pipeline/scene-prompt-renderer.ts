import type { SceneStageContext } from './scene-context-builder';
import type { SceneStagePack } from './scene-stage-pack';

function serializeStageContextForPrompt(context: SceneStageContext): string {
  return JSON.stringify(
    {
      stage: context.stage,
      warnings: context.warnings,
      requiredInputs: context.requiredInputs.map((input) => ({
        artifactId: input.artifactId,
        title: input.title,
        delivery: input.delivery,
        source: input.source,
        content: input.content,
      })),
      optionalInputs: context.optionalInputs.map((input) => ({
        artifactId: input.artifactId,
        title: input.title,
        delivery: input.delivery,
        source: input.source,
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

export function renderSceneStagePrompts(
  pack: SceneStagePack,
  stageContext: SceneStageContext,
): RenderedSceneStagePrompts {
  const contextBlock = serializeStageContextForPrompt(stageContext);
  const contractList = pack.outputContract.requiredArtifacts.join(', ');

  const systemPrompt = pack.systemPrompt
    .replace(/\{\{outputContract\}\}/g, contractList)
    .trim();

  const userPrompt = pack.userPrompt.replace(/\{\{stageContext\}\}/g, contextBlock).trim();

  return { systemPrompt, userPrompt };
}

export function buildDirectLlmArtifactJsonInstruction(requiredArtifacts: string[]): string {
  return [
    'Respond with a single JSON object only. Keys must be exactly:',
    requiredArtifacts.join(', '),
    'Each value is a Markdown string for that artifact.',
  ].join('\n');
}