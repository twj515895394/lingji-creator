import type { AISettings, LLMProvider } from '../../types/ai';

function inferProviderName(baseUrl: string): string {
  const lower = baseUrl.toLowerCase();
  if (lower.includes('lmstudio') || lower.includes('localhost:1234') || lower.includes('127.0.0.1:1234')) {
    return 'LM Studio';
  }
  if (lower.includes('deepseek')) return 'DeepSeek';
  if (lower.includes('openai')) return 'OpenAI';
  if (lower.includes('anthropic')) return 'Anthropic';
  if (lower.includes('generativelanguage') || lower.includes('gemini')) return 'Gemini';
  if (lower.includes('moonshot') || lower.includes('kimi')) return 'Moonshot';
  if (lower.includes('dashscope') || lower.includes('qwen')) return 'Qwen';
  if (lower.includes('zhipu') || lower.includes('bigmodel')) return 'ZhipuAI';
  try {
    const host = new URL(baseUrl).hostname;
    return host.split('.').slice(-2, -1)[0] ?? 'Custom';
  } catch {
    return 'Custom';
  }
}

function inferProviderType(baseUrl: string): LLMProvider['type'] {
  const lower = baseUrl.toLowerCase();
  if (lower.includes('lmstudio') || lower.includes('localhost:1234') || lower.includes('127.0.0.1:1234')) {
    return 'lmstudio';
  }
  return 'openai_compatible';
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 把旧的全局 `enableThinking` 下沉到每个 provider；
 * provider 已显式设置过则不覆盖，未设置时继承全局值。
 */
function backfillProviderThinking(settings: AISettings): AISettings {
  const globalThinking = settings.enableThinking;
  if (globalThinking === undefined) {
    return settings;
  }
  let mutated = false;
  const nextProviders = settings.llmProviders.map((provider) => {
    if (provider.enableThinking !== undefined) {
      return provider;
    }
    mutated = true;
    return { ...provider, enableThinking: globalThinking };
  });
  if (!mutated) {
    return settings;
  }
  return { ...settings, llmProviders: nextProviders };
}

export function migrateToProviders(settings: AISettings): AISettings {
  if (settings.llmProviders && settings.llmProviders.length > 0) {
    return backfillProviderThinking(settings);
  }
  if (!settings.llmBaseUrl) {
    return { ...settings, llmProviders: [], defaultProviderId: null, defaultModel: null };
  }
  const provider: LLMProvider = {
    id: generateId(),
    name: inferProviderName(settings.llmBaseUrl),
    type: inferProviderType(settings.llmBaseUrl),
    baseUrl: settings.llmBaseUrl,
    apiKey: settings.llmApiKey,
    models: settings.llmModel ? [settings.llmModel] : [],
    enableThinking: settings.enableThinking ?? true,
  };
  return {
    ...settings,
    llmProviders: [provider],
    defaultProviderId: provider.id,
    defaultModel: settings.llmModel || null,
  };
}

export function resolveProvider(
  providers: LLMProvider[],
  providerId: string | null,
  defaultProviderId: string | null,
): LLMProvider | null {
  if (providers.length === 0) return null;
  if (providerId) return providers.find((p) => p.id === providerId) ?? null;
  if (defaultProviderId) return providers.find((p) => p.id === defaultProviderId) ?? null;
  return providers[0];
}

/** 默认模型：优先 settings.defaultModel，否则 Provider.models 第一项 */
export function resolveDefaultModelName(
  provider: LLMProvider,
  defaultModel: string | null | undefined,
): string | null {
  const trimmed = defaultModel?.trim();
  if (trimmed) {
    return trimmed;
  }
  const fromList = provider.models?.map((m) => m.trim()).find((m) => m.length > 0);
  return fromList ?? null;
}

export interface DefaultLlmBinding {
  provider: LLMProvider;
  model: string;
}

/** 与 binding-resolver 全局回落一致：defaultProviderId + defaultModel */
export function resolveDefaultLlmBinding(settings: AISettings): DefaultLlmBinding | null {
  const migrated = migrateToProviders(settings);
  const provider = resolveProvider(
    migrated.llmProviders,
    null,
    migrated.defaultProviderId,
  );
  if (!provider) {
    return null;
  }
  const model = resolveDefaultModelName(provider, migrated.defaultModel);
  if (!model) {
    return null;
  }
  return { provider, model };
}

/** 将 LangChain / 网关原始错误转为工坊可操作的说明 */
export function formatLlmInvokeErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'LLM 调用失败';
  if (/404|MODEL_NOT_FOUND|model.*not found|does not exist/i.test(raw)) {
    return [
      'LLM 接口返回 404（模型不存在或名称不匹配）。',
      '请打开「设置 → AI」：',
      '1. 确认已选择默认 Provider；',
      '2. 在默认模型中填写 Provider 文档中的准确模型 ID（或在该 Provider 的模型列表中添加并选中）；',
      '3. 在设置里用「测试连接」验证同一模型可用后再回到工坊运行。',
      `技术信息：${raw}`,
    ].join('\n');
  }
  if (/401|403|unauthorized|invalid.*api.*key|authentication/i.test(raw)) {
    return `LLM 鉴权失败，请检查「设置 → AI」中该 Provider 的 API Key。\n技术信息：${raw}`;
  }
  return raw;
}
