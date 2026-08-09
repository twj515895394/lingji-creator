import { parseLLMJsonResponse } from '../../src/lib/llm';
import type { AISettings } from '../../src/types/ai';
import {
  formatLlmInvokeErrorMessage,
  migrateToProviders,
  resolveDefaultLlmBinding,
} from '../../src/lib/llm/provider-utils';
import {
  buildTopicIntentCheckMarkdown,
  type SceneTopicIntentCheckMissingDimension,
  type SceneTopicIntentCheckSuggestion,
} from '../../src/sceneforge/lib/scene-hitl-markdown';
import {
  createTopicBriefHash,
  parseTopicBriefForm,
} from '../../src/sceneforge/lib/topic-gate-form';
import {
  estimateScenePromptTokens,
  SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS,
} from './pipeline/scene-prompt-token-gate';

export interface SceneTopicIntentCheckInput {
  topicBriefMarkdown: string;
  sourceMaterialMarkdown?: string | null;
  adaptationSelectionMarkdown?: string | null;
}

export interface SceneTopicIntentCheckResult {
  artifactKey: 'intent_check';
  content: string;
}

export type SceneTopicIntentCheckGenerateText = (
  settings: AISettings,
  systemPrompt: string,
  userMessage: string,
) => Promise<string>;

export type SceneTopicIntentCheckLoadSettings = () => Promise<AISettings | null>;

export interface SceneTopicIntentCheckDeps {
  loadSettings: SceneTopicIntentCheckLoadSettings;
  generateText: SceneTopicIntentCheckGenerateText;
}

export class SceneTopicIntentCheckerError extends Error {
  code:
    | 'SCENE_TOPIC_INTENT_NO_SETTINGS'
    | 'SCENE_TOPIC_INTENT_NO_MODEL'
    | 'SCENE_TOPIC_INTENT_PROMPT_TOO_LARGE'
    | 'SCENE_TOPIC_INTENT_INVOKE_FAILED'
    | 'SCENE_TOPIC_INTENT_PARSE_FAILED'
    | 'SCENE_TOPIC_INTENT_MISSING_FIELDS';

  constructor(
    code:
      | 'SCENE_TOPIC_INTENT_NO_SETTINGS'
      | 'SCENE_TOPIC_INTENT_NO_MODEL'
      | 'SCENE_TOPIC_INTENT_PROMPT_TOO_LARGE'
      | 'SCENE_TOPIC_INTENT_INVOKE_FAILED'
      | 'SCENE_TOPIC_INTENT_PARSE_FAILED'
      | 'SCENE_TOPIC_INTENT_MISSING_FIELDS',
    message: string,
  ) {
    super(message);
    this.name = 'SceneTopicIntentCheckerError';
    this.code = code;
  }
}

function buildSystemPrompt(): string {
  return [
    '你是 SceneForge 的 topic_gate 创作意图检查器。',
    '你的任务是判断当前创作意图是否足够支撑整段视频方向，而不是分析这个选题值不值得做。',
    '当前阶段只需要确认大致制作方向是否成立，不要把后续阶段才会细化的内容提前当成硬门槛。',
    '硬性判断请尽量回到最基础的作文四要素：时间/地点（至少有场景或发生环境）、人物/主体、发生的事情/动作主线，再结合时长约束是否说得通。',
    '只要时间或场景、人物、主要事件已经基本清楚，并且足以支撑当前成片时长，就应倾向于判定 pass。',
    '情感方向、中心表达、视觉风格、导演风格、镜头质感、画面材质这类信息在后续还有细化步骤，默认只能作为补充建议，不能单独因为缺少它们就判定 needs_more。',
    '只有当描述模糊到会让后续参考分析、故事拆解、分镜规划走向明显分叉时，才判定 needs_more。',
    '不要输出解释性前言，不要输出 Markdown，只能输出单个 JSON 对象。',
    'JSON 必须包含键：status,summary,missingDimensions,suggestions。',
    'status 只能是 pass 或 needs_more。',
    'missingDimensions 是数组，每项包含 id,label,reason。',
    'suggestions 是数组，每项包含 dimensionId,tips；tips 为 1-2 条中文补充建议。',
    '若 status=pass，则 missingDimensions 可以为空数组；suggestions 也可以为空，或返回一些“可补充但不影响通过”的建议。',
    '若 status=needs_more，则 missingDimensions 至少返回 1 项，suggestions 至少覆盖所有缺失项。',
    '硬性缺失项优先使用这些维度名：time_place、characters、action_line、key_constraints。',
    '情感方向、中心表达、风格倾向仅作为可补充建议时，可使用：expression_goal、theme_expression、style_direction。',
  ].join('\n');
}

function buildUserPrompt(input: SceneTopicIntentCheckInput): string {
  const topicBrief = parseTopicBriefForm(input.topicBriefMarkdown);
  return [
    '请检查下面这段创作意图是否已经足够明确，足以稳定推导整段视频的后续方向。',
    '这里是选题闸门，不是最终脚本或风格定稿阶段。请按“能否支撑后续继续做下去”来判断，不要按“是否已经描述得非常完整”来苛求。',
    '',
    '## 成片约束',
    `- 成片总时长：${topicBrief.totalDurationSec ?? '未填写'} 秒`,
    `- 每段时长：${topicBrief.segmentDurationSec} 秒`,
    '请把这些时长与节奏约束也一起纳入判断：方向描述是否足够支撑这个成片规格。',
    '',
    '## Topic Brief',
    input.topicBriefMarkdown.trim(),
    input.sourceMaterialMarkdown?.trim()
      ? ['## Source Intake Material', input.sourceMaterialMarkdown.trim()].join('\n')
      : '',
    input.adaptationSelectionMarkdown?.trim()
      ? ['## Adaptation Selection', input.adaptationSelectionMarkdown.trim()].join('\n')
      : '',
    '',
    '判断要求：',
    '1. 不要做选题评分，不要给风格候选打分。',
    '2. 只判断这段创作意图是否足够明确，能否稳定进入后续参考分析与故事阶段。',
    '3. 硬性检查重点看：时间或场景、人物、发生的事情、时长约束是否基本齐备。',
    '4. 只要这些基础信息已经足够支撑后续制作，就应判定 pass。',
    '5. 不要因为没有写明情感方向、中心表达、视觉风格、导演风格、镜头质感，就单独判定 needs_more。',
    '6. 如果不够明确，必须指出缺的是哪几个会直接导致后续方向跑偏的维度。',
    '7. 每个缺失维度都给 1-2 条中文建议提示，帮助用户补写。',
    '8. 如果已经可以 pass，但还可以补充情感方向、中心表达或风格倾向来让后续故事更稳，也可以在 suggestions 里给提醒建议；这类建议不要写进 missingDimensions。',
    '9. 缺失维度命名请优先使用：time_place、characters、action_line、key_constraints；可补充建议再使用：expression_goal、theme_expression、style_direction。',
  ]
    .filter(Boolean)
    .join('\n');
}

function getString(parsed: Record<string, unknown>, key: string): string {
  const value = parsed[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMissingDimensions(parsed: Record<string, unknown>): SceneTopicIntentCheckMissingDimension[] {
  const raw = parsed.missingDimensions;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = getString(record, 'id');
      const label = getString(record, 'label');
      const reason = getString(record, 'reason');
      if (!id || !label || !reason) return null;
      return { id, label, reason };
    })
    .filter((item): item is SceneTopicIntentCheckMissingDimension => Boolean(item));
}

function normalizeSuggestions(parsed: Record<string, unknown>): SceneTopicIntentCheckSuggestion[] {
  const raw = parsed.suggestions;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const dimensionId = getString(record, 'dimensionId') || getString(record, 'dimension_id');
      const tipsRaw = record.tips;
      const tips = Array.isArray(tipsRaw)
        ? tipsRaw.filter((tip): tip is string => typeof tip === 'string').map((tip) => tip.trim()).filter(Boolean)
        : [];
      if (!dimensionId || tips.length === 0) return null;
      return { dimensionId, tips };
    })
    .filter((item): item is SceneTopicIntentCheckSuggestion => Boolean(item));
}

function toMarkdown(
  parsed: Record<string, unknown>,
  topicBriefMarkdown: string,
): string {
  const status = getString(parsed, 'status');
  const summary = getString(parsed, 'summary');
  const missingDimensions = normalizeMissingDimensions(parsed);
  const suggestions = normalizeSuggestions(parsed);
  const topicBrief = parseTopicBriefForm(topicBriefMarkdown);
  const intentHash = createTopicBriefHash(topicBrief);

  if (status !== 'pass' && status !== 'needs_more') {
    throw new SceneTopicIntentCheckerError(
      'SCENE_TOPIC_INTENT_MISSING_FIELDS',
      'Topic intent check JSON 缺少有效 status。',
    );
  }
  if (!summary) {
    throw new SceneTopicIntentCheckerError(
      'SCENE_TOPIC_INTENT_MISSING_FIELDS',
      'Topic intent check JSON 缺少 summary。',
    );
  }
  if (status === 'needs_more' && (missingDimensions.length === 0 || suggestions.length === 0)) {
    throw new SceneTopicIntentCheckerError(
      'SCENE_TOPIC_INTENT_MISSING_FIELDS',
      'Topic intent check JSON 在未通过时必须返回缺失项和建议提示。',
    );
  }

  return buildTopicIntentCheckMarkdown({
    status,
    summary,
    intentHash,
    missingDimensions,
    suggestions,
  });
}

export function createTopicIntentDirectLlmChecker(deps: SceneTopicIntentCheckDeps) {
  return {
    async check(input: SceneTopicIntentCheckInput): Promise<SceneTopicIntentCheckResult> {
      const settings = await deps.loadSettings();
      if (!settings) {
        throw new SceneTopicIntentCheckerError(
          'SCENE_TOPIC_INTENT_NO_SETTINGS',
          '未找到应用 LLM 设置，请先在设置中配置 Provider。',
        );
      }

      const migrated = migrateToProviders(settings);
      if (migrated.llmProviders.length === 0) {
        throw new SceneTopicIntentCheckerError(
          'SCENE_TOPIC_INTENT_NO_SETTINGS',
          '未配置任何 LLM Provider。请打开「设置 → AI」添加 Provider 并设为默认。',
        );
      }
      const binding = resolveDefaultLlmBinding(migrated);
      if (!binding) {
        throw new SceneTopicIntentCheckerError(
          'SCENE_TOPIC_INTENT_NO_MODEL',
          '未设置默认模型。请在「设置 → AI」中填写默认模型，或在 Provider 的模型列表中添加至少一个模型。',
        );
      }

      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(input);
      const promptEstimate = estimateScenePromptTokens({
        model: binding.model,
        systemPrompt,
        userPrompt,
      });
      if (promptEstimate.totalTokens > SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS) {
        throw new SceneTopicIntentCheckerError(
          'SCENE_TOPIC_INTENT_PROMPT_TOO_LARGE',
          `topic_gate 创作意图检查提示词过大：${promptEstimate.totalTokens} tokens，超过上限 ${SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS}。`,
        );
      }

      let raw: string;
      try {
        raw = await deps.generateText(migrated, systemPrompt, userPrompt);
      } catch (error) {
        throw new SceneTopicIntentCheckerError(
          'SCENE_TOPIC_INTENT_INVOKE_FAILED',
          formatLlmInvokeErrorMessage(error),
        );
      }

      let parsed: Record<string, unknown>;
      try {
        const result = parseLLMJsonResponse(raw);
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
          throw new Error('LLM response must be a JSON object');
        }
        parsed = result as Record<string, unknown>;
      } catch (error) {
        throw new SceneTopicIntentCheckerError(
          'SCENE_TOPIC_INTENT_PARSE_FAILED',
          error instanceof Error ? `LLM JSON parse failed: ${error.message}` : 'LLM JSON parse failed',
        );
      }

      return {
        artifactKey: 'intent_check',
        content: toMarkdown(parsed, input.topicBriefMarkdown),
      };
    },
  };
}
