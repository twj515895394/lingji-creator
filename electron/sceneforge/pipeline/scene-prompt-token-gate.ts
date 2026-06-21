import { encodingForModel, getEncoding, getEncodingNameForModel } from 'js-tiktoken';

export const SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS = 80_000;
const FALLBACK_ENCODING = 'o200k_base';

export interface ScenePromptTokenEstimate {
  encodingName: string;
  systemTokens: number;
  userTokens: number;
  totalTokens: number;
}

function resolveEncoding(model: string) {
  const normalized = model.trim();
  try {
    const typedModel = normalized as Parameters<typeof encodingForModel>[0];
    return {
      encoding: encodingForModel(typedModel),
      encodingName: getEncodingNameForModel(typedModel),
    };
  } catch {
    return {
      encoding: getEncoding(FALLBACK_ENCODING),
      encodingName: FALLBACK_ENCODING,
    };
  }
}

export function estimateScenePromptTokens(input: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): ScenePromptTokenEstimate {
  const { encoding, encodingName } = resolveEncoding(input.model);
  const systemTokens = encoding.encode(input.systemPrompt).length;
  const userTokens = encoding.encode(input.userPrompt).length;
  return {
    encodingName,
    systemTokens,
    userTokens,
    totalTokens: systemTokens + userTokens,
  };
}
