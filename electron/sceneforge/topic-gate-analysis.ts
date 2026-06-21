import { parseLLMJsonResponse } from '../../src/lib/llm';
import type { AISettings } from '../../src/types/ai';
import {
  formatLlmInvokeErrorMessage,
  migrateToProviders,
  resolveDefaultLlmBinding,
} from '../../src/lib/llm/provider-utils';
import {
  estimateScenePromptTokens,
  SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS,
} from './pipeline/scene-prompt-token-gate';
import { buildTopicAnalysisMarkdown } from '../../src/sceneforge/lib/scene-hitl-markdown';

export interface SceneTopicGateAnalysisInput {
  topicBriefMarkdown: string;
  sourceMaterialMarkdown?: string | null;
  adaptationSelectionMarkdown?: string | null;
}

export interface SceneTopicGateAnalysisResult {
  artifactKey: 'topic_analysis';
  content: string;
}

export type SceneTopicGateGenerateText = (
  settings: AISettings,
  systemPrompt: string,
  userMessage: string,
) => Promise<string>;

export type SceneTopicGateLoadSettings = () => Promise<AISettings | null>;

export interface SceneTopicGateAnalyzerDeps {
  loadSettings: SceneTopicGateLoadSettings;
  generateText: SceneTopicGateGenerateText;
}

export class SceneTopicGateAnalyzerError extends Error {
  code:
    | 'SCENE_TOPIC_GATE_NO_SETTINGS'
    | 'SCENE_TOPIC_GATE_NO_MODEL'
    | 'SCENE_TOPIC_GATE_PROMPT_TOO_LARGE'
    | 'SCENE_TOPIC_GATE_INVOKE_FAILED'
    | 'SCENE_TOPIC_GATE_PARSE_FAILED'
    | 'SCENE_TOPIC_GATE_MISSING_FIELDS';

  constructor(
    code:
      | 'SCENE_TOPIC_GATE_NO_SETTINGS'
      | 'SCENE_TOPIC_GATE_NO_MODEL'
      | 'SCENE_TOPIC_GATE_PROMPT_TOO_LARGE'
      | 'SCENE_TOPIC_GATE_INVOKE_FAILED'
      | 'SCENE_TOPIC_GATE_PARSE_FAILED'
      | 'SCENE_TOPIC_GATE_MISSING_FIELDS',
    message: string,
  ) {
    super(message);
    this.name = 'SceneTopicGateAnalyzerError';
    this.code = code;
  }
}

function buildSystemPrompt(): string {
  return [
    '你是 SceneForge 的 topic_gate 选题闸门分析器。',
    '你的任务是根据用户已经保存的选题简报，给出结构化评分、决策建议和风格候选建议。',
    '不要输出解释性前言，不要输出 Markdown，只能输出单个 JSON 对象。',
    'JSON 必须包含键：summary,totalScore,decisionSuggestion,productionLevelSuggestion,scores,styleCandidates。',
    '允许同时附带 snake_case 镜像键，但 camelCase 键必须优先给出。',
    'decisionSuggestion 只能是 go / observe / drop。',
    'productionLevelSuggestion 只能是 focus / fast / null。',
    'scores 是数组，每项包含 label,value。',
    'styleCandidates 是数组，每项包含 id,label,family。',
    'styleCandidates 至少返回 1 项，优先从当前产品已有三类风格中选择：pixar_like / live_action_cinematic / documentary。',
    '示例：{"summary":"...", "totalScore":"78", "decisionSuggestion":"go", "productionLevelSuggestion":"focus", "scores":[{"label":"传播潜力","value":"8/10"}], "styleCandidates":[{"id":"pixar_like","label":"动画·皮克斯感","family":"animation"}]}',
  ].join('\n');
}

function buildUserPrompt(input: SceneTopicGateAnalysisInput): string {
  return [
    '请基于以下资料分析这个选题是否值得继续推进。',
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
    '输出要求：',
    '1. 总结一句话 summary',
    '2. totalScore 用 0-100 的字符串',
    '3. 给出 decisionSuggestion',
    '4. 给出 productionLevelSuggestion',
    '5. 给出 3-6 条 scores',
    '6. 给出 1-3 条 styleCandidates',
    '7. 若不确定，也必须返回完整字段，禁止省略字段',
  ]
    .filter(Boolean)
    .join('\n');
}

function getStringFromKeys(parsed: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function getArrayFromKeys(parsed: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = parsed[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function toMarkdown(parsed: Record<string, unknown>): string {
  const summary = getStringFromKeys(parsed, ['summary', 'topicSummary', 'topic_summary']);
  const totalScore = getStringFromKeys(parsed, ['totalScore', 'total_score', 'score']);
  const rawDecision = getStringFromKeys(parsed, ['decisionSuggestion', 'decision_suggestion']);
  const decisionSuggestion =
    rawDecision === 'go' ||
    rawDecision === 'observe' ||
    rawDecision === 'drop'
      ? rawDecision
      : null;
  const rawProductionLevel = getStringFromKeys(parsed, [
    'productionLevelSuggestion',
    'production_level_suggestion',
    'productionLevel',
    'production_level',
  ]);
  const productionLevelSuggestion =
    rawProductionLevel === 'focus' || rawProductionLevel === 'fast'
      ? rawProductionLevel
      : null;
  const scores = getArrayFromKeys(parsed, ['scores', 'scoreItems', 'score_items'])
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const record = item as Record<string, unknown>;
          if (typeof record.label !== 'string' || typeof record.value !== 'string') {
            return null;
          }
          return { label: record.label.trim(), value: record.value.trim() };
        })
        .filter((item): item is { label: string; value: string } => Boolean(item?.label && item?.value));
  const styleCandidates = getArrayFromKeys(parsed, ['styleCandidates', 'style_candidates', 'styles'])
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const record = item as Record<string, unknown>;
          const id = typeof record.id === 'string' ? record.id.trim() : '';
          const label = typeof record.label === 'string' ? record.label.trim() : '';
          const family = typeof record.family === 'string' ? record.family.trim() : null;
          if (!id || !label) return null;
          return { id, label, family };
        })
        .filter((item): item is { id: string; label: string; family: string | null } => Boolean(item?.id && item?.label));

  if (!summary || !totalScore || !decisionSuggestion || scores.length === 0 || styleCandidates.length === 0) {
    throw new SceneTopicGateAnalyzerError(
      'SCENE_TOPIC_GATE_MISSING_FIELDS',
      'Topic gate analysis JSON 缺少必需字段：summary / totalScore / decisionSuggestion / scores / styleCandidates。',
    );
  }

  return buildTopicAnalysisMarkdown({
    summary,
    totalScore,
    decisionSuggestion,
    productionLevelSuggestion,
    scores,
    styleCandidates,
  });
}

export function createTopicGateDirectLlmAnalyzer(deps: SceneTopicGateAnalyzerDeps) {
  return {
    async analyze(input: SceneTopicGateAnalysisInput): Promise<SceneTopicGateAnalysisResult> {
      const settings = await deps.loadSettings();
      if (!settings) {
        throw new SceneTopicGateAnalyzerError(
          'SCENE_TOPIC_GATE_NO_SETTINGS',
          '未找到应用 LLM 设置，请先在设置中配置 Provider。',
        );
      }

      const migrated = migrateToProviders(settings);
      if (migrated.llmProviders.length === 0) {
        throw new SceneTopicGateAnalyzerError(
          'SCENE_TOPIC_GATE_NO_SETTINGS',
          '未配置任何 LLM Provider。请打开「设置 → AI」添加 Provider 并设为默认。',
        );
      }
      const binding = resolveDefaultLlmBinding(migrated);
      if (!binding) {
        throw new SceneTopicGateAnalyzerError(
          'SCENE_TOPIC_GATE_NO_MODEL',
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
        throw new SceneTopicGateAnalyzerError(
          'SCENE_TOPIC_GATE_PROMPT_TOO_LARGE',
          `topic_gate 分析提示词过大：${promptEstimate.totalTokens} tokens，超过上限 ${SCENE_DIRECT_LLM_MAX_PROMPT_TOKENS}。`,
        );
      }

      let raw: string;
      try {
        raw = await deps.generateText(migrated, systemPrompt, userPrompt);
      } catch (error) {
        throw new SceneTopicGateAnalyzerError(
          'SCENE_TOPIC_GATE_INVOKE_FAILED',
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
        throw new SceneTopicGateAnalyzerError(
          'SCENE_TOPIC_GATE_PARSE_FAILED',
          error instanceof Error ? `LLM JSON parse failed: ${error.message}` : 'LLM JSON parse failed',
        );
      }

      return {
        artifactKey: 'topic_analysis',
        content: toMarkdown(parsed),
      };
    },
  };
}
